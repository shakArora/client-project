import { Fundraiser } from "../models/Fundraiser.js";
import { Order } from "../models/Order.js";
import { Vendor } from "../models/Vendor.js";
import { DriverRoute } from "../models/DriverRoute.js";

export async function assertFundraiserAdmin(fundraiserId, adminId) {
  const fr = await Fundraiser.findOne({ _id: fundraiserId, adminId });
  if (!fr) throw new Error("Fundraiser not found");
  return fr;
}

function orderCountsTowardStats(status) {
  return !["refunded", "cancelled"].includes(status);
}

async function syncRouteCompletedStops(fundraiserId) {
  const routes = await DriverRoute.find({ fundraiserId });
  for (const route of routes) {
    route.completedStops = route.stops.filter((s) => s.status === "delivered").length;
    await route.save();
  }
}

export async function deleteOrderById(orderId, adminId) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");
  await assertFundraiserAdmin(order.fundraiserId, adminId);

  if (orderCountsTowardStats(order.status)) {
    await Fundraiser.findByIdAndUpdate(order.fundraiserId, {
      $inc: {
        soldBags: -order.totalBags,
        totalRevenue: -order.totalAmount,
        orderCount: -1,
      },
    });
    if (order.vendorId) {
      await Vendor.findByIdAndUpdate(order.vendorId, {
        $inc: {
          bagsSold: -order.totalBags,
          totalRevenue: -order.totalAmount,
          orderCount: -1,
        },
      });
    }
  }

  await DriverRoute.updateMany(
    { fundraiserId: order.fundraiserId },
    { $pull: { stops: { orderId: order._id } } },
  );
  await syncRouteCompletedStops(order.fundraiserId);
  await Order.findByIdAndDelete(order._id);
  return { deleted: 1 };
}

export async function deleteAllOrders(fundraiserId, adminId) {
  await assertFundraiserAdmin(fundraiserId, adminId);
  const result = await Order.deleteMany({ fundraiserId });
  await DriverRoute.updateMany(
    { fundraiserId },
    { $set: { stops: [], completedStops: 0, startedAt: null, completedAt: null } },
  );
  await Vendor.updateMany({ fundraiserId }, { $set: { bagsSold: 0, totalRevenue: 0, orderCount: 0 } });
  await Fundraiser.findByIdAndUpdate(fundraiserId, { soldBags: 0, totalRevenue: 0, orderCount: 0 });
  return { deleted: result.deletedCount };
}

export async function deleteVendorById(vendorId, adminId) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error("Vendor not found");
  await assertFundraiserAdmin(vendor.fundraiserId, adminId);

  await Order.updateMany({ vendorId: vendor._id }, { $unset: { vendorId: 1 } });
  await Vendor.findByIdAndDelete(vendor._id);
  await Fundraiser.findByIdAndUpdate(vendor.fundraiserId, { $inc: { vendorCount: -1 } });
  return { deleted: 1 };
}

export async function deleteAllVendors(fundraiserId, adminId) {
  await assertFundraiserAdmin(fundraiserId, adminId);
  const result = await Vendor.deleteMany({ fundraiserId });
  await Order.updateMany({ fundraiserId }, { $unset: { vendorId: 1 } });
  await Fundraiser.findByIdAndUpdate(fundraiserId, { vendorCount: 0 });
  return { deleted: result.deletedCount };
}

export async function deleteDriverById(driverId, adminId) {
  const route = await DriverRoute.findById(driverId);
  if (!route) throw new Error("Driver not found");
  await assertFundraiserAdmin(route.fundraiserId, adminId);
  const groupId = route.driverGroupId || route._id;
  const result = await DriverRoute.deleteMany({
    fundraiserId: route.fundraiserId,
    $or: [{ driverGroupId: groupId }, { _id: groupId }],
  });
  return { deleted: result.deletedCount };
}

export async function deleteAllDrivers(fundraiserId, adminId) {
  await assertFundraiserAdmin(fundraiserId, adminId);
  const result = await DriverRoute.deleteMany({ fundraiserId });
  return { deleted: result.deletedCount };
}

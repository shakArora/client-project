import { logic } from "./routingLogic.js";

function stripPartSuffix(addr) {
  return String(addr).replace(/ \(Part \d+\)$/, "");
}

/**
 * Assign orders to drivers using OSRM distance matrix + capacity clustering.
 * @returns {{ stopsByDriver: object[][], unassigned: object[], optimized: boolean } | null}
 */
export async function optimizeRoutes({ hubAddress, orders, drivers }) {
  if (!orders.length || !drivers.length) return null;

  const hub = hubAddress?.trim() || null;
  const orderAddresses = orders.map(o => o.deliveryAddress);
  const addresses = hub ? [hub, ...orderAddresses] : orderAddresses;
  const weights = hub ? [0, ...orders.map(o => o.totalBags)] : orders.map(o => o.totalBags);
  const capacities = drivers.map(d => d.capacity || 999);
  const hubOffset = hub ? 1 : 0;

  const results = await logic(addresses, weights, capacities);
  const final = results[results.length - 1];
  const stopsByDriver = drivers.map(() => []);
  const added = new Set();

  for (const cluster of final.clusters || []) {
    const drvIdx = cluster.vehicleIndex;
    if (drvIdx < 0 || drvIdx >= drivers.length) continue;
    for (const addr of cluster.addresses || []) {
      const base = stripPartSuffix(addr);
      const order = orders.find(o => o.deliveryAddress === base || o.deliveryAddress === addr);
      if (order && !added.has(String(order._id))) {
        stopsByDriver[drvIdx].push(order);
        added.add(String(order._id));
      }
    }
  }

  const unassigned = orders.filter(o => !added.has(String(o._id)));
  return { stopsByDriver, unassigned, optimized: true };
}

export function capacityFallback({ orders, drivers }) {
  const stopsByDriver = drivers.map(() => []);
  let driverIdx = 0;

  for (const order of orders) {
    let assigned = false;
    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[(driverIdx + i) % drivers.length];
      const used = stopsByDriver[(driverIdx + i) % drivers.length].reduce((s, o) => s + o.totalBags, 0);
      if ((d.capacity || 999) - used >= order.totalBags) {
        stopsByDriver[(driverIdx + i) % drivers.length].push(order);
        driverIdx = (driverIdx + i + 1) % drivers.length;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      let minIdx = 0;
      let minUsed = Infinity;
      stopsByDriver.forEach((stops, i) => {
        const used = stops.reduce((s, o) => s + o.totalBags, 0);
        if (used < minUsed) { minUsed = used; minIdx = i; }
      });
      stopsByDriver[minIdx].push(order);
    }
  }
  return { stopsByDriver, unassigned: [], optimized: false };
}

export function buildStopsFromOrders(orderList) {
  return orderList.map(order => ({
    orderId:         order._id,
    customerName:    order.customerName,
    deliveryAddress: order.deliveryAddress,
    bags:            order.totalBags,
    comment:         order.comments || "",
  }));
}

import { logic } from "./routingLogic.js";
import { geocodeImportAddress, formatRegionHint } from "./geocode.js";

const HUB_LABEL = "__HUB__";
export const ROUTE_MAX_BAGS = 100;

function stripPartSuffix(label) {
  return String(label).replace(/ \(Part \d+\)$/, "");
}

function driverCap(drivers, idx) {
  return drivers[idx]?.capacity || 999;
}

function orderBags(order) {
  return Number(order.totalBags) || 0;
}

function bagsUsed(stopsByDriver, idx) {
  return stopsByDriver[idx].reduce((sum, o) => sum + orderBags(o), 0);
}

function bagsRemaining(stopsByDriver, drivers, idx) {
  return driverCap(drivers, idx) - bagsUsed(stopsByDriver, idx);
}

function canFit(stopsByDriver, drivers, drvIdx, order) {
  return bagsRemaining(stopsByDriver, drivers, drvIdx) >= orderBags(order);
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLon = toRad(Number(b.lon) - Number(a.lon));
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function resolveHubCoords(fundraiser) {
  if (fundraiser?.deliveryHubCoords?.lat != null) return fundraiser.deliveryHubCoords;
  if (fundraiser?.pickupCoords?.lat != null) return fundraiser.pickupCoords;
  const addr = fundraiser?.deliveryHubAddress || fundraiser?.pickupAddress;
  if (!addr) return null;
  const parsed = await geocodeImportAddress(addr, {
    regionHint: formatRegionHint(fundraiser?.location) || addr,
  });
  return parsed.ok ? parsed.coords : null;
}

function resolveOrderCoords(orders) {
  const geocoded = [];
  const missing = [];
  for (const order of orders) {
    if (order.coords?.lat != null && order.coords?.lon != null) geocoded.push(order);
    else missing.push(order);
  }
  return { geocoded, missing };
}

function appendClusterStops(stopsByDriver, cluster, orderById, added, drivers) {
  const drvIdx = cluster.vehicleIndex;
  if (drvIdx < 0 || drvIdx >= stopsByDriver.length) return;

  for (const label of cluster.addresses || []) {
    const orderId = stripPartSuffix(label);
    if (orderId === HUB_LABEL) continue;
    const order = orderById.get(orderId);
    if (!order || added.has(orderId)) continue;
    stopsByDriver[drvIdx].push(order);
    added.add(orderId);
  }
}

/**
 * Assign orders to drivers using routingLogic (OSRM matrix + greedy clustering).
 * Each driver's assigned orders must sum to at most their bag capacity.
 */
export async function optimizeRoutes({ orders, drivers, fundraiser }) {
  if (!orders.length || !drivers.length) return null;

  const hubCoords = await resolveHubCoords(fundraiser);
  const { geocoded, missing } = resolveOrderCoords(orders);
  if (!geocoded.length) return null;

  const useHub = hubCoords?.lat != null;
  const labels = useHub
    ? [HUB_LABEL, ...geocoded.map((o) => String(o._id))]
    : geocoded.map((o) => String(o._id));
  const weights = useHub
    ? [0, ...geocoded.map((o) => orderBags(o))]
    : geocoded.map((o) => orderBags(o));
  const coords = useHub
    ? [{ lat: hubCoords.lat, lon: hubCoords.lon }, ...geocoded.map((o) => ({ lat: o.coords.lat, lon: o.coords.lon }))]
    : geocoded.map((o) => ({ lat: o.coords.lat, lon: o.coords.lon }));
  const capacities = assignmentCapacities(drivers, orders);

  const results = await logic(labels, weights, capacities, { coords, disableSplit: true });

  const stopsByDriver = drivers.map(() => []);
  const orderById = new Map(orders.map((o) => [String(o._id), o]));
  const added = new Set();

  for (const result of results) {
    for (const cluster of result.clusters || []) {
      appendClusterStops(stopsByDriver, cluster, orderById, added, drivers);
    }
  }

  const unassigned = [
    ...missing,
    ...orders.filter((o) => !added.has(String(o._id))),
  ];

  return { stopsByDriver, unassigned, optimized: true, hubCoords };
}

function assignmentCapacities(drivers, orders) {
  const totalBags = orders.reduce((sum, o) => sum + orderBags(o), 0);
  const share = Math.max(ROUTE_MAX_BAGS, Math.ceil(totalBags / Math.max(drivers.length, 1)));
  return drivers.map(() => share);
}

/**
 * Assign every order to a driver (round-robin). No total cap per driver —
 * routes are split into 100-bag legs afterward.
 */
export function distributeAllOrders({ orders, drivers, hubCoords, existingStops = null }) {
  const stopsByDriver = existingStops
    ? existingStops.map((stops) => [...stops])
    : drivers.map(() => []);
  const unassigned = [];
  const sorted = [...orders];

  if (hubCoords?.lat != null) {
    sorted.sort((a, b) => {
      const da = a.coords?.lat != null ? haversineKm(hubCoords, a.coords) : Infinity;
      const db = b.coords?.lat != null ? haversineKm(hubCoords, b.coords) : Infinity;
      return da - db;
    });
  }

  let driverIdx = 0;
  for (const order of sorted) {
    if (orderBags(order) > ROUTE_MAX_BAGS) {
      unassigned.push(order);
      continue;
    }
    stopsByDriver[driverIdx % drivers.length].push(order);
    driverIdx++;
  }

  return { stopsByDriver, unassigned, optimized: false };
}

/**
 * Greedy capacity assignment — respects per-driver total cap (legacy).
 */
export function capacityFallback({ orders, drivers, hubCoords, existingStops = null }) {
  const stopsByDriver = existingStops
    ? existingStops.map((stops) => [...stops])
    : drivers.map(() => []);
  const unassigned = [];
  const sorted = [...orders];

  if (hubCoords?.lat != null) {
    sorted.sort((a, b) => {
      const da = a.coords?.lat != null ? haversineKm(hubCoords, a.coords) : Infinity;
      const db = b.coords?.lat != null ? haversineKm(hubCoords, b.coords) : Infinity;
      return da - db;
    });
  }

  let driverIdx = 0;
  for (const order of sorted) {
    const bags = orderBags(order);
    let assigned = false;

    for (let i = 0; i < drivers.length; i++) {
      const idx = (driverIdx + i) % drivers.length;
      if (bagsRemaining(stopsByDriver, drivers, idx) >= bags) {
        stopsByDriver[idx].push(order);
        driverIdx = (idx + 1) % drivers.length;
        assigned = true;
        break;
      }
    }

    if (!assigned) unassigned.push(order);
  }

  return { stopsByDriver, unassigned, optimized: false };
}

export function buildStopsFromOrders(orderList) {
  return orderList
    .filter((order) => orderBags(order) > 0)
    .map((order) => ({
      orderId:         order._id,
      customerName:    order.customerName,
      deliveryAddress: order.deliveryAddress,
      bags:            orderBags(order),
      comment:         order.comments || "",
    }));
}

/**
 * Split a driver's optimized stop list into multiple delivery routes.
 * Each route: up to ROUTE_MAX_BAGS bags (no stop-count limit).
 */
export function splitOrdersIntoRoutes(orders) {
  const routes = [];
  const unassigned = [];
  let current = { orders: [], bags: 0 };

  for (const order of orders) {
    const bags = orderBags(order);
    if (bags <= 0) continue;

    if (bags > ROUTE_MAX_BAGS) {
      unassigned.push(order);
      continue;
    }

    if (current.orders.length > 0 && current.bags + bags > ROUTE_MAX_BAGS) {
      routes.push(current);
      current = { orders: [], bags: 0 };
    }

    current.orders.push(order);
    current.bags += bags;
  }

  if (current.orders.length) routes.push(current);
  return { routes, unassigned };
}

export function getDriverProfiles(routes) {
  const groups = new Map();
  for (const r of routes) {
    const gid = String(r.driverGroupId || r._id);
    if (!groups.has(gid)) {
      groups.set(gid, {
        driverGroupId: r.driverGroupId || r._id,
        driverName: r.driverName,
        driverPhone: r.driverPhone,
        driverTotalCapacity: r.driverTotalCapacity || r.capacity || 999,
      });
    }
  }
  return [...groups.values()];
}

export function routeBagTotals(stopsByDriver, drivers) {
  return stopsByDriver.map((stops, i) => ({
    driverIndex: i,
    assignedBags: bagsUsed(stopsByDriver, i),
    capacity: driverCap(drivers, i),
  }));
}

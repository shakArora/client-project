import { logic } from "./routingLogic.js";
import { geocodeImportAddress, formatRegionHint } from "./geocode.js";

const HUB_LABEL = "__HUB__";

function stripPartSuffix(label) {
  return String(label).replace(/ \(Part \d+\)$/, "");
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

async function resolveOrderCoords(orders, regionHint) {
  const geocoded = [];
  const missing = [];

  for (const order of orders) {
    if (order.coords?.lat != null && order.coords?.lon != null) {
      geocoded.push(order);
      continue;
    }
    const parsed = await geocodeImportAddress(order.deliveryAddress, { regionHint });
    if (parsed.ok) geocoded.push({ ...order, coords: parsed.coords });
    else missing.push(order);
  }

  return { geocoded, missing };
}

function appendClusterStops(stopsByDriver, cluster, orderById, added) {
  const drvIdx = cluster.vehicleIndex;
  if (drvIdx < 0 || drvIdx >= stopsByDriver.length) return;

  for (const label of cluster.addresses || []) {
    const orderId = stripPartSuffix(label);
    if (orderId === HUB_LABEL) continue;
    const order = orderById.get(orderId);
    if (order && !added.has(orderId)) {
      stopsByDriver[drvIdx].push(order);
      added.add(orderId);
    }
  }
}

/**
 * Assign orders to drivers using src/logic.js (OSRM matrix + greedy clustering).
 * Uses stored coordinates — no per-address Nominatim round-trip during routing.
 */
export async function optimizeRoutes({ orders, drivers, fundraiser }) {
  if (!orders.length || !drivers.length) return null;

  const regionHint = formatRegionHint(fundraiser?.location)
    || fundraiser?.deliveryHubAddress
    || fundraiser?.pickupAddress;

  const hubCoords = await resolveHubCoords(fundraiser);
  const { geocoded, missing } = await resolveOrderCoords(orders, regionHint);
  if (!geocoded.length) return null;

  const useHub = hubCoords?.lat != null;
  const labels = useHub
    ? [HUB_LABEL, ...geocoded.map((o) => String(o._id))]
    : geocoded.map((o) => String(o._id));
  const weights = useHub
    ? [0, ...geocoded.map((o) => o.totalBags)]
    : geocoded.map((o) => o.totalBags);
  const coords = useHub
    ? [{ lat: hubCoords.lat, lon: hubCoords.lon }, ...geocoded.map((o) => ({ lat: o.coords.lat, lon: o.coords.lon }))]
    : geocoded.map((o) => ({ lat: o.coords.lat, lon: o.coords.lon }));
  const capacities = drivers.map((d) => d.capacity || 999);

  const results = await logic(labels, weights, capacities, { coords, disableSplit: true });

  const stopsByDriver = drivers.map(() => []);
  const orderById = new Map(orders.map((o) => [String(o._id), o]));
  const added = new Set();

  for (const result of results) {
    for (const cluster of result.clusters || []) {
      appendClusterStops(stopsByDriver, cluster, orderById, added);
    }
  }

  const unassigned = [
    ...missing,
    ...orders.filter((o) => !added.has(String(o._id))),
  ];

  return { stopsByDriver, unassigned, optimized: true, hubCoords };
}

export function capacityFallback({ orders, drivers, hubCoords }) {
  const stopsByDriver = drivers.map(() => []);
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
    let assigned = false;
    for (let i = 0; i < drivers.length; i++) {
      const idx = (driverIdx + i) % drivers.length;
      const d = drivers[idx];
      const used = stopsByDriver[idx].reduce((s, o) => s + o.totalBags, 0);
      if ((d.capacity || 999) - used >= order.totalBags) {
        stopsByDriver[idx].push(order);
        driverIdx = (idx + 1) % drivers.length;
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
  return orderList.map((order) => ({
    orderId:         order._id,
    customerName:    order.customerName,
    deliveryAddress: order.deliveryAddress,
    bags:            order.totalBags,
    comment:         order.comments || "",
  }));
}

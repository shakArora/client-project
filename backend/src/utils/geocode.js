const USER_AGENT = "Routed/1.0 contact.routed@gmail.com";

let lastGeocodeAt = 0;

async function geocodeThrottle() {
  const elapsed = Date.now() - lastGeocodeAt;
  if (elapsed < 1100) await new Promise((r) => setTimeout(r, 1100 - elapsed));
  lastGeocodeAt = Date.now();
}

export function looksLikeStreetAddress(raw) {
  const s = String(raw || "").trim();
  if (s.length < 5) return false;
  return /\d/.test(s);
}

/** Build geocode query variants for messy spreadsheet addresses (missing ZIP, etc.). */
export function normalizeImportAddressVariants(raw) {
  const s = String(raw || "").trim().replace(/\s+/g, " ");
  if (!s) return [];

  const variants = new Set([s]);

  const cityStateZip = s.match(/^(.+?),\s*([^,]+?)\s+([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?\s*$/i);
  if (cityStateZip) {
    const [, street, city, state, zip] = cityStateZip;
    const base = `${street.trim()}, ${city.trim()}, ${state.toUpperCase()}`;
    variants.add(base);
    if (zip) variants.add(`${base} ${zip}`);
    variants.add(`${base}, USA`);
  }

  const streetCityState = s.match(/^(.+?\d[\w\s.'#-]*)\s+([A-Za-z][A-Za-z\s.'-]+?)\s+([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?\s*$/i);
  if (streetCityState && !s.includes(",")) {
    const [, street, city, state, zip] = streetCityState;
    const base = `${street.trim()}, ${city.trim()}, ${state.toUpperCase()}`;
    variants.add(base);
    if (zip) variants.add(`${base} ${zip}`);
    variants.add(`${base}, USA`);
  }

  for (const v of [...variants]) {
    if (!/\d{5}/.test(v) && !/\b(USA|United States)\b/i.test(v)) {
      variants.add(`${v}, USA`);
    }
  }

  return [...variants];
}

export function addressImportErrorMessage(raw, reason) {
  if (reason === "not_a_street_address") {
    return `Address does not look like a street address — include a house number (got "${raw}")`;
  }
  return `Address could not be parsed — fix spelling, city, and state (got "${raw}")`;
}

export async function geocodeAddress(address) {
  try {
    await geocodeThrottle();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export async function geocodeImportAddress(raw, { regionHint } = {}) {
  const input = String(raw || "").trim();
  if (!looksLikeStreetAddress(input)) {
    return { ok: false, reason: "not_a_street_address", input };
  }

  const variants = normalizeImportAddressVariants(input);
  if (regionHint) {
    for (const v of [...variants]) {
      variants.push(`${v}, ${regionHint}`);
    }
  }

  for (const query of variants) {
    const coords = await geocodeAddress(query);
    if (coords) return { ok: true, coords, input, query };
  }

  return { ok: false, reason: "not_found", input };
}

export async function validateImportAddresses(rows, { regionHint } = {}) {
  const errors = [];
  const validated = [];
  const cache = new Map();

  for (const row of rows) {
    const key = String(row.deliveryAddress || "").trim().toLowerCase();
    if (cache.has(key)) {
      const cached = cache.get(key);
      if (!cached.ok) {
        errors.push({ row: row.row, customerName: row.customerName, deliveryAddress: row.deliveryAddress, message: cached.message });
      } else {
        validated.push({ row: row.row, deliveryAddress: cached.deliveryAddress, coords: cached.coords });
      }
      continue;
    }

    const result = await geocodeImportAddress(row.deliveryAddress, { regionHint });
    if (!result.ok) {
      const message = addressImportErrorMessage(row.deliveryAddress, result.reason);
      cache.set(key, { ok: false, message });
      errors.push({
        row: row.row,
        customerName: row.customerName,
        deliveryAddress: row.deliveryAddress,
        message,
      });
    } else {
      const entry = {
        ok: true,
        deliveryAddress: result.coords.display,
        coords: result.coords,
      };
      cache.set(key, entry);
      validated.push({ row: row.row, deliveryAddress: entry.deliveryAddress, coords: entry.coords });
    }
  }

  return { valid: errors.length === 0, errors, validated };
}

export async function searchAddresses(query, limit = 5) {
  if (!query || query.trim().length < 3) return [];
  try {
    await geocodeThrottle();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=${limit}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.map((item) => ({
      address: item.display_name,
      display: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

/**
 * Integrates with Nominatim for address search, validation, and geocoding with rate limiting and import-address normalization. Exports helpers to preprocess messy spreadsheet addresses and validate bulk imports.
 * @name Shivum Arora
 * @date 2026-06-15
 */
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

/** Normalize messy spreadsheet address text before geocoding. */
export function preprocessImportAddress(raw) {
  let s = String(raw || "").trim().replace(/\s+/g, " ");
  s = s.replace(/\b(Dr|St|Ave|Rd|Ln|Ct|Ter|Pl|Cir|Blvd)\./gi, "$1");
  s = s.replace(/\bNO POTOMAC\b/gi, "North Potomac");
  s = s.replace(/\bN POTOMAC\b/gi, "North Potomac");
  return s;
}

export function formatRegionHint(regionHint) {
  if (!regionHint) return null;
  if (typeof regionHint === "string") {
    const s = regionHint.trim();
    return s || null;
  }
  if (typeof regionHint === "object") {
    const parts = [regionHint.city, regionHint.state].filter(Boolean).map(String);
    return parts.length ? parts.join(", ") : null;
  }
  return null;
}

/** Build geocode query variants for messy spreadsheet addresses (missing ZIP, etc.). */
export function normalizeImportAddressVariants(raw) {
  const s = preprocessImportAddress(raw);
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

  const zipPlusFour = s.match(/^(.+?\b\d{5})-\d{4}\b(.*)$/i);
  if (zipPlusFour) {
    variants.add(`${zipPlusFour[1]}${zipPlusFour[2]}`.trim());
  }

  return [...variants];
}

/**
 * Strip city/state from a comma-separated address when the city may be wrong.
 * e.g. "19908 Tygart Ln, Gaithersburg, MD 20879" → "19908 Tygart Ln"
 */
export function extractStreetOnly(raw) {
  const s = preprocessImportAddress(raw);
  if (!s) return null;

  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && looksLikeStreetAddress(parts[0])) {
    return parts[0];
  }

  const noComma = s.match(/^(.+?\d[\w\s.'#-]*?)\s+[A-Za-z][A-Za-z\s.'-]+\s+[A-Z]{2}(?:\s+(\d{5}(?:-\d{4})?))?\s*$/i);
  if (noComma && looksLikeStreetAddress(noComma[1].trim())) {
    return noComma[1].trim();
  }

  return null;
}

/** ZIP from the original string (not the house number). */
export function extractZip(raw) {
  const s = String(raw || "").trim();
  const afterState = s.match(/,\s*[A-Z]{2}\s+(\d{5})(?:-\d{4})?\s*$/i);
  if (afterState) return afterState[1];
  const trailing = s.match(/,\s*(\d{5})(?:-\d{4})?\s*$/);
  if (trailing) return trailing[1];
  return null;
}

export function streetOnlyGeocodeVariants(raw) {
  const street = extractStreetOnly(raw);
  if (!street) return [];

  const variants = [street];
  const zip = extractZip(raw);
  if (zip) variants.push(`${street}, ${zip}`);
  return variants;
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
    if (!res.ok) {
      return { error: `nominatim_http_${res.status}` };
    }
    const data = await res.json();
    if (!data.length) return { error: "nominatim_no_results" };
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display: data[0].display_name,
    };
  } catch (err) {
    return { error: err?.name === "TimeoutError" ? "nominatim_timeout" : "nominatim_fetch_failed" };
  }
}

export async function geocodeImportAddress(raw, { regionHint } = {}) {
  const input = preprocessImportAddress(raw);
  const queriesTried = [];
  const hint = formatRegionHint(regionHint);

  if (!looksLikeStreetAddress(input)) {
    return {
      ok: false,
      reason: "not_a_street_address",
      input,
      queriesTried,
      debug: { reason: "not_a_street_address", queriesTried, regionHint: hint },
    };
  }

  const variants = normalizeImportAddressVariants(input);
  if (hint) {
    for (const v of [...variants]) {
      variants.push(`${v}, ${hint}`);
    }
  }

  for (const query of variants) {
    queriesTried.push(query);
    const result = await geocodeAddress(query);
    if (result?.lat != null && result?.lon != null) {
      return { ok: true, coords: result, input, query, queriesTried };
    }
  }

  // Wrong city in CSV is common — retry with street (+ optional ZIP) only, first Nominatim hit.
  for (const query of streetOnlyGeocodeVariants(input)) {
    if (queriesTried.includes(query)) continue;
    queriesTried.push(query);
    const result = await geocodeAddress(query);
    if (result?.lat != null && result?.lon != null) {
      return { ok: true, coords: result, input, query, queriesTried, matchedVia: "street_only" };
    }
  }

  return {
    ok: false,
    reason: "not_found",
    input,
    queriesTried,
    debug: { reason: "not_found", queriesTried, regionHint: hint },
  };
}

export async function validateImportAddresses(rows, { regionHint } = {}) {
  const hint = formatRegionHint(regionHint);
  const errors = [];
  const validated = [];
  const cache = new Map();

  for (const row of rows) {
    const key = String(row.deliveryAddress || "").trim().toLowerCase();
    if (cache.has(key)) {
      const cached = cache.get(key);
      if (!cached.ok) {
        errors.push({
          row: row.row,
          customerName: row.customerName,
          deliveryAddress: row.deliveryAddress,
          message: cached.message,
          debug: cached.debug,
        });
      } else {
        validated.push({ row: row.row, deliveryAddress: cached.deliveryAddress, coords: cached.coords });
      }
      continue;
    }

    const result = await geocodeImportAddress(row.deliveryAddress, { regionHint: hint });
    if (!result.ok) {
      const message = addressImportErrorMessage(row.deliveryAddress, result.reason);
      const debug = result.debug || {
        reason: result.reason,
        queriesTried: result.queriesTried || [],
        regionHint: hint,
      };
      cache.set(key, { ok: false, message, debug });
      errors.push({
        row: row.row,
        customerName: row.customerName,
        deliveryAddress: row.deliveryAddress,
        message,
        debug,
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

  return { valid: errors.length === 0, errors, validated, regionHint: hint };
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

/**
 * OpenStreetMap Nominatim client for geocoding a single address or returning autocomplete search results.
 * Powers checkout address validation, order coordinate storage, and fundraiser hub location resolution.
 * @author Shivum Arora
 * @date 6/11/2026
 */
const USER_AGENT = "Routed/1.0 contact.routed@gmail.com";

export async function geocodeAddress(address) {
  try {
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

export async function searchAddresses(query, limit = 5) {
  if (!query || query.trim().length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=${limit}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.map(item => ({
      address: item.display_name,
      display: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

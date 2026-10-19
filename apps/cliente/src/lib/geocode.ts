export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es' },
    });
    const data = await res.json();

    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es' },
    });
    const data = await res.json();

    if (!data || data.error) return null;

    const a = data.address ?? {};
    const street = [a.road, a.house_number].filter(Boolean).join(' ');
    const colonia = a.suburb ?? a.neighbourhood ?? a.quarter;
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.city_district;
    const short = [street, colonia, city].filter(Boolean).join(', ');

    return short || data.display_name || null;
  } catch {
    return null;
  }
}
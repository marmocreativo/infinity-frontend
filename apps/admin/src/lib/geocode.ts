// Busca una dirección solo dentro de México (con prioridad al Valle de México)
export async function geocodeMexico(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;

  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1' +
    '&countrycodes=mx&viewbox=-99.45,19.80,-98.80,19.10&bounded=0' +
    `&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();

    if (!data || data.length === 0) return null;

    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
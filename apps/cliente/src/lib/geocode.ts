import { isInMexico } from './mexico';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

// Centro de CDMX: sesga la búsqueda hacia el Valle de México sin excluir el resto del país
const BIAS = { lat: 19.4326, lng: -99.1332 };

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- Photon (OpenStreetMap): mejor para direcciones escritas a mano ----
interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    state?: string;
    countrycode?: string;
  };
}

async function searchPhoton(query: string): Promise<GeocodeResult[]> {
  const url =
    'https://photon.komoot.io/api/?limit=6' +
    `&lat=${BIAS.lat}&lon=${BIAS.lng}` +
    `&q=${encodeURIComponent(query)}`;

  const data = (await fetchJson(url)) as { features?: PhotonFeature[] };

  return (data.features ?? [])
    .filter((f) => f.properties?.countrycode === 'MX' && f.geometry?.coordinates)
    .map((f) => {
      const [lng, lat] = f.geometry!.coordinates!;
      const p = f.properties!;
      const street = [p.street, p.housenumber].filter(Boolean).join(' ');
      const parts = [
        p.name && p.name !== p.street ? p.name : null,
        street || null,
        p.district ?? p.locality ?? null,
        p.city ?? null,
        p.state ?? null,
      ].filter((x): x is string => Boolean(x));

      // Sin repetidos seguidos ("Coyoacán, Coyoacán")
      const label = parts.filter((part, i) => part !== parts[i - 1]).join(', ');

      return { lat, lng, displayName: label };
    });
}

// ---- Nominatim: respaldo ----
interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
}

async function searchNominatim(query: string): Promise<GeocodeResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=mx' +
    '&viewbox=-99.45,19.80,-98.80,19.10&bounded=0' +
    `&q=${encodeURIComponent(query)}`;

  const data = (await fetchJson(url)) as NominatimItem[];

  return (data ?? []).map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    displayName: d.display_name,
  }));
}

/** Quita detalles que suelen romper la búsqueda (interior, depto, "Col.", etc.) */
function simplify(query: string): string {
  return query
    .replace(/\b(int(erior)?|depto|dpto|despacho|local|piso|edificio|torre)\.?\s*[\w-]+/gi, '')
    .replace(/\b(col(onia)?|alcald[ií]a|del(egaci[oó]n)?)\.?\s+/gi, '')
    .replace(/#/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

function dedupe(list: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>();

  return list.filter((r) => {
    const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function safe(fn: () => Promise<GeocodeResult[]>): Promise<GeocodeResult[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

/**
 * Busca direcciones en México. Prueba varios proveedores y variantes de la consulta
 * hasta encontrar algo; devuelve hasta 6 resultados ordenados por relevancia.
 */
export async function searchAddresses(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const simple = simplify(q);
  const attempts: (() => Promise<GeocodeResult[]>)[] = [
    () => searchPhoton(q),
    () => searchNominatim(q),
    () => searchNominatim(`${q}, México`),
    ...(simple && simple !== q ? [() => searchPhoton(simple), () => searchNominatim(simple)] : []),
  ];

  for (const attempt of attempts) {
    const found = dedupe((await safe(attempt)).filter((r) => isInMexico(r.lat, r.lng)));
    if (found.length > 0) return found.slice(0, 6);
  }

  return [];
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const results = await searchAddresses(query);
  return results[0] ?? null;
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

// Límites aproximados de México: [[lat sur, lng oeste], [lat norte, lng este]]
export const MEXICO_BOUNDS: [[number, number], [number, number]] = [
  [14.3, -118.7],
  [32.9, -86.4],
];

export function isInMexico(lat: number, lng: number): boolean {
  const [[latMin, lngMin], [latMax, lngMax]] = MEXICO_BOUNDS;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}
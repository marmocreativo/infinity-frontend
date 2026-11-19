// Versión de esta app. Debe coincidir en cliente, admin y mensajero, y subirse junto
// con `frontend` en config/app_version.php del backend cada vez que se publique.
export const APP_VERSION = '0.1.11';

/** Compara versiones "x.y.z": negativo si a < b, 0 si son iguales, positivo si a > b */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

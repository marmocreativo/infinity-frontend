import { ApiError } from './api';

// Devuelve el primer mensaje de validación del backend, o uno genérico
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { errors?: Record<string, string[]> } | null;
    const first = body?.errors ? Object.values(body.errors)[0]?.[0] : null;
    return first ?? err.message;
  }
  return 'No se pudo guardar. Intenta de nuevo.';
}
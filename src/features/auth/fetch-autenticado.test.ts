import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login, obtenerSesion } from './auth.repository';
import { fetchAutenticado } from './fetch-autenticado';
import { suscribirseASesionExpirada } from '../sincronizacion/sync-eventos';

const USUARIO_API = { id: 'u1', dni: '10000001', nombres: 'Ana Torres', rol: 'FISCALIZADOR' };

async function iniciarSesionDePrueba() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'access-viejo', refreshToken: 'refresh-vigente', usuario: USUARIO_API }),
    } as Response),
  );
  await login('10000001', 'Campo2026!');
  vi.unstubAllGlobals();
}

describe('fetchAutenticado — HU-28/HU-29', () => {
  beforeEach(async () => {
    localStorage.clear();
    await iniciarSesionDePrueba();
  });

  it('caso feliz: 401 con access token vencido refresca en silencio y reintenta una vez', async () => {
    let llamadasARecurso = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/refresh')) {
          return { ok: true, json: async () => ({ accessToken: 'access-nuevo' }) } as Response;
        }
        llamadasARecurso++;
        if (llamadasARecurso === 1) return { ok: false, status: 401 } as Response;
        return { ok: true, status: 200 } as Response;
      }),
    );

    const respuesta = await fetchAutenticado('http://localhost:3000/uit/parametros');

    expect(respuesta.ok).toBe(true);
    expect(llamadasARecurso).toBe(2);
    expect(obtenerSesion()?.accessToken).toBe('access-nuevo');
  });

  it('caso borde (HU-29): refresh token revocado propaga el 401 original y avisa sesión expirada', async () => {
    const sesionExpirada = vi.fn();
    const cancelarSuscripcion = suscribirseASesionExpirada(sesionExpirada);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/refresh')) return { ok: false, status: 401 } as Response;
        return { ok: false, status: 401 } as Response;
      }),
    );

    const respuesta = await fetchAutenticado('http://localhost:3000/uit/parametros');

    expect(respuesta.status).toBe(401);
    expect(sesionExpirada).toHaveBeenCalledTimes(1);
    cancelarSuscripcion();
  });

  it('caso borde: sin red al intentar refrescar nunca avisa "sesión expirada" (podría ser solo el wifi)', async () => {
    const sesionExpirada = vi.fn();
    const cancelarSuscripcion = suscribirseASesionExpirada(sesionExpirada);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/refresh')) throw new Error('network down');
        return { ok: false, status: 401 } as Response;
      }),
    );

    const respuesta = await fetchAutenticado('http://localhost:3000/uit/parametros');

    expect(respuesta.status).toBe(401);
    expect(sesionExpirada).not.toHaveBeenCalled();
    cancelarSuscripcion();
  });
});

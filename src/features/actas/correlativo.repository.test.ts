import { describe, expect, it, vi } from 'vitest';
import { TipoActa } from '@pas-sjl/shared-types';
import { verificarCorrelativoDisponible } from './correlativo.repository';

describe('verificarCorrelativoDisponible — HU-16', () => {
  it('caso borde: sin conexión (fetch lanza) nunca bloquea — devuelve null, no false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const resultado = await verificarCorrelativoDisponible(TipoActa.EXHORTACION, '123');
    expect(resultado).toBeNull();
    vi.unstubAllGlobals();
  });

  it('caso borde (V-02): con excluirIntervencionId, lo agrega a la URL para que el backend no choque consigo mismo', async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ disponible: true }) });
    vi.stubGlobal('fetch', fetchFalso);
    await verificarCorrelativoDisponible(TipoActa.EXHORTACION, '123', 'interv-1');
    expect(fetchFalso).toHaveBeenCalledWith(expect.stringContaining('excluirIntervencionId=interv-1'), {});
    vi.unstubAllGlobals();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../lib/db';
import { buscarCuisLocal, catalogoLocalEstaVacio, sincronizarCatalogoCuis } from './cuis-catalogo.repository';

const CODIGO_API = {
  id: 'uuid-1',
  codigo: '7.01.06',
  descripcion: 'Quemar residuos sólidos no municipales peligrosos',
  requiereDesambiguacion: true,
  escalas: [{ id: 'escala-1', escala: 'MG' as const, condicion: null, porcentaje: 400, medidaProvisional: null }],
  sugiereValorizacionObra: false,
};

describe('cuis-catalogo.repository — HU-07', () => {
  beforeEach(async () => {
    await db.cuisCache.clear();
    vi.restoreAllMocks();
  });

  it('caso feliz: sincroniza el catálogo completo y luego se puede buscar 100% local', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [CODIGO_API] } as Response),
    );

    const total = await sincronizarCatalogoCuis();
    expect(total).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    // la búsqueda no debe volver a llamar a fetch: es 100% local.
    const resultados = await buscarCuisLocal('residuos');
    expect(resultados).toHaveLength(1);
    expect(resultados[0].codigo).toBe('7.01.06');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('caso borde: catálogo local vacío antes de sincronizar por primera vez (sin conexión el día 1)', async () => {
    expect(await catalogoLocalEstaVacio()).toBe(true);
    expect(await buscarCuisLocal('cualquier cosa')).toEqual([]);
  });

  it('caso borde: si la sincronización falla, el catálogo local existente no se toca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [CODIGO_API] } as Response),
    );
    await sincronizarCatalogoCuis();
    expect(await catalogoLocalEstaVacio()).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await expect(sincronizarCatalogoCuis()).rejects.toThrow();

    // el catálogo previamente sincronizado sigue disponible offline.
    expect(await catalogoLocalEstaVacio()).toBe(false);
  });
});

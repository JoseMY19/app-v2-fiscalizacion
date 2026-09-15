import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../lib/db';

vi.mock('../../lib/comprimir-imagen', () => ({
  comprimirImagen: vi.fn(async () => new Blob(['comprimida'])),
}));

const { agregarFoto, contarFotos, FOTOS_MAXIMO } = await import('./fotos.repository');

const INTERVENCION_ID = 'intervencion-de-prueba';

describe('fotos.repository — HU-17', () => {
  beforeEach(async () => {
    await db.fotos.clear();
  });

  it('caso feliz: agrega una foto (ya comprimida) a la intervención', async () => {
    await agregarFoto(INTERVENCION_ID, new Blob(['original']));
    expect(await contarFotos(INTERVENCION_ID)).toBe(1);
  });

  it('caso borde: no permite superar el máximo de 10 fotos', async () => {
    for (let i = 0; i < FOTOS_MAXIMO; i++) {
      await agregarFoto(INTERVENCION_ID, new Blob(['foto']));
    }
    await expect(agregarFoto(INTERVENCION_ID, new Blob(['una de más']))).rejects.toThrow(/no se pueden agregar/i);
  });
});

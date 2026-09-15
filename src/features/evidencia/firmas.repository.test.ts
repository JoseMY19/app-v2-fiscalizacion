import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../lib/db';
import { guardarFirmaInspector, obtenerFirmaInspector } from './firmas.repository';

const INTERVENCION_ID = 'intervencion-de-prueba';

describe('firmas.repository — HU-18', () => {
  beforeEach(async () => {
    await db.firmas.clear();
  });

  it('caso borde: rehacer la firma reemplaza la anterior, no la duplica', async () => {
    await guardarFirmaInspector(INTERVENCION_ID, new Blob(['firma-1']));
    await guardarFirmaInspector(INTERVENCION_ID, new Blob(['firma-2']));

    const todas = await db.firmas.where('intervencionLocalId').equals(INTERVENCION_ID).toArray();
    expect(todas).toHaveLength(1);

    const actual = await obtenerFirmaInspector(INTERVENCION_ID);
    const texto = await actual?.blob.text();
    expect(texto).toBe('firma-2');
  });
});

import { db, type TestigoLocal } from '../../lib/db';

export interface DatosTestigo {
  nombre: string;
  documento: string;
}

/** HU-20: siempre exactamente 2 testigos — reemplaza los anteriores, no los acumula. */
export async function guardarTestigos(intervencionLocalId: string, testigos: [DatosTestigo, DatosTestigo]): Promise<void> {
  await db.transaction('rw', db.testigos, async () => {
    const previos = await db.testigos.where('intervencionLocalId').equals(intervencionLocalId).toArray();
    await db.testigos.bulkDelete(previos.map((t) => t.id!));
    await db.testigos.bulkAdd([
      { intervencionLocalId, orden: 1, nombre: testigos[0].nombre.trim(), documento: testigos[0].documento.trim() },
      { intervencionLocalId, orden: 2, nombre: testigos[1].nombre.trim(), documento: testigos[1].documento.trim() },
    ]);
  });
}

export async function listarTestigos(intervencionLocalId: string): Promise<TestigoLocal[]> {
  return db.testigos.where('intervencionLocalId').equals(intervencionLocalId).sortBy('orden');
}

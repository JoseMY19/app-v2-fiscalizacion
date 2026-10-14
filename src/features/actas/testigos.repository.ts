import { db, type TestigoLocal } from '../../lib/db';

export interface DatosTestigo {
  nombre: string;
  documento: string;
}

/**
 * Ambos testigos opcionales (cambio de regla 2026-09-30) — la lista puede
 * venir vacía. Reemplaza los anteriores, no los acumula.
 */
export async function guardarTestigos(intervencionLocalId: string, testigos: DatosTestigo[]): Promise<void> {
  await db.transaction('rw', db.testigos, async () => {
    const previos = await db.testigos.where('intervencionLocalId').equals(intervencionLocalId).toArray();
    await db.testigos.bulkDelete(previos.map((t) => t.id!));
    await db.testigos.bulkAdd(
      testigos.map((t, i) => ({
        intervencionLocalId,
        orden: (i + 1) as 1 | 2,
        nombre: t.nombre.trim(),
        documento: t.documento.trim(),
      })),
    );
  });
}

export async function listarTestigos(intervencionLocalId: string): Promise<TestigoLocal[]> {
  return db.testigos.where('intervencionLocalId').equals(intervencionLocalId).sortBy('orden');
}

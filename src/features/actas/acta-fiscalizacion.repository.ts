import { db, type ActaFiscalizacionLocal } from '../../lib/db';

/** HU-12: mínimo razonable para no dejar pasar actas vacías. */
export const HECHOS_VERIFICADOS_MIN_CARACTERES = 30;

export interface DatosActaFiscalizacion {
  numeroCorrelativo: string;
  hechosVerificados: string;
  observacionesAdministrado?: string;
}

export function validarHechosVerificados(texto: string): string | null {
  if (texto.trim().length < HECHOS_VERIFICADOS_MIN_CARACTERES) {
    return `Los hechos verificados deben tener al menos ${HECHOS_VERIFICADOS_MIN_CARACTERES} caracteres.`;
  }
  return null;
}

export async function guardarActaFiscalizacion(intervencionLocalId: string, datos: DatosActaFiscalizacion): Promise<void> {
  const error = validarHechosVerificados(datos.hechosVerificados);
  if (error) throw new Error(error);

  const registro: ActaFiscalizacionLocal = {
    intervencionLocalId,
    numeroCorrelativo: datos.numeroCorrelativo.trim(),
    hechosVerificados: datos.hechosVerificados.trim(),
    observacionesAdministrado: datos.observacionesAdministrado?.trim() || undefined,
    creadoEn: new Date().toISOString(),
  };
  await db.actasFiscalizacion.put(registro);
}

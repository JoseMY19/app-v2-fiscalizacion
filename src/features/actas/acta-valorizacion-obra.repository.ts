import { db, type ActaValorizacionObraLocal } from '../../lib/db';

export interface DatosActaValorizacionObra {
  numeroCorrelativo: string;
  estadoObra?: string;
}

/**
 * HU-14: montoMultaCalculado no se pide aquí — SP1 (el aplicativo) no
 * calcula el monto final para Valor de Obra, eso lo hace SP5 en oficina
 * (erd-sp1-decisiones.md §2.3). Tampoco se pide cuadroValoresUnitarios:
 * no hay especificación de UI para ese campo todavía.
 */
export async function guardarActaValorizacionObra(
  intervencionLocalId: string,
  datos: DatosActaValorizacionObra,
): Promise<number> {
  const registro: ActaValorizacionObraLocal = {
    intervencionLocalId,
    numeroCorrelativo: datos.numeroCorrelativo.trim(),
    estadoObra: datos.estadoObra?.trim() || undefined,
    creadoEn: new Date().toISOString(),
  };
  return db.actasValorizacionObra.add(registro);
}

export async function listarActasValorizacionObra(intervencionLocalId: string): Promise<ActaValorizacionObraLocal[]> {
  return db.actasValorizacionObra.where('intervencionLocalId').equals(intervencionLocalId).toArray();
}

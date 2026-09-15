import { db, type ActaAdicionalLocal } from '../../lib/db';

export interface DatosActaAdicional {
  tipo: 'RETENCION_VEHICULO' | 'DECOMISO';
  numeroCorrelativo: string;
  detalle?: string;
}

/**
 * HU-14: Retención de Vehículos y Decomiso van por la tabla genérica
 * ActaAdicional — el área legal todavía no cerró su formato (ver
 * erd-sp1-decisiones.md §2.5), por eso `detalle` es texto libre.
 */
export async function guardarActaAdicional(intervencionLocalId: string, datos: DatosActaAdicional): Promise<number> {
  const registro: ActaAdicionalLocal = {
    intervencionLocalId,
    tipo: datos.tipo,
    numeroCorrelativo: datos.numeroCorrelativo.trim(),
    detalle: datos.detalle?.trim() || undefined,
    creadoEn: new Date().toISOString(),
  };
  return db.actasAdicionales.add(registro);
}

export async function listarActasAdicionales(intervencionLocalId: string): Promise<ActaAdicionalLocal[]> {
  return db.actasAdicionales.where('intervencionLocalId').equals(intervencionLocalId).toArray();
}

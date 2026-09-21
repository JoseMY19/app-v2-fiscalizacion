import { db, type ActaMedidaProvisionalLocal } from '../../lib/db';

export interface DatosActaMedidaProvisional {
  numeroCorrelativo: string;
  tipoMedida: 'CLAUSURA' | 'PARALIZACION' | 'OTROS';
  descripcion?: string;
  lugarEjecucion?: string;
  observacionesAdministrado?: string;
}

/** HU-14: no es 1:1 — una intervención puede tener más de una medida provisional. */
export async function guardarActaMedidaProvisional(
  intervencionLocalId: string,
  datos: DatosActaMedidaProvisional,
): Promise<number> {
  const registro: ActaMedidaProvisionalLocal = {
    intervencionLocalId,
    numeroCorrelativo: datos.numeroCorrelativo.trim(),
    tipoMedida: datos.tipoMedida,
    descripcion: datos.descripcion?.trim() || undefined,
    lugarEjecucion: datos.lugarEjecucion?.trim() || undefined,
    observacionesAdministrado: datos.observacionesAdministrado?.trim() || undefined,
    creadoEn: new Date().toISOString(),
  };
  return db.actasMedidaProvisional.add(registro);
}

export async function listarActasMedidaProvisional(intervencionLocalId: string): Promise<ActaMedidaProvisionalLocal[]> {
  return db.actasMedidaProvisional.where('intervencionLocalId').equals(intervencionLocalId).toArray();
}

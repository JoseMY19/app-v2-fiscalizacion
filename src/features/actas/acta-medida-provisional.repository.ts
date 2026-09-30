import { db, type ActaMedidaProvisionalLocal, type TipoMedidaProvisional } from '../../lib/db';

export interface DatosActaMedidaProvisional {
  numeroCorrelativo: string;
  tipoMedida: TipoMedidaProvisional;
  descripcion?: string;
  lugarEjecucion?: string;
  observacionesAdministrado?: string;
  /** C3: la UI lo exige al crear; opcional aquí para no romper llamadas previas. */
  seEjecutoEnActo?: boolean;
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
    seEjecutoEnActo: datos.seEjecutoEnActo,
    creadoEn: new Date().toISOString(),
  };
  return db.actasMedidaProvisional.add(registro);
}

export async function listarActasMedidaProvisional(intervencionLocalId: string): Promise<ActaMedidaProvisionalLocal[]> {
  return db.actasMedidaProvisional.where('intervencionLocalId').equals(intervencionLocalId).toArray();
}

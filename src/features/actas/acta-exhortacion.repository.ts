import type { BaseCalculo } from '@pas-sjl/shared-types';
import { db, type ActaExhortacionLocal } from '../../lib/db';

/** HU-11: correlativo lo formaliza HU-16 después; por ahora es un input simple del usuario. */
export interface DatosActaExhortacion {
  numeroCorrelativo: string;
  presuntaInfraccion: string;
  baseCalculo: BaseCalculo;
  montoPosibleDeuda: number | null;
  plazoSubsanacion?: string;
  observaciones?: string;
}

export async function guardarActaExhortacion(intervencionLocalId: string, datos: DatosActaExhortacion): Promise<void> {
  const registro: ActaExhortacionLocal = {
    intervencionLocalId,
    numeroCorrelativo: datos.numeroCorrelativo.trim(),
    presuntaInfraccion: datos.presuntaInfraccion.trim(),
    baseCalculo: datos.baseCalculo,
    montoPosibleDeuda: datos.montoPosibleDeuda ?? undefined,
    plazoSubsanacion: datos.plazoSubsanacion?.trim() || undefined,
    observaciones: datos.observaciones?.trim() || undefined,
    creadoEn: new Date().toISOString(),
  };
  await db.actasExhortacion.put(registro);
}

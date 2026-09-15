import { MotivoNoIdentificado } from '@pas-sjl/shared-types';
import { db, type AdministradoLocal } from '../../lib/db';

/** HU-04: datos completos del administrado identificado. */
export interface DatosAdministrado {
  tipoDocumento: string;
  numeroDocumento: string;
  nombresRazonSocial: string;
  domicilio: string;
  distrito: string;
  giroUso: string;
  numeroLicenciaFuncionamiento?: string;
}

export async function guardarAdministrado(intervencionLocalId: string, datos: DatosAdministrado): Promise<void> {
  const registro: AdministradoLocal = {
    intervencionLocalId,
    identificado: true,
    ...datos,
    numeroLicenciaFuncionamiento: datos.numeroLicenciaFuncionamiento?.trim() || undefined,
    actualizadoEn: new Date().toISOString(),
  };
  await db.administrados.put(registro);
}

/** HU-05: continuar sin poder identificar al administrado. */
export async function marcarAdministradoNoIdentificado(
  intervencionLocalId: string,
  motivo: MotivoNoIdentificado,
): Promise<void> {
  const registro: AdministradoLocal = {
    intervencionLocalId,
    identificado: false,
    motivoNoIdentificado: motivo,
    actualizadoEn: new Date().toISOString(),
  };
  await db.administrados.put(registro);
}

export async function obtenerAdministrado(intervencionLocalId: string): Promise<AdministradoLocal | undefined> {
  return db.administrados.get(intervencionLocalId);
}

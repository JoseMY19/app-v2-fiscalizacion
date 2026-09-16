import { db } from '../../lib/db';
import { obtenerDeviceId } from '../auth/auth.repository';

/**
 * HU-24: arma exactamente el JSON que espera `POST /intervenciones` en el
 * backend (ver CrearIntervencionDto) leyendo todas las tablas Dexie de una
 * intervención. `IntervencionCuis.montoCalculado` no se envía — ningún
 * campo local lo captura hoy, se omite en vez de inventarlo (ver plan).
 * HU-28: `fiscalizadorId` ya no viaja en el bundle — el servidor lo toma
 * del token verificado, nunca del cliente (evita que un dispositivo pueda
 * suplantar a otro fiscalizador).
 */
export interface BundleIntervencion {
  id: string;
  deviceId: string;
  fechaHoraInicio: string;
  latitud?: number;
  longitud?: number;
  gpsPrecisionM?: number;
  origenUbicacion: string;
  direccionAproximada?: string;
  origen: string;
  referenciaOrigen?: string;
  tipoActuacion: string;
  versionLocal: number;
  administrado?: {
    identificado: boolean;
    motivoNoIdentificado?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    nombresRazonSocial?: string;
    domicilio?: string;
    distrito?: string;
    giroUso?: string;
    numeroLicenciaFuncionamiento?: string;
  };
  cuis: { cuisCodigoId: string; cuisEscalaMontoId?: string }[];
  actaExhortacion?: {
    numeroCorrelativo: string;
    presuntaInfraccion: string;
    baseCalculo: string;
    montoPosibleDeuda?: number;
    plazoSubsanacion?: string;
    observaciones?: string;
  };
  actaFiscalizacion?: {
    numeroCorrelativo: string;
    hechosVerificados: string;
    observacionesAdministrado?: string;
  };
  notificacionCargo?: {
    numeroCorrelativo: string;
    baseCalculo: string;
    montoPasibleMulta?: number;
    medidaComplementaria?: string;
    placaRodaje?: string;
    fechaDeteccion: string;
    fechaNotificacion?: string;
    modoNotificacion?: string;
    receptorNombre?: string;
    receptorDocumento?: string;
    receptorRelacion?: string;
    seNegoIdentificarse?: boolean;
    seNegoFirmar?: boolean;
    domicilioPuertas?: string;
    domicilioPisos?: string;
    domicilioNumeroSuministro?: string;
    domicilioObservaciones?: string;
  };
  testigos: { orden: 1 | 2; nombre: string; documento: string }[];
  actasMedidaProvisional: {
    numeroCorrelativo: string;
    tipoMedida: string;
    descripcion?: string;
    lugarEjecucion?: string;
    observacionesAdministrado?: string;
  }[];
  actasValorizacionObra: { numeroCorrelativo: string; estadoObra?: string }[];
  actasAdicionales: { tipo: string; numeroCorrelativo: string; detalle?: string }[];
}

export async function armarBundle(intervencionLocalId: string): Promise<BundleIntervencion> {
  const intervencion = await db.intervenciones.get(intervencionLocalId);
  if (!intervencion) {
    throw new Error(`No existe la intervención local ${intervencionLocalId}.`);
  }
  if (!intervencion.fiscalizadorId) {
    throw new Error('La intervención no tiene fiscalizador asignado — falta la identidad de dispositivo (HU-24).');
  }
  if (!intervencion.origen) {
    throw new Error('Falta el origen de la intervención (HU-03) — no se puede sincronizar todavía.');
  }
  if (!intervencion.tipoActuacion) {
    throw new Error('Falta el camino de la intervención (HU-10) — no se puede sincronizar todavía.');
  }

  const [administrado, cuisSeleccionados, actaExhortacion, actaFiscalizacion, notificacionCargo, testigos, medidas, valorizaciones, adicionales] =
    await Promise.all([
      db.administrados.get(intervencionLocalId),
      db.intervencionCuis.where('intervencionLocalId').equals(intervencionLocalId).toArray(),
      db.actasExhortacion.get(intervencionLocalId),
      db.actasFiscalizacion.get(intervencionLocalId),
      db.notificacionesCargo.get(intervencionLocalId),
      db.testigos.where('intervencionLocalId').equals(intervencionLocalId).toArray(),
      db.actasMedidaProvisional.where('intervencionLocalId').equals(intervencionLocalId).toArray(),
      db.actasValorizacionObra.where('intervencionLocalId').equals(intervencionLocalId).toArray(),
      db.actasAdicionales.where('intervencionLocalId').equals(intervencionLocalId).toArray(),
    ]);

  return {
    id: intervencion.localId,
    deviceId: obtenerDeviceId(),
    fechaHoraInicio: intervencion.fechaHoraInicio,
    latitud: intervencion.latitud,
    longitud: intervencion.longitud,
    gpsPrecisionM: intervencion.gpsPrecisionM,
    origenUbicacion: intervencion.origenUbicacion,
    direccionAproximada: intervencion.direccionAproximada,
    origen: intervencion.origen,
    referenciaOrigen: intervencion.referenciaOrigen,
    tipoActuacion: intervencion.tipoActuacion,
    versionLocal: intervencion.versionLocal,
    administrado: administrado
      ? {
          identificado: administrado.identificado,
          motivoNoIdentificado: administrado.motivoNoIdentificado,
          tipoDocumento: administrado.tipoDocumento,
          numeroDocumento: administrado.numeroDocumento,
          nombresRazonSocial: administrado.nombresRazonSocial,
          domicilio: administrado.domicilio,
          distrito: administrado.distrito,
          giroUso: administrado.giroUso,
          numeroLicenciaFuncionamiento: administrado.numeroLicenciaFuncionamiento,
        }
      : undefined,
    cuis: cuisSeleccionados.map((c) => ({ cuisCodigoId: c.cuisCodigoId, cuisEscalaMontoId: c.cuisEscalaMontoId })),
    actaExhortacion: actaExhortacion
      ? {
          numeroCorrelativo: actaExhortacion.numeroCorrelativo,
          presuntaInfraccion: actaExhortacion.presuntaInfraccion,
          baseCalculo: actaExhortacion.baseCalculo,
          montoPosibleDeuda: actaExhortacion.montoPosibleDeuda,
          plazoSubsanacion: actaExhortacion.plazoSubsanacion,
          observaciones: actaExhortacion.observaciones,
        }
      : undefined,
    actaFiscalizacion: actaFiscalizacion
      ? {
          numeroCorrelativo: actaFiscalizacion.numeroCorrelativo,
          hechosVerificados: actaFiscalizacion.hechosVerificados,
          observacionesAdministrado: actaFiscalizacion.observacionesAdministrado,
        }
      : undefined,
    notificacionCargo: notificacionCargo
      ? {
          numeroCorrelativo: notificacionCargo.numeroCorrelativo,
          baseCalculo: notificacionCargo.baseCalculo,
          montoPasibleMulta: notificacionCargo.montoPasibleMulta,
          medidaComplementaria: notificacionCargo.medidaComplementaria,
          placaRodaje: notificacionCargo.placaRodaje,
          fechaDeteccion: notificacionCargo.fechaDeteccion,
          fechaNotificacion: notificacionCargo.fechaNotificacion,
          modoNotificacion: notificacionCargo.modoNotificacion,
          receptorNombre: notificacionCargo.receptorNombre,
          receptorDocumento: notificacionCargo.receptorDocumento,
          receptorRelacion: notificacionCargo.receptorRelacion,
          seNegoIdentificarse: notificacionCargo.seNegoIdentificarse,
          seNegoFirmar: notificacionCargo.seNegoFirmar,
          domicilioPuertas: notificacionCargo.domicilioPuertas,
          domicilioPisos: notificacionCargo.domicilioPisos,
          domicilioNumeroSuministro: notificacionCargo.domicilioNumeroSuministro,
          domicilioObservaciones: notificacionCargo.domicilioObservaciones,
        }
      : undefined,
    testigos: testigos.map((t) => ({ orden: t.orden, nombre: t.nombre, documento: t.documento })),
    actasMedidaProvisional: medidas.map((m) => ({
      numeroCorrelativo: m.numeroCorrelativo,
      tipoMedida: m.tipoMedida,
      descripcion: m.descripcion,
      lugarEjecucion: m.lugarEjecucion,
      observacionesAdministrado: m.observacionesAdministrado,
    })),
    actasValorizacionObra: valorizaciones.map((v) => ({ numeroCorrelativo: v.numeroCorrelativo, estadoObra: v.estadoObra })),
    actasAdicionales: adicionales.map((a) => ({ tipo: a.tipo, numeroCorrelativo: a.numeroCorrelativo, detalle: a.detalle })),
  };
}

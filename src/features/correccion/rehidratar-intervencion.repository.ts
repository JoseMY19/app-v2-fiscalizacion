import type {
  BaseCalculo,
  ModoNotificacion,
  MotivoNoIdentificado,
  OrigenIntervencion,
  OrigenUbicacion,
  TipoActuacion,
} from '@pas-sjl/shared-types';
import { EstadoIntervencion } from '@pas-sjl/shared-types';
import { db, type IntervencionLocal } from '../../lib/db';
import { obtenerFiscalizadorActivo } from '../auth/auth.repository';
import type { BundleIntervencion } from '../sincronizacion/armar-bundle';

/**
 * V-02: puebla Dexie con el bundle que devolvió el servidor — nunca se
 * confía en lo que ya hubiera localmente (pudo purgarse tras sincronizar,
 * HU-26, o este puede ser un dispositivo distinto al que hizo la
 * intervención original). Usa `.put()` (upsert) en las tablas 1:1 y
 * reemplazo completo (delete + bulkAdd) en las N:1 — mismo patrón que ya
 * usan testigos.repository.ts/firmas.repository.ts. Nunca toca
 * fotos/firmas: la evidencia ya subida sigue intacta en el servidor, no
 * se rehidrata evidencia binaria (ver erd-sp1-decisiones.md §2.11).
 */
export async function rehidratarDesdeServidor(bundle: BundleIntervencion): Promise<void> {
  const ahora = new Date().toISOString();

  await db.transaction(
    'rw',
    [
      db.intervenciones,
      db.administrados,
      db.intervencionCuis,
      db.actasExhortacion,
      db.actasFiscalizacion,
      db.notificacionesCargo,
      db.testigos,
      db.actasMedidaProvisional,
      db.actasValorizacionObra,
      db.actasAdicionales,
    ],
    async () => {
      const registro: IntervencionLocal = {
        localId: bundle.id,
        serverId: bundle.id,
        fiscalizadorId: obtenerFiscalizadorActivo() ?? undefined,
        fechaHoraInicio: bundle.fechaHoraInicio,
        latitud: bundle.latitud,
        longitud: bundle.longitud,
        gpsPrecisionM: bundle.gpsPrecisionM,
        origenUbicacion: bundle.origenUbicacion as OrigenUbicacion,
        direccionAproximada: bundle.direccionAproximada,
        origen: bundle.origen as OrigenIntervencion,
        referenciaOrigen: bundle.referenciaOrigen,
        tipoActuacion: bundle.tipoActuacion as TipoActuacion,
        // Refleja la última sincronización real — un access token vencido
        // nunca debe decidir esto (mismo criterio que HU-28).
        estado: EstadoIntervencion.SINCRONIZADO,
        versionLocal: bundle.versionLocal,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      await db.intervenciones.put(registro);

      if (bundle.administrado) {
        await db.administrados.put({
          intervencionLocalId: bundle.id,
          identificado: bundle.administrado.identificado,
          motivoNoIdentificado: bundle.administrado.motivoNoIdentificado as MotivoNoIdentificado | undefined,
          tipoDocumento: bundle.administrado.tipoDocumento,
          numeroDocumento: bundle.administrado.numeroDocumento,
          nombresRazonSocial: bundle.administrado.nombresRazonSocial,
          domicilio: bundle.administrado.domicilio,
          distrito: bundle.administrado.distrito,
          giroUso: bundle.administrado.giroUso,
          numeroLicenciaFuncionamiento: bundle.administrado.numeroLicenciaFuncionamiento,
          actualizadoEn: ahora,
        });
      } else {
        await db.administrados.delete(bundle.id);
      }

      // N:1 — reemplazo completo en vez de diffear, mismo criterio que
      // testigos/firmas: más simple y seguro.
      await db.intervencionCuis.where('intervencionLocalId').equals(bundle.id).delete();
      await db.intervencionCuis.bulkAdd(
        bundle.cuis.map((c) => ({
          intervencionLocalId: bundle.id,
          cuisCodigoId: c.cuisCodigoId,
          cuisEscalaMontoId: c.cuisEscalaMontoId,
          seleccionadoEn: ahora,
        })),
      );

      if (bundle.actaExhortacion) {
        await db.actasExhortacion.put({
          intervencionLocalId: bundle.id,
          numeroCorrelativo: bundle.actaExhortacion.numeroCorrelativo,
          presuntaInfraccion: bundle.actaExhortacion.presuntaInfraccion,
          baseCalculo: bundle.actaExhortacion.baseCalculo as BaseCalculo,
          montoPosibleDeuda: bundle.actaExhortacion.montoPosibleDeuda,
          plazoSubsanacion: bundle.actaExhortacion.plazoSubsanacion,
          observaciones: bundle.actaExhortacion.observaciones,
          creadoEn: ahora,
        });
      } else {
        await db.actasExhortacion.delete(bundle.id);
      }

      if (bundle.actaFiscalizacion) {
        await db.actasFiscalizacion.put({
          intervencionLocalId: bundle.id,
          numeroCorrelativo: bundle.actaFiscalizacion.numeroCorrelativo,
          hechosVerificados: bundle.actaFiscalizacion.hechosVerificados,
          observacionesAdministrado: bundle.actaFiscalizacion.observacionesAdministrado,
          creadoEn: ahora,
        });
      } else {
        await db.actasFiscalizacion.delete(bundle.id);
      }

      if (bundle.notificacionCargo) {
        const nc = bundle.notificacionCargo;
        await db.notificacionesCargo.put({
          intervencionLocalId: bundle.id,
          numeroCorrelativo: nc.numeroCorrelativo,
          baseCalculo: nc.baseCalculo as BaseCalculo,
          montoPasibleMulta: nc.montoPasibleMulta,
          medidaComplementaria: nc.medidaComplementaria,
          fechaDeteccion: nc.fechaDeteccion,
          fechaNotificacion: nc.fechaNotificacion,
          modoNotificacion: nc.modoNotificacion as ModoNotificacion | undefined,
          receptorNombre: nc.receptorNombre,
          receptorDocumento: nc.receptorDocumento,
          receptorRelacion: nc.receptorRelacion,
          seNegoIdentificarse: nc.seNegoIdentificarse,
          seNegoFirmar: nc.seNegoFirmar,
          domicilioPuertas: nc.domicilioPuertas,
          domicilioPisos: nc.domicilioPisos,
          domicilioNumeroSuministro: nc.domicilioNumeroSuministro,
          domicilioObservaciones: nc.domicilioObservaciones,
          creadoEn: ahora,
        });
      } else {
        await db.notificacionesCargo.delete(bundle.id);
      }

      await db.testigos.where('intervencionLocalId').equals(bundle.id).delete();
      await db.testigos.bulkAdd(
        bundle.testigos.map((t) => ({
          intervencionLocalId: bundle.id,
          orden: t.orden,
          nombre: t.nombre,
          documento: t.documento,
        })),
      );

      await db.actasMedidaProvisional.where('intervencionLocalId').equals(bundle.id).delete();
      await db.actasMedidaProvisional.bulkAdd(
        bundle.actasMedidaProvisional.map((m) => ({
          intervencionLocalId: bundle.id,
          ...m,
          tipoMedida: m.tipoMedida as 'CLAUSURA' | 'PARALIZACION',
          creadoEn: ahora,
        })),
      );

      await db.actasValorizacionObra.where('intervencionLocalId').equals(bundle.id).delete();
      await db.actasValorizacionObra.bulkAdd(
        bundle.actasValorizacionObra.map((v) => ({ intervencionLocalId: bundle.id, ...v, creadoEn: ahora })),
      );

      await db.actasAdicionales.where('intervencionLocalId').equals(bundle.id).delete();
      await db.actasAdicionales.bulkAdd(
        bundle.actasAdicionales.map((a) => ({
          intervencionLocalId: bundle.id,
          ...a,
          tipo: a.tipo as 'RETENCION_VEHICULO' | 'DECOMISO',
          creadoEn: ahora,
        })),
      );
    },
  );
}

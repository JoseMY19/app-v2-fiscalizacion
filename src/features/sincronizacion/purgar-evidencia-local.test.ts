import { beforeEach, describe, expect, it } from 'vitest';
import { EstadoIntervencion, OrigenIntervencion, OrigenUbicacion, TipoActuacion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { purgarEvidenciaLocal } from './purgar-evidencia-local';

const INTERVENCION_ID = 'intervencion-de-prueba';

async function crearIntervencionConEvidencia(estado: EstadoIntervencion) {
  await db.intervenciones.put({
    localId: INTERVENCION_ID,
    fechaHoraInicio: new Date().toISOString(),
    origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO,
    origen: OrigenIntervencion.INOPINADA,
    tipoActuacion: TipoActuacion.EXHORTACION,
    estado,
    versionLocal: 1,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  });
  await db.fotos.add({
    intervencionLocalId: INTERVENCION_ID,
    blob: new Blob(['foto']),
    capturadaEn: new Date().toISOString(),
    sincronizada: true,
  });
  await db.firmas.add({
    intervencionLocalId: INTERVENCION_ID,
    rol: 'INSPECTOR',
    blob: new Blob(['firma']),
    capturadaEn: new Date().toISOString(),
    sincronizada: true,
  });
}

describe('purgarEvidenciaLocal — HU-26 (primera función que borra datos permanentemente)', () => {
  beforeEach(async () => {
    await db.intervenciones.clear();
    await db.fotos.clear();
    await db.firmas.clear();
  });

  it('caso feliz: estado SINCRONIZADO borra fotos y firmas locales', async () => {
    await crearIntervencionConEvidencia(EstadoIntervencion.SINCRONIZADO);

    await purgarEvidenciaLocal(INTERVENCION_ID);

    expect(await db.fotos.where('intervencionLocalId').equals(INTERVENCION_ID).count()).toBe(0);
    expect(await db.firmas.where('intervencionLocalId').equals(INTERVENCION_ID).count()).toBe(0);
  });

  it('caso borde: CONFLICTO nunca purga, aunque las fotos ya estén marcadas sincronizada=true', async () => {
    await crearIntervencionConEvidencia(EstadoIntervencion.CONFLICTO);

    await purgarEvidenciaLocal(INTERVENCION_ID);

    expect(await db.fotos.where('intervencionLocalId').equals(INTERVENCION_ID).count()).toBe(1);
    expect(await db.firmas.where('intervencionLocalId').equals(INTERVENCION_ID).count()).toBe(1);
  });

  it('caso borde: PENDIENTE_SYNC (sync a medias) tampoco purga nada', async () => {
    await crearIntervencionConEvidencia(EstadoIntervencion.PENDIENTE_SYNC);

    await purgarEvidenciaLocal(INTERVENCION_ID);

    expect(await db.fotos.where('intervencionLocalId').equals(INTERVENCION_ID).count()).toBe(1);
    expect(await db.firmas.where('intervencionLocalId').equals(INTERVENCION_ID).count()).toBe(1);
  });
});

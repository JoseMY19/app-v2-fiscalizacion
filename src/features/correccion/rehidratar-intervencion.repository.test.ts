import { beforeEach, describe, expect, it } from 'vitest';
import { OrigenIntervencion, OrigenUbicacion, TipoActuacion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { rehidratarDesdeServidor } from './rehidratar-intervencion.repository';
import type { BundleIntervencion } from '../sincronizacion/armar-bundle';

const BUNDLE_BASE: BundleIntervencion = {
  id: 'interv-1',
  deviceId: 'device-1',
  fechaHoraInicio: '2026-01-01T10:00:00.000Z',
  origenUbicacion: OrigenUbicacion.SIN_UBICACION,
  origen: OrigenIntervencion.INOPINADA,
  tipoActuacion: TipoActuacion.INICIA_PAS,
  versionLocal: 1,
  cuis: [{ cuisCodigoId: 'cuis-1' }, { cuisCodigoId: 'cuis-2' }],
  actaFiscalizacion: { numeroCorrelativo: '001-2026', hechosVerificados: 'Se verificó el local.' },
  notificacionCargo: { numeroCorrelativo: '002-2026', baseCalculo: 'UIT_FIJO' as never, fechaDeteccion: '2026-01-01T10:00:00.000Z' },
  testigos: [
    { orden: 1, nombre: 'Juan Pérez', documento: '11111111' },
    { orden: 2, nombre: 'Ana López', documento: '22222222' },
  ],
  actasMedidaProvisional: [],
  actasValorizacionObra: [],
  actasAdicionales: [],
};

describe('rehidratarDesdeServidor — V-02', () => {
  beforeEach(async () => {
    await db.intervenciones.clear();
    await db.administrados.clear();
    await db.intervencionCuis.clear();
    await db.actasFiscalizacion.clear();
    await db.notificacionesCargo.clear();
    await db.testigos.clear();
  });

  it('caso feliz: puebla Dexie con el bundle completo del servidor', async () => {
    await rehidratarDesdeServidor(BUNDLE_BASE);

    const intervencion = await db.intervenciones.get('interv-1');
    expect(intervencion?.tipoActuacion).toBe(TipoActuacion.INICIA_PAS);
    expect(intervencion?.estado).toBe('SINCRONIZADO');

    const cuis = await db.intervencionCuis.where('intervencionLocalId').equals('interv-1').toArray();
    expect(cuis).toHaveLength(2);

    const testigos = await db.testigos.where('intervencionLocalId').equals('interv-1').sortBy('orden');
    expect(testigos.map((t) => t.nombre)).toEqual(['Juan Pérez', 'Ana López']);

    const acta = await db.actasFiscalizacion.get('interv-1');
    expect(acta?.numeroCorrelativo).toBe('001-2026');
  });

  it('caso borde: rehidratar dos veces no duplica las filas N:1 — reemplaza, no acumula', async () => {
    await rehidratarDesdeServidor(BUNDLE_BASE);

    // El servidor ahora devuelve un solo testigo menos y un cuis menos —
    // simula que la corrección anterior quitó datos.
    await rehidratarDesdeServidor({
      ...BUNDLE_BASE,
      cuis: [{ cuisCodigoId: 'cuis-1' }],
      testigos: [{ orden: 1, nombre: 'Juan Pérez', documento: '11111111' }],
    });

    const cuis = await db.intervencionCuis.where('intervencionLocalId').equals('interv-1').toArray();
    expect(cuis).toHaveLength(1);

    const testigos = await db.testigos.where('intervencionLocalId').equals('interv-1').toArray();
    expect(testigos).toHaveLength(1);
  });
});

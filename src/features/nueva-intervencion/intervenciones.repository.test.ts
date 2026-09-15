import { beforeEach, describe, expect, it } from 'vitest';
import { EstadoIntervencion, OrigenIntervencion, OrigenUbicacion, TipoActuacion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import {
  actualizarOrigenIntervencion,
  crearIntervencionConUbicacion,
  finalizarIntervencion,
} from './intervenciones.repository';

describe('actualizarOrigenIntervencion — HU-03', () => {
  beforeEach(async () => {
    await db.intervenciones.clear();
  });

  it('caso feliz: ORDEN_SUPERIOR con referencia se guarda', async () => {
    const localId = await crearIntervencionConUbicacion({
      origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO,
      latitud: -11.98,
      longitud: -77.0,
      gpsPrecisionM: 8,
    });

    await actualizarOrigenIntervencion(localId, OrigenIntervencion.ORDEN_SUPERIOR, 'Memo 123-2026-SGFSA');

    const registro = await db.intervenciones.get(localId);
    expect(registro?.origen).toBe(OrigenIntervencion.ORDEN_SUPERIOR);
    expect(registro?.referenciaOrigen).toBe('Memo 123-2026-SGFSA');
  });

  it('caso feliz: INOPINADA no requiere referencia', async () => {
    const localId = await crearIntervencionConUbicacion({
      origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO,
      latitud: -11.98,
      longitud: -77.0,
      gpsPrecisionM: 8,
    });

    await actualizarOrigenIntervencion(localId, OrigenIntervencion.INOPINADA);

    const registro = await db.intervenciones.get(localId);
    expect(registro?.origen).toBe(OrigenIntervencion.INOPINADA);
    expect(registro?.referenciaOrigen).toBeUndefined();
  });

  it('caso borde: DENUNCIA sin referencia se rechaza (no se puede avanzar)', async () => {
    const localId = await crearIntervencionConUbicacion({
      origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO,
      latitud: -11.98,
      longitud: -77.0,
      gpsPrecisionM: 8,
    });

    await expect(actualizarOrigenIntervencion(localId, OrigenIntervencion.DENUNCIA)).rejects.toThrow(
      /referenciaOrigen es obligatoria/,
    );
  });
});

describe('finalizarIntervencion — HU-15 (no exigir NC/AFM en A/B) y HU-21 (C exige respuesta de notificación)', () => {
  beforeEach(async () => {
    await db.intervenciones.clear();
    await db.notificacionesCargo.clear();
  });

  it('caso feliz: caminos A y B cierran (PENDIENTE_SYNC) sin que exista ninguna acta', async () => {
    const localId = await crearIntervencionConUbicacion({
      origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO,
      latitud: -11.98,
      longitud: -77.0,
      gpsPrecisionM: 8,
    });

    await finalizarIntervencion(localId, TipoActuacion.EXHORTACION);

    const registro = await db.intervenciones.get(localId);
    expect(registro?.estado).toBe(EstadoIntervencion.PENDIENTE_SYNC);
  });

  it('caso borde: camino C se rechaza si HU-21 (¿se entregó en el acto?) todavía no se respondió', async () => {
    const localId = await crearIntervencionConUbicacion({
      origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO,
      latitud: -11.98,
      longitud: -77.0,
      gpsPrecisionM: 8,
    });

    await expect(finalizarIntervencion(localId, TipoActuacion.INICIA_PAS)).rejects.toThrow(/HU-21/);
  });
});

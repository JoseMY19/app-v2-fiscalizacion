import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../lib/db';
import { asegurarEnCola, contarPendientes, registrarIntento } from './sync-cola.repository';

const INTERVENCION_ID = 'intervencion-de-prueba';

describe('contarPendientes — HU-27 (debe contar también los CONFLICTO)', () => {
  beforeEach(async () => {
    await db.colaSincronizacion.clear();
  });

  it('caso borde: una intervención que terminó en conflicto (409) sigue contando como pendiente', async () => {
    // Mismo camino que sincronizar-intervencion.ts toma ante un 409: la
    // fila de la cola se marca ERROR, nunca se limpia (limpiarCola solo
    // corre en el éxito total).
    await asegurarEnCola(INTERVENCION_ID);
    await registrarIntento(INTERVENCION_ID, { exito: false, detalleError: 'Correlativo duplicado.' });

    expect(await contarPendientes()).toBe(1);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../lib/db';
import { agregarCuisSeleccionado, listarCuisSeleccionados, quitarCuisSeleccionado } from './intervencion-cuis.repository';

const INTERVENCION_ID = 'intervencion-de-prueba';

describe('intervencion-cuis.repository — HU-07 (seleccionar más de un código)', () => {
  beforeEach(async () => {
    await db.intervencionCuis.clear();
  });

  it('caso feliz: permite agregar más de un código a la misma intervención', async () => {
    await agregarCuisSeleccionado(INTERVENCION_ID, 'cuis-1', 'escala-1');
    await agregarCuisSeleccionado(INTERVENCION_ID, 'cuis-2', 'escala-2');

    const seleccionados = await listarCuisSeleccionados(INTERVENCION_ID);
    expect(seleccionados).toHaveLength(2);
    expect(seleccionados.map((s) => s.cuisCodigoId)).toEqual(['cuis-1', 'cuis-2']);
  });

  it('caso borde: quitar un código seleccionado no afecta a los demás ni a otra intervención', async () => {
    const id1 = await agregarCuisSeleccionado(INTERVENCION_ID, 'cuis-1', 'escala-1');
    await agregarCuisSeleccionado(INTERVENCION_ID, 'cuis-2', 'escala-2');
    await agregarCuisSeleccionado('otra-intervencion', 'cuis-1', 'escala-1');

    await quitarCuisSeleccionado(id1);

    const seleccionados = await listarCuisSeleccionados(INTERVENCION_ID);
    expect(seleccionados.map((s) => s.cuisCodigoId)).toEqual(['cuis-2']);

    const otra = await listarCuisSeleccionados('otra-intervencion');
    expect(otra).toHaveLength(1);
  });
});

import { describe, expect, it } from 'vitest';
import { TipoActuacion } from '@pas-sjl/shared-types';
import { calcularFaltantes } from './calcularFaltantes';

const BASE = {
  totalCuisSeleccionados: 1,
  tieneActaExhortacion: false,
  tieneActaFiscalizacion: false,
  tieneNotificacionCargo: false,
  tieneRespuestaEntregaNc: true,
  totalFotos: 1,
  tieneFirmaInspector: true,
};

describe('calcularFaltantes — HU-19 (lo obligatorio depende del camino)', () => {
  it('caso feliz: camino A completo (con acta de exhortación) no tiene faltantes', () => {
    expect(
      calcularFaltantes({ ...BASE, tipoActuacion: TipoActuacion.EXHORTACION, tieneActaExhortacion: true }),
    ).toEqual([]);
  });

  it('caso borde: camino A NUNCA exige AFM ni NC, aunque falten', () => {
    const faltantes = calcularFaltantes({
      ...BASE,
      tipoActuacion: TipoActuacion.EXHORTACION,
      tieneActaExhortacion: true,
    });
    expect(faltantes.map((f) => f.seccion)).not.toContain('acta-fiscalizacion');
    expect(faltantes.map((f) => f.seccion)).not.toContain('notificacion-cargo');
  });

  it('caso borde: camino C exige AFM y NC; si faltan ambas, las reporta', () => {
    const faltantes = calcularFaltantes({ ...BASE, tipoActuacion: TipoActuacion.INICIA_PAS });
    expect(faltantes.map((f) => f.seccion)).toEqual(
      expect.arrayContaining(['acta-fiscalizacion', 'notificacion-cargo']),
    );
  });

  it('caso borde: fotos y firma son obligatorias sin importar el camino', () => {
    const faltantes = calcularFaltantes({
      ...BASE,
      tipoActuacion: TipoActuacion.EXHORTACION,
      tieneActaExhortacion: true,
      totalFotos: 0,
      tieneFirmaInspector: false,
    });
    expect(faltantes.map((f) => f.seccion)).toEqual(expect.arrayContaining(['fotos', 'firma']));
  });

  it('caso borde (V-02): con omitirEvidencia, fotos y firma faltantes no bloquean — el resto de reglas sigue aplicando', () => {
    const faltantes = calcularFaltantes({
      ...BASE,
      tipoActuacion: TipoActuacion.INICIA_PAS,
      totalFotos: 0,
      tieneFirmaInspector: false,
      omitirEvidencia: true,
    });
    expect(faltantes.map((f) => f.seccion)).not.toContain('fotos');
    expect(faltantes.map((f) => f.seccion)).not.toContain('firma');
    // El resto de reglas de HU-19 sigue vigente — omitirEvidencia no las apaga todas.
    expect(faltantes.map((f) => f.seccion)).toEqual(
      expect.arrayContaining(['acta-fiscalizacion', 'notificacion-cargo']),
    );
  });
});

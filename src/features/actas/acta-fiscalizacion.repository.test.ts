import { describe, expect, it } from 'vitest';
import { validarHechosVerificados } from './acta-fiscalizacion.repository';

describe('validarHechosVerificados — HU-12', () => {
  it('caso feliz: texto con contenido real pasa', () => {
    expect(validarHechosVerificados('Se verificó acumulación de residuos sólidos en la vía pública frente al predio.')).toBeNull();
  });

  it('caso borde: texto corto se rechaza, para no dejar pasar actas vacías', () => {
    expect(validarHechosVerificados('ok')).toMatch(/al menos/);
  });
});

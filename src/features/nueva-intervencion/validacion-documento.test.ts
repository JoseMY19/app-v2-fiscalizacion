import { describe, expect, it } from 'vitest';
import { validarNumeroDocumento } from './validacion-documento';

describe('validarNumeroDocumento — HU-04', () => {
  it('caso feliz: DNI de 8 dígitos es válido', () => {
    expect(validarNumeroDocumento('DNI', '45678912')).toBeNull();
  });

  it('caso feliz: RUC con dígito verificador correcto es válido', () => {
    // RUC real de ejemplo con checksum módulo 11 válido (persona jurídica MEF).
    expect(validarNumeroDocumento('RUC', '20131312955')).toBeNull();
  });

  it('caso borde: DNI con longitud incorrecta se rechaza', () => {
    expect(validarNumeroDocumento('DNI', '123')).toMatch(/8 dígitos/);
  });

  it('caso borde: RUC con dígito verificador incorrecto se rechaza', () => {
    expect(validarNumeroDocumento('RUC', '20131312954')).toMatch(/dígito verificador/);
  });

  it('caso borde: documento vacío nunca es válido, sin importar el tipo', () => {
    expect(validarNumeroDocumento('OTRO', '   ')).toMatch(/obligatorio/);
  });
});

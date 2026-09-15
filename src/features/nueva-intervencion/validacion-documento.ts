/**
 * HU-04: "Validación de formato de DNI/RUC (longitud y dígito verificador
 * básico)". El RUC tiene un algoritmo de dígito verificador público
 * (módulo 11, usado por SUNAT). El DNI peruano NO tiene un dígito
 * verificador de conocimiento público para el número de 8 dígitos que se
 * captura acá — solo se valida longitud y que sea numérico. No se inventa
 * un checksum para el DNI que no existe.
 */

export type TipoDocumentoAdministrado = 'DNI' | 'RUC' | 'OTRO';

function validarDni(numero: string): string | null {
  if (!/^\d{8}$/.test(numero)) {
    return 'El DNI debe tener exactamente 8 dígitos numéricos.';
  }
  return null;
}

function validarRuc(numero: string): string | null {
  if (!/^\d{11}$/.test(numero)) {
    return 'El RUC debe tener exactamente 11 dígitos numéricos.';
  }
  const digitos = numero.split('').map(Number);
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = factores.reduce((acc, factor, i) => acc + factor * digitos[i], 0);
  const resto = 11 - (suma % 11);
  const digitoVerificador = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  if (digitoVerificador !== digitos[10]) {
    return 'El RUC no pasa la validación de dígito verificador.';
  }
  return null;
}

export function validarNumeroDocumento(tipo: TipoDocumentoAdministrado, numero: string): string | null {
  const limpio = numero.trim();
  if (!limpio) return 'El número de documento es obligatorio.';
  if (tipo === 'DNI') return validarDni(limpio);
  if (tipo === 'RUC') return validarRuc(limpio);
  return null; // OTRO: sin formato conocido, solo se exige que no esté vacío
}

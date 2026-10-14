import { createWorker } from 'tesseract.js';

/**
 * Modo "sin internet" del escaneo de actas físicas — corre 100% en el
 * celular (nunca sale a la red), mucho menos preciso que el modo en la
 * nube. Igual que el modo online, esto SOLO sugiere: el fiscalizador
 * revisa y confirma cada campo en el formulario, nunca se guarda un
 * valor sin que él lo haya visto (ver módulo ocr/ del backend).
 *
 * Cubre TODOS los campos capturables de cada pantalla (no solo el texto
 * libre) porque el formato físico y el digital tienen el mismo
 * contenido — mismo criterio que apps/backend/.../extraccion-por-anclas.ts,
 * mantener ambos sincronizados si se agrega un campo nuevo.
 */
export type DatosOcrActa = Record<string, string>;

interface AnclaCampo {
  campo: string;
  anclas: string[];
  /** La ancla también aparece en un párrafo impreso anterior: usar la ÚLTIMA aparición. */
  ultima?: boolean;
}

const ANCLAS_POR_TIPO: Record<string, AnclaCampo[]> = {
  FISCALIZACION: [
    { campo: 'hechosVerificados', anclas: ['materia de fiscalizacion municipal', 'hechos verificados'] },
    { campo: 'observacionesAdministrado', anclas: ['siguientes observaciones', 'observaciones formuladas', 'observaciones'] },
  ],
  EXHORTACION: [
    { campo: 'presuntaInfraccion', anclas: ['presunta infraccion administrativa'], ultima: true },
    { campo: 'plazoSubsanacion', anclas: ['se le otorga un plazo de'] },
    { campo: 'observaciones', anclas: ['observaciones adicionales', 'observaciones a subsanar', 'observaciones'], ultima: true },
  ],
  MEDIDA_PROVISIONAL: [
    { campo: 'observacionesAdministrado', anclas: ['siguientes observaciones', 'formulado por el administrado', 'observaciones'] },
    { campo: 'lugarEjecucion', anclas: ['dispuesta en calle', 'dispuesta en'] },
    { campo: 'descripcion', anclas: ['ejecucion de la medida provisional de', 'medida provisional de'] },
  ],
};

/** Texto impreso del formato que marca el fin de lo manuscrito (sin tildes, en minúsculas). */
const FRASES_DE_CORTE = [
  'al respecto y segun',
  'de conformidad con',
  'se emite la notificacion',
  'siendo las',
  'seguidamente',
  'vencido dicho plazo',
  'el cumplimiento de la presente',
  'firmando el presente',
  'inspector municipal',
  'administrado/representante',
  'se nego a',
  'nota:',
  'observaciones a subsanar',
  'codigo infraccion',
  'monto posible',
  'medido provisional',
  'razon social',
  'giro/uso',
  'por la infraccion con codigo',
  'formulado por el administrado',
  'dispuesta en',
  'se le otorga',
];

const LARGO_MAXIMO_VALOR = 500;

/**
 * Minúsculas y sin tildes, pero SIEMPRE con el mismo largo que el original:
 * así las posiciones del texto normalizado sirven para cortar el original.
 */
function normalizar(texto: string): string {
  let salida = '';
  for (const c of texto) {
    const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    salida += base.length === 1 ? base : (base[0] ?? ' ');
  }
  return salida;
}

/** Quita el ruido típico del OCR sobre las rayas de llenar (____, ....) y junta las líneas. */
function limpiarValor(crudo: string): string {
  return crudo
    .replace(/[_|]{2,}/g, ' ')
    .replace(/\.{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:.\-,;/]+/, '')
    .replace(/[\s_|]+$/, '')
    .trim();
}

function extraerTrasAncla(textoNormalizado: string, textoOriginal: string, ancla: string, ultima = false): string | null {
  const idx = ultima ? textoNormalizado.lastIndexOf(ancla) : textoNormalizado.indexOf(ancla);
  if (idx === -1) return null;
  const inicio = idx + ancla.length;

  let fin = Math.min(textoOriginal.length, inicio + LARGO_MAXIMO_VALOR);
  for (const frase of FRASES_DE_CORTE) {
    const pos = textoNormalizado.indexOf(frase, inicio);
    if (pos !== -1 && pos < fin) fin = pos;
  }

  const valor = limpiarValor(textoOriginal.slice(inicio, fin));
  // Solo rayas, signos o ruido: no hay nada escrito a mano.
  return valor.replace(/[^\p{L}\p{N}]/gu, '').length >= 3 ? valor : null;
}

/**
 * El correlativo se imprime como "N° 00_____" — "00" es texto fijo de la
 * plantilla (el OCR lo lee a veces como "OO"), lo que sigue es lo escrito a
 * mano. Los dígitos son mucho más confiables para OCR que la letra cursiva.
 */
function extraerNumeroCorrelativo(textoOriginal: string): string | null {
  const m = textoOriginal.match(/N[°ºo.\s]{0,3}[0O]{2}\s*[-\s]?(\d{2,})/i);
  return m ? m[1] : null;
}

function extraerTipoMedida(textoNormalizado: string): string | null {
  if (textoNormalizado.includes('clausura')) return 'CLAUSURA';
  if (textoNormalizado.includes('paralizacion')) return 'PARALIZACION';
  return null;
}

function extraerCamposEspeciales(tipoActa: string, textoOriginal: string, textoNormalizado: string): DatosOcrActa {
  const especiales: DatosOcrActa = {};
  const correlativo = extraerNumeroCorrelativo(textoOriginal);
  if (correlativo) especiales.numeroCorrelativo = correlativo;

  if (tipoActa === 'MEDIDA_PROVISIONAL') {
    const tipoMedida = extraerTipoMedida(textoNormalizado);
    if (tipoMedida) especiales.tipoMedida = tipoMedida;
  }
  return especiales;
}

export async function escanearActaSinConexion(tipoActa: string, imagen: File): Promise<DatosOcrActa> {
  const worker = await createWorker('spa');
  try {
    const {
      data: { text },
    } = await worker.recognize(imagen);
    const textoNormalizado = normalizar(text);

    const anclas = ANCLAS_POR_TIPO[tipoActa] ?? [];
    const datos: DatosOcrActa = { ...extraerCamposEspeciales(tipoActa, text, textoNormalizado) };
    for (const { campo, anclas: posiblesAnclas, ultima } of anclas) {
      for (const ancla of posiblesAnclas) {
        const valor = extraerTrasAncla(textoNormalizado, text, normalizar(ancla), ultima);
        if (valor) {
          datos[campo] = valor;
          break;
        }
      }
    }
    return datos;
  } finally {
    await worker.terminate();
  }
}

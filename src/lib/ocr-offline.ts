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
  /** Frases que pueden preceder al valor buscado, en orden de preferencia. */
  anclas: string[];
}

const ANCLAS_POR_TIPO: Record<string, AnclaCampo[]> = {
  FISCALIZACION: [
    { campo: 'hechosVerificados', anclas: ['materia de fiscalizacion municipal', 'hechos verificados', 'hechos'] },
    { campo: 'observacionesAdministrado', anclas: ['siguientes observaciones', 'observaciones formuladas', 'observaciones'] },
  ],
  EXHORTACION: [
    { campo: 'presuntaInfraccion', anclas: ['presunta infraccion administrativa', 'infraccion'] },
    { campo: 'plazoSubsanacion', anclas: ['se le otorga un plazo de', 'plazo de'] },
    { campo: 'observaciones', anclas: ['observaciones adicionales', 'observaciones'] },
  ],
  MEDIDA_PROVISIONAL: [
    { campo: 'observacionesAdministrado', anclas: ['siguientes observaciones', 'formulado por el administrado', 'observaciones'] },
    { campo: 'lugarEjecucion', anclas: ['dispuesta en calle', 'dispuesta en'] },
    { campo: 'descripcion', anclas: ['ejecucion de la medida provisional de', 'medida provisional de'] },
  ],
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Corte muy simple: busca el ancla y devuelve el resto de la línea/párrafo
 * siguiente (hasta el próximo salto de línea doble o 200 caracteres) —
 * no intenta segmentar por columnas ni tablas, el texto plano de
 * Tesseract no trae esa estructura.
 */
function extraerTrasAncla(textoNormalizado: string, textoOriginal: string, ancla: string): string | null {
  const idx = textoNormalizado.indexOf(ancla);
  if (idx === -1) return null;
  const inicio = idx + ancla.length;
  const resto = textoOriginal.slice(inicio, inicio + 200);
  const corte = resto.search(/\n\s*\n/);
  const extraido = (corte >= 0 ? resto.slice(0, corte) : resto).replace(/^[:\s]+/, '').trim();
  return extraido.length >= 3 ? extraido : null;
}

/**
 * El correlativo se imprime como "N° 00_____" — "00" es texto fijo de la
 * plantilla, lo que sigue es lo escrito a mano. Los dígitos son mucho más
 * confiables para OCR que la letra cursiva, vale la pena intentarlo.
 */
function extraerNumeroCorrelativo(textoOriginal: string): string | null {
  const m = textoOriginal.match(/N[°ºo\.]{0,2}\s*00\s*[-\s]?(\d{2,})/i);
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
    for (const { campo, anclas: posiblesAnclas } of anclas) {
      for (const ancla of posiblesAnclas) {
        const valor = extraerTrasAncla(textoNormalizado, text, normalizar(ancla));
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

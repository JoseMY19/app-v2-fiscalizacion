/**
 * Prepara la foto del acta antes de leerla (nube o sin conexión): una foto de
 * celular pesa varios MB y OCR.space solo acepta 1 MB, además Tesseract tarda
 * mucho con imágenes de 12 megapíxeles. Se reduce el tamaño, se pasa a escala
 * de grises y se estira el contraste (el papel queda más blanco y la tinta más
 * oscura), que es lo que más ayuda a leer letra manuscrita.
 * Si algo falla se devuelve la foto original: el escaneo nunca se bloquea por esto.
 */
const LADO_MAXIMO_PX = 1800;
const PESO_MAXIMO_BYTES = 950 * 1024;
const CALIDADES = [0.85, 0.75, 0.65, 0.5];

function aBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolver) => canvas.toBlob(resolver, 'image/jpeg', calidad));
}

/** Estira el contraste usando los percentiles 2 y 98 del brillo, y deja la imagen en grises. */
function mejorarContraste(datos: ImageData): void {
  const px = datos.data;
  const histograma = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const gris = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    histograma[Math.round(gris)]++;
  }
  const total = px.length / 4;
  let acumulado = 0;
  let bajo = 0;
  let alto = 255;
  for (let n = 0; n < 256; n++) {
    acumulado += histograma[n];
    if (acumulado >= total * 0.02) {
      bajo = n;
      break;
    }
  }
  acumulado = 0;
  for (let n = 255; n >= 0; n--) {
    acumulado += histograma[n];
    if (acumulado >= total * 0.02) {
      alto = n;
      break;
    }
  }
  if (alto - bajo < 40) return; // foto casi uniforme: estirar solo amplificaría ruido
  const escala = 255 / (alto - bajo);
  for (let i = 0; i < px.length; i += 4) {
    const gris = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    const nuevo = Math.max(0, Math.min(255, (gris - bajo) * escala));
    px[i] = px[i + 1] = px[i + 2] = nuevo;
  }
}

export async function prepararImagenParaOcr(imagen: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(imagen, { imageOrientation: 'from-image' });
    const factor = Math.min(1, LADO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * factor);
    const alto = Math.round(bitmap.height * factor);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return imagen;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const datos = ctx.getImageData(0, 0, ancho, alto);
    mejorarContraste(datos);
    ctx.putImageData(datos, 0, 0);

    let ultimo: Blob | null = null;
    for (const calidad of CALIDADES) {
      const blob = await aBlob(canvas, calidad);
      if (!blob) continue;
      ultimo = blob;
      if (blob.size <= PESO_MAXIMO_BYTES) break;
    }
    if (!ultimo) return imagen;
    return new File([ultimo], 'acta.jpg', { type: 'image/jpeg' });
  } catch {
    return imagen;
  }
}

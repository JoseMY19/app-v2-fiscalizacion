/**
 * HT-03 del backlog — requisito duro de HU-17: "Comprimir imágenes en el
 * cliente antes de persistir (lado mayor ~1600px, calidad ~70%) — nunca
 * guardar la foto original". Canvas API nativo, sin dependencia nueva
 * (decidido explícitamente en la sesión de implementación de HU-17/18/19).
 */
const LADO_MAYOR_PX = 1600;
const CALIDAD_JPEG = 0.7;

export async function comprimirImagen(archivo: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  try {
    const escala = Math.min(1, LADO_MAYOR_PX / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener contexto 2D del canvas.');
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
        'image/jpeg',
        CALIDAD_JPEG,
      );
    });
  } finally {
    bitmap.close();
  }
}

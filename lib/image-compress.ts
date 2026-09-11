/**
 * Achica una foto en el navegador antes de guardarla: una foto de celular pesa
 * varios MB y en la BD cada una ocuparía eso por triplicado (base64 + cada
 * guardado). Queda un JPEG de hasta `ladoMax` px, unos 200–300 KB.
 *
 * Si el navegador no puede decodificar la imagen, devuelve el original tal cual.
 */
export async function comprimirImagen(
  origen: File | string,
  ladoMax = 1600,
  calidad = 0.8
): Promise<string> {
  try {
    const blob = typeof origen === 'string' ? await (await fetch(origen)).blob() : origen
    // createImageBitmap ya respeta la orientación EXIF de las fotos de celular.
    const bitmap = await createImageBitmap(blob)
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height))
    const ancho = Math.round(bitmap.width * escala)
    const alto = Math.round(bitmap.height * escala)

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D no disponible')

    // JPEG no tiene transparencia: un PNG transparente quedaría con fondo negro.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ancho, alto)
    ctx.drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close()

    return canvas.toDataURL('image/jpeg', calidad)
  } catch (err) {
    console.error('No se pudo comprimir la imagen, se usa la original:', err)
    return typeof origen === 'string' ? origen : leerComoDataUrl(origen)
  }
}

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

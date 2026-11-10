/**
 * Compresor de imágenes en el navegador usando Canvas API.
 * Reduce la imagen a un máximo de ~400px manteniendo la proporción y optimiza a JPEG.
 */

/**
 * Comprime un archivo de imagen (File o Blob) y retorna la representación en base64 pura y un Blob.
 * @param {File|Blob} file - Archivo de imagen seleccionado
 * @param {number} [maxDimension=400] - Dimensión máxima en px (ancho o alto)
 * @param {number} [quality=0.82] - Calidad JPEG (0.0 a 1.0)
 * @returns {Promise<{ base64: string, dataUrl: string, blob: Blob, width: number, height: number }>}
 */
export function comprimirImagen(file, maxDimension = 400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al decodificar la imagen.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fondo blanco para evitar fondos negros si era PNG transparente
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];

        canvas.toBlob(
          (blob) => {
            resolve({
              base64,
              dataUrl,
              blob,
              width,
              height
            });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime la imagen en el cliente (~400px) y la sube directamente a ImgBB.
 * Retorna la URL pública de la imagen alojada.
 */
export async function subirImagenAImgBB(file, apiKey = 'de156003ee6bfd775741f8fa28eefb97') {
  const comprimida = await comprimirImagen(file, 400, 0.82);
  const formData = new FormData();
  formData.append('key', apiKey);
  formData.append('image', comprimida.base64);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (json.success && json.data && json.data.url) {
    return json.data.url;
  } else {
    throw new Error(json.error?.message || 'Error al subir imagen a ImgBB');
  }
}

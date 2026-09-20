import { encode } from 'blurhash';

/**
 * Generates a Blurhash string for an Image File client-side before uploading
 * Resizes image onto a small hidden canvas (32x32) to compute fast, lightweight blurhash
 */
export async function generateBlurhashFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    // If not an image, resolve empty
    if (!file.type.startsWith('image/')) {
      resolve('');
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const width = 32;
        const height = 32;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve('');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        // Encode 4x4 components for smooth preview
        const blurhash = encode(imageData.data, imageData.width, imageData.height, 4, 4);

        URL.revokeObjectURL(objectUrl);
        resolve(blurhash);
      } catch (e) {
        console.warn('Blurhash encoding fallback:', e);
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    img.src = objectUrl;
  });
}

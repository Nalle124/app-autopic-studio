/**
 * Compress an image to JPEG format with quality control
 * Handles data URLs, Blobs, and Files
 */
export async function compressImage(
  imageSource: string | Blob | File,
  maxWidth: number = 4096,
  maxHeight: number = 4096,
  quality: number = 0.95
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Calculate scaled dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      // Create canvas for compression
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw and compress to JPEG
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          // Also create data URL for preview
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              blob,
              dataUrl: reader.result as string
            });
          };
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Handle different input types
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const url = URL.createObjectURL(imageSource);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        img.onload!({} as Event);
      };
    }
  });
}

/**
 * Convert a data URL to a compressed JPEG blob
 */
export async function dataUrlToCompressedBlob(
  dataUrl: string,
  quality: number = 0.85
): Promise<Blob> {
  const { blob } = await compressImage(dataUrl, 2048, 2048, quality);
  return blob;
}

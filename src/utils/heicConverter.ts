import heic2any from 'heic2any';

/**
 * Supported image MIME types for upload
 */
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml'
];

/**
 * Supported file extensions (fallback when MIME type is not set)
 */
const SUPPORTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', 
  '.gif', '.bmp', '.tiff', '.tif', '.svg'
];

/**
 * Check if a file is HEIC/HEIF format
 */
export const isHeicFile = (file: File): boolean => {
  const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  const heicExtensions = ['.heic', '.heif'];
  
  // Check MIME type
  if (heicTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  
  // Check file extension (fallback for when MIME type is not set correctly)
  const fileName = file.name.toLowerCase();
  return heicExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Check if a file is a supported image format
 */
export const isSupportedImageFormat = (file: File): boolean => {
  // Check MIME type first
  if (file.type && SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  
  // Fallback to extension check (some browsers don't set MIME type correctly)
  const fileName = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext));
};

/**
 * Formats that need to be converted before sending to API
 * (API only accepts JPEG, PNG, WebP)
 */
const FORMATS_NEEDING_CONVERSION = [
  'image/gif',
  'image/bmp', 
  'image/tiff',
  'image/svg+xml'
];

const EXTENSIONS_NEEDING_CONVERSION = ['.gif', '.bmp', '.tiff', '.tif', '.svg'];

/**
 * Check if a file needs format conversion for API compatibility
 */
export const needsFormatConversion = (file: File): boolean => {
  // HEIC is handled separately
  if (isHeicFile(file)) {
    return false;
  }
  
  // Check MIME type
  if (file.type && FORMATS_NEEDING_CONVERSION.includes(file.type.toLowerCase())) {
    return true;
  }
  
  // Check extension
  const fileName = file.name.toLowerCase();
  return EXTENSIONS_NEEDING_CONVERSION.some(ext => fileName.endsWith(ext));
};

/**
 * Convert image to JPEG using canvas
 * Works for GIF, BMP, TIFF, SVG -> JPEG
 */
export const convertToJpeg = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas context not available'));
          return;
        }
        
        // White background for transparent images (GIF, PNG with alpha)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            
            if (!blob) {
              reject(new Error('Failed to convert image'));
              return;
            }
            
            // Create new file with .jpg extension
            const baseName = file.name.replace(/\.[^.]+$/, '');
            const newFileName = `${baseName}.jpg`;
            const convertedFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log(`Converted ${file.name} -> ${newFileName} (${(convertedFile.size / 1024 / 1024).toFixed(2)}MB)`);
            resolve(convertedFile);
          },
          'image/jpeg',
          0.92
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    
    img.src = url;
  });
};

/**
 * Convert HEIC/HEIF image to JPEG
 * Returns original file if not HEIC or if conversion fails
 */
export const convertHeicToJpeg = async (file: File): Promise<File> => {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    console.log(`Converting HEIC file: ${file.name}`);
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92
    });

    // heic2any can return array or single blob
    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    // Create new file with .jpg extension
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    const convertedFile = new File([resultBlob], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });

    console.log(`HEIC conversion complete: ${file.name} -> ${newFileName} (${(convertedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error(`Kunde inte konvertera HEIC-bild: ${file.name}. Försök exportera bilden som JPEG från din telefon.`);
  }
};

/**
 * Ensure file is in API-compatible format (JPEG, PNG, WebP)
 * Converts HEIC, GIF, BMP, TIFF, SVG to JPEG
 */
export const ensureApiCompatibleFormat = async (file: File): Promise<File> => {
  // HEIC handled separately with heic2any library
  if (isHeicFile(file)) {
    return convertHeicToJpeg(file);
  }
  
  // Other formats converted with canvas
  if (needsFormatConversion(file)) {
    return convertToJpeg(file);
  }
  
  // Already compatible
  return file;
};

/**
 * Process multiple files and convert any HEIC files to JPEG
 */
export const convertHeicFiles = async (files: File[]): Promise<File[]> => {
  const results: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const converted = await convertHeicToJpeg(file);
      results.push(converted);
    } catch (error: any) {
      errors.push(error.message || `Fel vid konvertering av ${file.name}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return results;
};

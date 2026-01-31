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

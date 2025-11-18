import { CarAdjustments } from '@/types/scene';

/**
 * Apply car-specific adjustments (brightness, contrast, warmth, shadows) to a segmented car image
 * This function only affects the car, not the background
 */
export const applyCarAdjustments = (
  imageUrl: string,
  adjustments: CarAdjustments
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate adjustment factors
      const brightnessFactor = 1 + (adjustments.brightness / 100);
      const contrastFactor = (adjustments.contrast + 100) / 100;
      const warmthFactor = adjustments.warmth / 100;
      const shadowsFactor = adjustments.shadows / 100;
      
      // Apply adjustments pixel by pixel (only to non-transparent pixels)
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        
        // Only adjust pixels that are part of the car (have alpha > 0)
        if (alpha > 0) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          
          // Apply brightness
          r *= brightnessFactor;
          g *= brightnessFactor;
          b *= brightnessFactor;
          
          // Apply contrast (around midpoint 128)
          r = ((r - 128) * contrastFactor) + 128;
          g = ((g - 128) * contrastFactor) + 128;
          b = ((b - 128) * contrastFactor) + 128;
          
          // Apply warmth (shift towards orange/blue)
          if (warmthFactor > 0) {
            // Warmer - add red/yellow, reduce blue
            r += warmthFactor * 30;
            g += warmthFactor * 15;
            b -= warmthFactor * 20;
          } else if (warmthFactor < 0) {
            // Cooler - add blue, reduce red/yellow
            r += warmthFactor * 20;
            g += warmthFactor * 10;
            b -= warmthFactor * 30;
          }
          
          // Apply shadows (crush or lift blacks)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luminance < 128) {
            // This is a darker pixel
            const shadowAdjustment = shadowsFactor * (128 - luminance) / 128;
            r += shadowAdjustment * 50;
            g += shadowAdjustment * 50;
            b += shadowAdjustment * 50;
          }
          
          // Clamp values
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }
      }
      
      // Put adjusted image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to data URL
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

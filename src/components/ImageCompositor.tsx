import { useEffect, useRef } from 'react';
import { SceneMetadata } from '@/types/scene';

interface ImageCompositorProps {
  segmentedImageUrl: string;
  scene: SceneMetadata;
  onCompositionComplete: (dataUrl: string) => void;
}

export const ImageCompositor = ({
  segmentedImageUrl,
  scene,
  onCompositionComplete,
}: ImageCompositorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const composeImage = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match scene (2048x2048)
      canvas.width = 2048;
      canvas.height = 2048;

      try {
        // Load background image - convert to absolute URL
        const bgImage = new Image();
        bgImage.crossOrigin = 'anonymous';
        
        // Create absolute URL for local assets
        const absoluteBgUrl = scene.fullResUrl.startsWith('http') 
          ? scene.fullResUrl 
          : new URL(scene.fullResUrl, window.location.origin).href;
        
        console.log('Loading background from:', absoluteBgUrl);
        
        await new Promise((resolve, reject) => {
          bgImage.onload = () => {
            console.log('Background loaded successfully');
            resolve(true);
          };
          bgImage.onerror = (e) => {
            console.error('Failed to load background:', e);
            reject(e);
          };
          bgImage.src = absoluteBgUrl;
        });

        // Draw background
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // Load segmented car image
        const carImage = new Image();
        carImage.crossOrigin = 'anonymous';
        
        console.log('Loading car from:', segmentedImageUrl);
        
        await new Promise((resolve, reject) => {
          carImage.onload = () => {
            console.log('Car loaded successfully, dimensions:', carImage.width, 'x', carImage.height);
            resolve(true);
          };
          carImage.onerror = (e) => {
            console.error('Failed to load car:', e);
            reject(e);
          };
          carImage.src = segmentedImageUrl;
        });

        // Calculate car positioning
        const baselineY = (scene.baselineY / 100) * canvas.height;
        const scale = scene.defaultScale;
        
        // Calculate scaled dimensions maintaining aspect ratio
        const scaledWidth = carImage.width * scale;
        const scaledHeight = carImage.height * scale;
        
        // Center horizontally, position vertically at baseline
        const carX = (canvas.width - scaledWidth) / 2;
        const carY = baselineY - scaledHeight;

        // Draw shadow if enabled
        if (scene.shadowPreset.enabled) {
          ctx.save();
          
          // Create natural soft shadow with gradient
          const shadowY = baselineY + scene.shadowPreset.offsetY;
          const shadowX = carX + (scaledWidth / 2) + scene.shadowPreset.offsetX;
          const shadowWidth = scaledWidth * 0.9;
          const shadowHeight = scaledHeight * 0.05; // Very thin, natural
          
          // Create gradient for soft edges
          const gradient = ctx.createRadialGradient(
            shadowX, shadowY, 0,
            shadowX, shadowY, shadowWidth / 2
          );
          gradient.addColorStop(0, `rgba(0, 0, 0, ${scene.shadowPreset.strength})`);
          gradient.addColorStop(0.7, `rgba(0, 0, 0, ${scene.shadowPreset.strength * 0.3})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.filter = `blur(${scene.shadowPreset.blur}px)`;
          
          ctx.beginPath();
          ctx.ellipse(
            shadowX,
            shadowY,
            shadowWidth / 2,
            shadowHeight / 2,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        }

        // Draw car
        ctx.drawImage(
          carImage,
          carX,
          carY,
          scaledWidth,
          scaledHeight
        );

        // Draw reflection if enabled
        if (scene.reflectionPreset.enabled) {
          ctx.save();
          
          // Create a temporary canvas for the reflection
          const reflectionCanvas = document.createElement('canvas');
          reflectionCanvas.width = scaledWidth;
          reflectionCanvas.height = scaledHeight;
          const reflCtx = reflectionCanvas.getContext('2d');
          
          if (reflCtx) {
            // Draw flipped car
            reflCtx.translate(0, scaledHeight);
            reflCtx.scale(1, -1);
            reflCtx.drawImage(carImage, 0, 0, scaledWidth, scaledHeight);
            
            // Apply gradient fade
            const gradient = reflCtx.createLinearGradient(0, 0, 0, scaledHeight * scene.reflectionPreset.fade);
            gradient.addColorStop(0, `rgba(0,0,0,${1 - scene.reflectionPreset.opacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,1)');
            
            reflCtx.globalCompositeOperation = 'destination-out';
            reflCtx.fillStyle = gradient;
            reflCtx.fillRect(0, 0, scaledWidth, scaledHeight);
            
            // Draw the reflection on main canvas
            ctx.globalAlpha = scene.reflectionPreset.opacity;
            ctx.drawImage(
              reflectionCanvas,
              carX,
              baselineY,
              scaledWidth,
              scaledHeight
            );
          }
          
          ctx.restore();
        }

        // Convert to data URL and callback
        console.log('Composition complete, converting to data URL');
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        console.log('Data URL created, length:', dataUrl.length);
        onCompositionComplete(dataUrl);
      } catch (error) {
        console.error('Error composing image:', error);
      }
    };

    composeImage();
  }, [segmentedImageUrl, scene, onCompositionComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
};

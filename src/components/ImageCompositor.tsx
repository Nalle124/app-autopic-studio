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
        // Load background image
        const bgImage = new Image();
        bgImage.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          bgImage.onload = resolve;
          bgImage.onerror = reject;
          bgImage.src = scene.fullResUrl;
        });

        // Draw background
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // Load segmented car image
        const carImage = new Image();
        carImage.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          carImage.onload = resolve;
          carImage.onerror = reject;
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
          ctx.globalAlpha = scene.shadowPreset.strength;
          ctx.filter = `blur(${scene.shadowPreset.blur}px)`;
          
          // Create elliptical shadow
          const shadowY = baselineY + scene.shadowPreset.offsetY;
          const shadowX = carX + (scaledWidth / 2) + scene.shadowPreset.offsetX;
          const shadowWidth = scaledWidth * 0.8;
          const shadowHeight = scaledHeight * 0.15;
          
          ctx.fillStyle = '#000000';
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
          ctx.globalAlpha = scene.reflectionPreset.opacity;
          
          // Flip vertically for reflection
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
          
          // Create gradient mask for fade
          const gradient = ctx.createLinearGradient(
            0,
            canvas.height - baselineY,
            0,
            canvas.height - baselineY - scaledHeight * scene.reflectionPreset.fade
          );
          gradient.addColorStop(0, 'rgba(255,255,255,1)');
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          
          ctx.globalCompositeOperation = 'destination-in';
          ctx.fillStyle = gradient;
          ctx.fillRect(carX, canvas.height - baselineY, scaledWidth, scaledHeight);
          
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(
            carImage,
            carX,
            canvas.height - baselineY,
            scaledWidth,
            scaledHeight
          );
          
          ctx.restore();
        }

        // Convert to data URL and callback
        const dataUrl = canvas.toDataURL('image/png', 1.0);
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

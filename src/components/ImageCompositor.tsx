import { useEffect, useRef } from 'react';
import { SceneMetadata, CarAnalysis } from '@/types/scene';

interface ImageCompositorProps {
  segmentedImageUrl: string;
  scene: SceneMetadata;
  carAnalysis?: CarAnalysis;
  onCompositionComplete: (dataUrl: string) => void;
}

export const ImageCompositor = ({
  segmentedImageUrl,
  scene,
  carAnalysis,
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

        // Calculate car positioning with AI analysis or fallback to scene defaults
        const baselineY = (scene.baselineY / 100) * canvas.height;
        
        let scale = scene.defaultScale;
        let carY;
        
        if (carAnalysis) {
          // Use AI-determined positioning
          console.log('Using AI-based positioning:', carAnalysis);
          scale = carAnalysis.recommendedScale;
          
          // Calculate where the car's tires should touch the ground
          const scaledWidth = carImage.width * scale;
          const scaledHeight = carImage.height * scale;
          
          // Calculate tire position in scaled image
          const tireBottomInScaledImage = (carAnalysis.tireBottomPercent / 100) * scaledHeight;
          
          // Position car so tires align with baseline
          carY = baselineY - tireBottomInScaledImage;
          
          console.log('Calculated positioning - baselineY:', baselineY, 'tireBottom:', tireBottomInScaledImage, 'carY:', carY);
        } else {
          // Fallback to scene defaults
          console.log('Using default scene positioning');
          const scaledHeight = carImage.height * scale;
          carY = baselineY - scaledHeight;
        }
        
        // Calculate scaled dimensions maintaining aspect ratio
        const scaledWidth = carImage.width * scale;
        const scaledHeight = carImage.height * scale;
        
        // Center horizontally
        const carX = (canvas.width - scaledWidth) / 2;

        // Draw shadow with AI-optimized parameters or scene defaults
        const shouldDrawShadow = scene.shadowPreset.enabled;
        
        if (shouldDrawShadow) {
          ctx.save();
          
          // Use AI analysis for shadow if available, otherwise use scene presets
          const shadowAngle = carAnalysis?.shadowAngle ?? 0;
          const shadowLength = carAnalysis?.shadowLength ?? 0.15;
          const shadowBlur = carAnalysis?.shadowBlur ?? scene.shadowPreset.blur;
          const shadowOpacity = carAnalysis?.shadowOpacity ?? scene.shadowPreset.strength;
          
          // Calculate shadow offset based on angle
          const angleRad = (shadowAngle * Math.PI) / 180;
          const shadowOffsetX = Math.sin(angleRad) * (scaledWidth * shadowLength);
          const shadowOffsetY = Math.abs(Math.cos(angleRad)) * 5; // Slight vertical offset
          
          const shadowY = baselineY + shadowOffsetY;
          const shadowX = carX + (scaledWidth / 2) + shadowOffsetX;
          const shadowWidth = scaledWidth * (0.8 + shadowLength);
          const shadowHeight = scaledHeight * 0.03; // Very thin, natural
          
          // Create perspective-correct gradient
          const gradient = ctx.createRadialGradient(
            shadowX, shadowY, 0,
            shadowX, shadowY, shadowWidth / 2
          );
          gradient.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
          gradient.addColorStop(0.5, `rgba(0, 0, 0, ${shadowOpacity * 0.4})`);
          gradient.addColorStop(0.8, `rgba(0, 0, 0, ${shadowOpacity * 0.1})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.filter = `blur(${shadowBlur}px)`;
          
          // Draw elliptical shadow with slight rotation based on angle
          ctx.beginPath();
          ctx.ellipse(
            shadowX,
            shadowY,
            shadowWidth / 2,
            shadowHeight / 2,
            angleRad,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
          
          console.log('Shadow drawn with AI params:', { shadowAngle, shadowLength, shadowBlur, shadowOpacity });
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
  }, [segmentedImageUrl, scene, carAnalysis, onCompositionComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
};

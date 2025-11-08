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

      // Set canvas size to landscape format (3:2 ratio like iPhone landscape)
      canvas.width = 3072;
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

        // Calculate car positioning with AI analysis or smart fallback
        const baselineY = (scene.baselineY / 100) * canvas.height;
        
        let scale = scene.defaultScale;
        let tireBottomPercent = 78; // Default: tires are typically at 78% from top for most cars
        
        if (carAnalysis?.tireBottomPercent && carAnalysis?.recommendedScale) {
          // Use AI-determined positioning
          scale = carAnalysis.recommendedScale;
          tireBottomPercent = carAnalysis.tireBottomPercent;
          console.log('✓ Using AI positioning:', { 
            tireBottomPercent, 
            scale,
            shadowAngle: carAnalysis.shadowAngle,
            shadowLength: carAnalysis.shadowLength
          });
        } else {
          // Smart fallback: use scene scale but estimate tire position
          console.log('⚠ Using fallback positioning (no AI data)');
        }
        
        // Calculate dimensions
        const scaledWidth = carImage.width * scale;
        const scaledHeight = carImage.height * scale;
        
        // Calculate where tires are in the scaled image
        const tireBottomInScaledImage = (tireBottomPercent / 100) * scaledHeight;
        
        // Position car so the tire bottoms align perfectly with baseline
        const carY = baselineY - tireBottomInScaledImage;
        
        // Center horizontally
        const carX = (canvas.width - scaledWidth) / 2;
        
        console.log('Positioning:', {
          baselineY,
          tireBottomPercent,
          scaledHeight,
          tireBottomInScaledImage,
          carY,
          carX
        });

        // Draw AI-enhanced shadow or scene default
        const shouldDrawShadow = scene.shadowPreset.enabled;
        
        if (shouldDrawShadow) {
          ctx.save();
          
          // Prioritize AI analysis for shadow parameters
          const hasAIShadow = carAnalysis && 
                             typeof carAnalysis.shadowAngle === 'number' &&
                             typeof carAnalysis.shadowLength === 'number';
          
          const shadowAngle = hasAIShadow ? carAnalysis.shadowAngle : 0;
          const shadowLength = hasAIShadow ? carAnalysis.shadowLength : 0.15;
          const shadowBlur = hasAIShadow ? carAnalysis.shadowBlur : scene.shadowPreset.blur;
          const shadowOpacity = hasAIShadow ? carAnalysis.shadowOpacity : scene.shadowPreset.strength;
          
          console.log('Shadow params:', { hasAIShadow, shadowAngle, shadowLength, shadowBlur, shadowOpacity });
          
          // Calculate shadow position based on angle and length
          const angleRad = (shadowAngle * Math.PI) / 180;
          
          // Shadow stretches based on angle and length
          const shadowOffsetX = Math.sin(angleRad) * scaledWidth * shadowLength;
          const shadowOffsetY = 5; // Slight lift from ground
          
          const shadowCenterX = carX + (scaledWidth / 2) + shadowOffsetX;
          const shadowCenterY = baselineY + shadowOffsetY;
          
          // Shadow dimensions - wider for angled shadows
          const shadowWidth = scaledWidth * (0.85 + Math.abs(shadowLength) * 0.5);
          const shadowHeight = scaledHeight * 0.04;
          
          // Create realistic gradient with proper falloff
          const gradient = ctx.createRadialGradient(
            shadowCenterX, shadowCenterY, 0,
            shadowCenterX, shadowCenterY, shadowWidth / 1.8
          );
          
          gradient.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
          gradient.addColorStop(0.4, `rgba(0, 0, 0, ${shadowOpacity * 0.5})`);
          gradient.addColorStop(0.7, `rgba(0, 0, 0, ${shadowOpacity * 0.2})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.filter = `blur(${shadowBlur}px)`;
          
          // Draw elliptical shadow with rotation
          ctx.beginPath();
          ctx.ellipse(
            shadowCenterX,
            shadowCenterY,
            shadowWidth / 2,
            shadowHeight / 2,
            angleRad * 0.5, // Slight rotation based on angle
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
  }, [segmentedImageUrl, scene, carAnalysis, onCompositionComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
};

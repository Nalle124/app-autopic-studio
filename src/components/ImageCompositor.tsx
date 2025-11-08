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
        
        // Detect if image is portrait (taller than wide)
        const isPortrait = carImage.height > carImage.width;
        const aspectRatio = carImage.width / carImage.height;
        
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
          // For portrait images, increase scale to make them appear larger
          if (isPortrait) {
            scale = scene.defaultScale * 1.3; // Make portrait images 30% larger
            console.log('⚠ Portrait image detected, adjusting scale:', scale);
          } else {
            console.log('⚠ Using fallback positioning (no AI data)');
          }
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

        // Draw professional contact shadow directly under the car
        const shouldDrawShadow = scene.shadowPreset.enabled;
        
        if (shouldDrawShadow) {
          ctx.save();
          
          // Prioritize AI analysis for shadow parameters, otherwise use smart defaults
          const hasAIShadow = carAnalysis && 
                             typeof carAnalysis.shadowAngle === 'number' &&
                             typeof carAnalysis.shadowLength === 'number';
          
          const shadowAngle = hasAIShadow ? carAnalysis.shadowAngle : 0;
          const shadowLength = hasAIShadow ? carAnalysis.shadowLength : 0.2;
          const shadowBlur = hasAIShadow ? carAnalysis.shadowBlur : 20;
          const shadowOpacity = hasAIShadow ? carAnalysis.shadowOpacity : 0.4;
          
          console.log('Shadow params:', { hasAIShadow, shadowAngle, shadowLength, shadowBlur, shadowOpacity });
          
          // Draw contact shadow DIRECTLY under the tires at baseline
          const angleRad = (shadowAngle * Math.PI) / 180;
          const shadowOffsetX = Math.sin(angleRad) * scaledWidth * shadowLength * 0.3;
          
          // Shadow positioned exactly at baseline (where tires touch ground)
          const shadowCenterX = carX + (scaledWidth / 2) + shadowOffsetX;
          const shadowCenterY = baselineY; // RIGHT AT THE GROUND
          
          // Shadow dimensions - tight contact shadow under the car
          const shadowWidth = scaledWidth * 0.9;
          const shadowHeight = scaledHeight * 0.05;
          
          // Create realistic contact shadow gradient
          const gradient = ctx.createRadialGradient(
            shadowCenterX, shadowCenterY, 0,
            shadowCenterX, shadowCenterY, shadowWidth / 2
          );
          
          gradient.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity * 0.8})`);
          gradient.addColorStop(0.3, `rgba(0, 0, 0, ${shadowOpacity * 0.5})`);
          gradient.addColorStop(0.6, `rgba(0, 0, 0, ${shadowOpacity * 0.2})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.filter = `blur(${shadowBlur}px)`;
          
          // Draw elliptical contact shadow
          ctx.beginPath();
          ctx.ellipse(
            shadowCenterX,
            shadowCenterY,
            shadowWidth / 2,
            shadowHeight / 2,
            angleRad * 0.3,
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

        // Draw professional reflection for studio floors
        if (scene.reflectionPreset.enabled) {
          ctx.save();
          
          // Create a temporary canvas for the reflection
          const reflectionCanvas = document.createElement('canvas');
          reflectionCanvas.width = scaledWidth;
          reflectionCanvas.height = scaledHeight * 0.5; // Reflection is shorter
          const reflCtx = reflectionCanvas.getContext('2d');
          
          if (reflCtx) {
            // Draw flipped car
            reflCtx.translate(0, scaledHeight * 0.5);
            reflCtx.scale(1, -1);
            reflCtx.drawImage(carImage, 0, 0, scaledWidth, scaledHeight);
            
            // Apply smooth gradient fade from bottom to top
            const gradient = reflCtx.createLinearGradient(0, 0, 0, scaledHeight * 0.5);
            gradient.addColorStop(0, 'rgba(0,0,0,0.7)'); // More transparent at bottom (contact point)
            gradient.addColorStop(0.3, 'rgba(0,0,0,0.85)');
            gradient.addColorStop(1, 'rgba(0,0,0,1)'); // Fully transparent at top
            
            reflCtx.globalCompositeOperation = 'destination-out';
            reflCtx.fillStyle = gradient;
            reflCtx.fillRect(0, 0, scaledWidth, scaledHeight * 0.5);
            
            // Draw the reflection on main canvas with full opacity from preset
            ctx.globalAlpha = scene.reflectionPreset.opacity;
            ctx.drawImage(
              reflectionCanvas,
              carX,
              baselineY, // No gap - direct contact with ground
              scaledWidth,
              scaledHeight * 0.5
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

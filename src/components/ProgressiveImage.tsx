import { useState } from 'react';
import { ImageSkeleton } from './ImageSkeleton';

interface ProgressiveImageProps {
  thumbnailUrl?: string | null;
  fullUrl: string | null;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
  onClick?: () => void;
}

/**
 * Progressive image component that shows:
 * 1. Skeleton while loading
 * 2. Thumbnail quickly (small file)
 * 3. Full resolution on demand or when visible
 */
export const ProgressiveImage = ({
  thumbnailUrl,
  fullUrl,
  alt,
  className = '',
  aspectRatio = 'video',
  onClick,
}: ProgressiveImageProps) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // Use thumbnail if available, otherwise fall back to full URL
  const displayUrl = thumbnailUrl || fullUrl;
  
  if (!displayUrl) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-muted-foreground ${className}`}>
        Ingen bild
      </div>
    );
  }

  const handleClick = () => {
    // On click, load full resolution
    if (!showFull && fullUrl) {
      setShowFull(true);
    }
    onClick?.();
  };

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={handleClick}>
      {/* Skeleton shown while thumbnail is loading */}
      {!thumbnailLoaded && (
        <ImageSkeleton 
          className="absolute inset-0 z-10" 
          aspectRatio={aspectRatio} 
        />
      )}
      
      {/* Thumbnail layer */}
      <img
        src={displayUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          thumbnailLoaded ? 'opacity-100' : 'opacity-0'
        } ${showFull && fullLoaded ? 'hidden' : 'block'}`}
        loading="lazy"
        onLoad={() => setThumbnailLoaded(true)}
      />
      
      {/* Full resolution layer (loaded on demand) */}
      {showFull && fullUrl && (
        <img
          src={fullUrl}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            fullLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setFullLoaded(true)}
        />
      )}
    </div>
  );
};

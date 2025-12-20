import React from "react";
import { cn } from "@/lib/utils";

interface ImageSkeletonProps {
  className?: string;
  aspectRatio?: "square" | "video" | "wide" | "gallery";
}

export function ImageSkeleton({ className, aspectRatio = "video" }: ImageSkeletonProps) {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[16/9]",
    gallery: "aspect-[4/3]"
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        aspectClasses[aspectRatio],
        className
      )}
    >
      <div className="absolute inset-0 animate-image-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent bg-[length:200%_100%]" />
    </div>
  );
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  aspectRatio?: "square" | "video" | "wide";
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  fallbackClassName,
  aspectRatio = "video",
  ...props 
}: LazyImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  // Reset states when src changes
  React.useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return <ImageSkeleton className={fallbackClassName} aspectRatio={aspectRatio} />;
  }

  return (
    <div className="relative">
      {isLoading && (
        <ImageSkeleton 
          className={cn("absolute inset-0 z-10", fallbackClassName)} 
          aspectRatio={aspectRatio} 
        />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        {...props}
      />
    </div>
  );
}

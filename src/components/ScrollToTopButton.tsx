import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScrollToTopButtonProps {
  threshold?: number;
  containerRef?: React.RefObject<HTMLElement>;
  hideBeforeElementId?: string;
  hideAfterElementId?: string; // New prop to hide after a specific element (for mobile)
}

export const ScrollToTopButton = ({ 
  threshold = 400, 
  containerRef, 
  hideBeforeElementId,
  hideAfterElementId 
}: ScrollToTopButtonProps) => {
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = containerRef?.current?.scrollTop ?? window.scrollY;
      const meetsThreshold = scrollTop > threshold;
      
      let passedStartElement = true;
      let beforeEndElement = true;
      
      // Check if we've passed the start element (show after this)
      if (hideBeforeElementId) {
        const element = document.getElementById(hideBeforeElementId);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Only show button once we're past the element (it's above viewport)
          passedStartElement = rect.top < window.innerHeight * 0.5;
        }
      }
      
      // On mobile, check if we're before the end element (hide when reaching this)
      if (isMobile && hideAfterElementId) {
        const element = document.getElementById(hideAfterElementId);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Hide button when the element is visible in viewport
          beforeEndElement = rect.top > window.innerHeight * 0.7;
        }
      }
      
      setVisible(meetsThreshold && passedStartElement && beforeEndElement);
    };

    const target = containerRef?.current ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => target.removeEventListener('scroll', handleScroll);
  }, [threshold, containerRef, hideBeforeElementId, hideAfterElementId, isMobile]);

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all hover:scale-110 animate-fade-in"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};

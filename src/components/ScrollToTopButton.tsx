import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  threshold?: number;
  containerRef?: React.RefObject<HTMLElement>;
  hideBeforeElementId?: string;
}

export const ScrollToTopButton = ({ threshold = 400, containerRef, hideBeforeElementId }: ScrollToTopButtonProps) => {
  const [visible, setVisible] = useState(false);
  const [passedElement, setPassedElement] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = containerRef?.current?.scrollTop ?? window.scrollY;
      const meetsThreshold = scrollTop > threshold;
      
      // Check if we've passed the target element
      if (hideBeforeElementId) {
        const element = document.getElementById(hideBeforeElementId);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Only show button once we're past the element (it's above viewport)
          setPassedElement(rect.top < window.innerHeight * 0.5);
        } else {
          setPassedElement(true);
        }
      } else {
        setPassedElement(true);
      }
      
      setVisible(meetsThreshold && passedElement);
    };

    const target = containerRef?.current ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => target.removeEventListener('scroll', handleScroll);
  }, [threshold, containerRef, hideBeforeElementId, passedElement]);

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

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  threshold?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

export const ScrollToTopButton = ({ threshold = 400, containerRef }: ScrollToTopButtonProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = containerRef?.current?.scrollTop ?? window.scrollY;
      setVisible(scrollTop > threshold);
    };

    const target = containerRef?.current ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => target.removeEventListener('scroll', handleScroll);
  }, [threshold, containerRef]);

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

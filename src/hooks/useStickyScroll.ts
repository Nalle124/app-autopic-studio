import { useEffect, useRef, useCallback } from 'react';

export function useStickyScroll(enabled: boolean = true) {
  const sectionsRef = useRef<HTMLElement[]>([]);
  const isScrollingRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down'>('down');

  const registerSection = useCallback((element: HTMLElement | null) => {
    if (element && !sectionsRef.current.includes(element)) {
      sectionsRef.current.push(element);
      // Sort by DOM order
      sectionsRef.current.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let scrollTimeout: number | null = null;
    let lastScrollTime = 0;

    const handleScroll = () => {
      // Track scroll direction
      const currentScrollY = window.scrollY;
      scrollDirectionRef.current = currentScrollY > lastScrollYRef.current ? 'down' : 'up';
      lastScrollYRef.current = currentScrollY;

      // Don't trigger if already auto-scrolling
      if (isScrollingRef.current) return;

      // Debounce
      const now = Date.now();
      if (now - lastScrollTime < 50) return;
      lastScrollTime = now;

      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Set timeout for snap detection after scroll stops
      scrollTimeout = window.setTimeout(() => {
        if (isScrollingRef.current) return;

        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;
        const headerOffset = 80;

        for (let i = 0; i < sectionsRef.current.length; i++) {
          const section = sectionsRef.current[i];
          const rect = section.getBoundingClientRect();
          const sectionTop = scrollY + rect.top;
          const sectionBottom = sectionTop + rect.height;
          const scrollBottom = scrollY + viewportHeight;

          // Calculate how much of section is visible
          const visibleTop = Math.max(sectionTop, scrollY + headerOffset);
          const visibleBottom = Math.min(sectionBottom, scrollBottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const visibilityRatio = visibleHeight / rect.height;

          // When scrolling down and near bottom of current section, snap to next
          if (scrollDirectionRef.current === 'down') {
            const distanceToBottom = sectionBottom - scrollBottom;
            
            // If we're within 80px of the bottom and there's a next section
            if (distanceToBottom > -30 && distanceToBottom < 80 && i < sectionsRef.current.length - 1) {
              const nextSection = sectionsRef.current[i + 1];
              const nextRect = nextSection.getBoundingClientRect();
              const nextTop = scrollY + nextRect.top - headerOffset - 24;

              isScrollingRef.current = true;
              window.scrollTo({
                top: nextTop,
                behavior: 'smooth'
              });
              
              setTimeout(() => {
                isScrollingRef.current = false;
              }, 500);
              return;
            }
          }
          
          // When scrolling up and near top of current section, snap to previous
          if (scrollDirectionRef.current === 'up') {
            const distanceToTop = rect.top - headerOffset;
            
            // If we're near the top of a section and there's a previous section
            if (distanceToTop > -30 && distanceToTop < 80 && i > 0) {
              const prevSection = sectionsRef.current[i - 1];
              const prevRect = prevSection.getBoundingClientRect();
              const prevTop = scrollY + prevRect.top - headerOffset - 24;

              isScrollingRef.current = true;
              window.scrollTo({
                top: prevTop,
                behavior: 'smooth'
              });
              
              setTimeout(() => {
                isScrollingRef.current = false;
              }, 500);
              return;
            }
          }
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [enabled]);

  return { registerSection };
}

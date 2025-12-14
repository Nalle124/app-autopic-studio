import { useEffect, useRef, useCallback } from 'react';

export function useStickyScroll(enabled: boolean = true) {
  const sectionsRef = useRef<HTMLElement[]>([]);
  const isScrollingRef = useRef(false);
  const lastScrollTimeRef = useRef(0);

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

    const handleScroll = () => {
      // Debounce - don't trigger if we're already auto-scrolling
      if (isScrollingRef.current) return;
      
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 100) return;
      lastScrollTimeRef.current = now;

      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const headerOffset = 80; // Fixed header height

      sectionsRef.current.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = scrollY + rect.top - headerOffset;
        const sectionBottom = sectionTop + rect.height;

        // Check if we're near the bottom of a section (within 100px threshold)
        const scrollBottom = scrollY + viewportHeight;
        const distanceToSectionBottom = sectionBottom - scrollBottom;

        // If we're within 50px of section bottom and scrolling down, snap to next
        if (distanceToSectionBottom > -50 && distanceToSectionBottom < 50) {
          const nextSection = sectionsRef.current[index + 1];
          if (nextSection) {
            const nextRect = nextSection.getBoundingClientRect();
            const nextTop = scrollY + nextRect.top - headerOffset - 32; // 32px padding

            // Only snap if we're scrolling towards the next section
            if (scrollY > sectionTop + 50) {
              isScrollingRef.current = true;
              window.scrollTo({
                top: nextTop,
                behavior: 'smooth'
              });
              setTimeout(() => {
                isScrollingRef.current = false;
              }, 600);
            }
          }
        }
      });
    };

    // Use passive scroll listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled]);

  return { registerSection };
}

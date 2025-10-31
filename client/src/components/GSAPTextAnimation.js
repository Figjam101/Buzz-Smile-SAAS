import React, { useEffect, useRef } from 'react';

// GSAP is loaded dynamically inside the effect to reduce initial JS and honor reduced motion
const GSAPTextAnimation = ({ 
  children, 
  className = '', 
  delay = 0, 
  duration = 1, 
  animationType = 'fadeInUp',
  splitByWords = false,
  splitByChars = false 
}) => {
  const textRef = useRef(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      element.style.opacity = 1;
      element.style.transform = 'none';
      element.style.width = 'auto';
      return;
    }

    let tl;
    let mounted = true;

    import('gsap')
      .then(({ gsap }) => {
        if (!mounted) return;

        gsap.set(element, { opacity: 0 });
        tl = gsap.timeline({ delay });

        if (splitByChars || splitByWords) {
          const text = element.textContent;
          const splitText = splitByChars 
            ? text.split('').map(char => char === ' ' ? '&nbsp;' : char)
            : text.split(' ');
          
          element.innerHTML = splitText
            .map((item, index) => `<span class="inline-block" style="opacity: 0; transform: translateY(20px);">${item}${splitByWords && index < splitText.length - 1 ? '&nbsp;' : ''}</span>`)
            .join('');

          const spans = element.querySelectorAll('span');

          tl.to(spans, {
            opacity: 1,
            y: 0,
            duration: duration / 2,
            stagger: splitByChars ? 0.02 : 0.1,
            ease: 'power2.out'
          });
        } else {
          switch (animationType) {
            case 'fadeInUp':
              gsap.set(element, { y: 30, opacity: 0 });
              tl.to(element, { y: 0, opacity: 1, duration, ease: 'power2.out' });
              break;
            case 'fadeInLeft':
              gsap.set(element, { x: -50, opacity: 0 });
              tl.to(element, { x: 0, opacity: 1, duration, ease: 'power2.out' });
              break;
            case 'fadeInRight':
              gsap.set(element, { x: 50, opacity: 0 });
              tl.to(element, { x: 0, opacity: 1, duration, ease: 'power2.out' });
              break;
            case 'scaleIn':
              gsap.set(element, { scale: 0.8, opacity: 0 });
              tl.to(element, { scale: 1, opacity: 1, duration, ease: 'back.out(1.7)' });
              break;
            case 'typewriter': {
              const text = element.textContent;
              element.innerHTML = '';
              gsap.set(element, { opacity: 1 });
              tl.to({}, {
                duration: duration,
                onUpdate() {
                  const progress = this.progress();
                  const currentLength = Math.floor(progress * text.length);
                  element.innerHTML = text.substring(0, currentLength) + (progress < 1 ? '<span class="animate-pulse">|</span>' : '');
                }
              });
              break;
            }
            default:
              tl.to(element, { opacity: 1, duration, ease: 'power2.out' });
          }
        }
      })
      .catch(() => {
        element.style.opacity = 1;
        element.style.transform = 'none';
      });

    return () => {
      mounted = false;
      if (tl) tl.kill();
    };
  }, [delay, duration, animationType, splitByWords, splitByChars]);

  return (
    <div ref={textRef} className={className}>
      {children}
    </div>
  );
};

export default GSAPTextAnimation;

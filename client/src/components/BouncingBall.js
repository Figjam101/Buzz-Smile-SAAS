import React, { useEffect, useRef } from 'react';

const BouncingBall = () => {
  const ball1Ref = useRef(null);
  const ball2Ref = useRef(null);
  const ball3Ref = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Position and velocity refs for each ball
  const position1Ref = useRef({ x: 50, y: 50 });
  const velocity1Ref = useRef({ x: 2, y: 1.5 });
  
  const position2Ref = useRef({ x: 200, y: 100 });
  const velocity2Ref = useRef({ x: -1.8, y: 2.2 });
  
  const position3Ref = useRef({ x: 150, y: 200 });
  const velocity3Ref = useRef({ x: 1.2, y: -1.8 });

  useEffect(() => {
    const ball1 = ball1Ref.current;
    const ball2 = ball2Ref.current;
    const ball3 = ball3Ref.current;
    const container = containerRef.current;
    
    if (!ball1 || !ball2 || !ball3 || !container) return;

    const ball1Size = 300; // Original size
    const ball2Size = 150; // Smaller ball
    const ball3Size = 450; // Larger ball

    const animate = () => {
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // Animate Ball 1 (300px)
      position1Ref.current.x += velocity1Ref.current.x;
      position1Ref.current.y += velocity1Ref.current.y;
      
      if (position1Ref.current.x <= 0 || position1Ref.current.x >= containerWidth - ball1Size) {
        velocity1Ref.current.x = -velocity1Ref.current.x;
        position1Ref.current.x = Math.max(0, Math.min(containerWidth - ball1Size, position1Ref.current.x));
      }
      
      if (position1Ref.current.y <= 0 || position1Ref.current.y >= containerHeight - ball1Size) {
        velocity1Ref.current.y = -velocity1Ref.current.y;
        position1Ref.current.y = Math.max(0, Math.min(containerHeight - ball1Size, position1Ref.current.y));
      }
      
      ball1.style.transform = `translate(${position1Ref.current.x}px, ${position1Ref.current.y}px)`;
      
      // Animate Ball 2 (150px)
      position2Ref.current.x += velocity2Ref.current.x;
      position2Ref.current.y += velocity2Ref.current.y;
      
      if (position2Ref.current.x <= 0 || position2Ref.current.x >= containerWidth - ball2Size) {
        velocity2Ref.current.x = -velocity2Ref.current.x;
        position2Ref.current.x = Math.max(0, Math.min(containerWidth - ball2Size, position2Ref.current.x));
      }
      
      if (position2Ref.current.y <= 0 || position2Ref.current.y >= containerHeight - ball2Size) {
        velocity2Ref.current.y = -velocity2Ref.current.y;
        position2Ref.current.y = Math.max(0, Math.min(containerHeight - ball2Size, position2Ref.current.y));
      }
      
      ball2.style.transform = `translate(${position2Ref.current.x}px, ${position2Ref.current.y}px)`;
      
      // Animate Ball 3 (450px)
      position3Ref.current.x += velocity3Ref.current.x;
      position3Ref.current.y += velocity3Ref.current.y;
      
      if (position3Ref.current.x <= 0 || position3Ref.current.x >= containerWidth - ball3Size) {
        velocity3Ref.current.x = -velocity3Ref.current.x;
        position3Ref.current.x = Math.max(0, Math.min(containerWidth - ball3Size, position3Ref.current.x));
      }
      
      if (position3Ref.current.y <= 0 || position3Ref.current.y >= containerHeight - ball3Size) {
        velocity3Ref.current.y = -velocity3Ref.current.y;
        position3Ref.current.y = Math.max(0, Math.min(containerHeight - ball3Size, position3Ref.current.y));
      }
      
      ball3.style.transform = `translate(${position3Ref.current.x}px, ${position3Ref.current.y}px)`;
      
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* Ball 1 - Original size with multi-color gradient */}
      <div
        ref={ball1Ref}
        className="absolute rounded-full shadow-lg"
        style={{
          width: '300px',
          height: '300px',
          background: 'linear-gradient(135deg, rgba(255, 0, 150, 0.3), rgba(0, 204, 255, 0.3), rgba(255, 204, 0, 0.3), rgba(150, 0, 255, 0.3))',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1), 0 0 40px rgba(255, 0, 150, 0.2)',
          filter: 'blur(25px) drop-shadow(0 0 50px rgba(255, 0, 150, 0.3))',
          opacity: 0.6
        }}
      />
      
      {/* Ball 2 - Smaller size with different gradient */}
      <div
        ref={ball2Ref}
        className="absolute rounded-full shadow-lg"
        style={{
          width: '150px',
          height: '150px',
          background: 'linear-gradient(45deg, rgba(0, 255, 200, 0.2), rgba(100, 200, 255, 0.2), rgba(50, 150, 255, 0.2))',
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.1), 0 0 30px rgba(0, 200, 255, 0.1)',
          filter: 'blur(20px) drop-shadow(0 0 40px rgba(0, 200, 255, 0.2))',
          opacity: 0.4
        }}
      />
      
      {/* Ball 3 - Larger size with vibrant gradient */}
      <div
        ref={ball3Ref}
        className="absolute rounded-full shadow-lg"
        style={{
          width: '450px',
          height: '450px',
          background: 'linear-gradient(225deg, rgba(255, 20, 147, 0.3), rgba(0, 191, 255, 0.3), rgba(50, 205, 50, 0.3), rgba(255, 165, 0, 0.3), rgba(138, 43, 226, 0.3))',
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1), 0 0 60px rgba(255, 20, 147, 0.2)',
          filter: 'blur(30px) drop-shadow(0 0 70px rgba(255, 20, 147, 0.3))',
          opacity: 0.6
        }}
      />
    </div>
  );
};

export default BouncingBall;
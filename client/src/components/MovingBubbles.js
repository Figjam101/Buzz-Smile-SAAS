import React from 'react';

const MovingBubbles = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Bubble 1 - Large, slow moving */}
      <div 
        className="absolute w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-float-slow"
        style={{
          top: '10%',
          left: '10%',
          animation: 'float-slow 20s ease-in-out infinite'
        }}
      />
      
      {/* Bubble 2 - Medium, medium speed */}
      <div 
        className="absolute w-64 h-64 bg-gradient-to-br from-pink-400/15 to-blue-500/15 rounded-full blur-2xl animate-float-medium"
        style={{
          top: '60%',
          right: '15%',
          animation: 'float-medium 15s ease-in-out infinite reverse'
        }}
      />
      
      {/* Bubble 3 - Small, fast moving */}
      <div 
        className="absolute w-48 h-48 bg-gradient-to-br from-cyan-400/20 to-teal-500/20 rounded-full blur-2xl animate-float-fast"
        style={{
          bottom: '20%',
          left: '20%',
          animation: 'float-fast 12s ease-in-out infinite'
        }}
      />
      
      {/* Bubble 4 - Extra large, very slow */}
      <div 
        className="absolute w-[500px] h-[500px] bg-gradient-to-br from-indigo-400/10 to-purple-600/10 rounded-full blur-3xl animate-float-extra-slow"
        style={{
          top: '30%',
          right: '5%',
          animation: 'float-extra-slow 25s ease-in-out infinite reverse'
        }}
      />
      
      {/* Bubble 5 - Medium, diagonal movement */}
      <div 
        className="absolute w-72 h-72 bg-gradient-to-br from-emerald-400/15 to-blue-600/15 rounded-full blur-2xl animate-float-diagonal"
        style={{
          bottom: '10%',
          right: '30%',
          animation: 'float-diagonal 18s ease-in-out infinite'
        }}
      />
      
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -20px) scale(1.1); }
          50% { transform: translate(-20px, -40px) scale(0.9); }
          75% { transform: translate(-40px, 20px) scale(1.05); }
        }
        
        @keyframes float-medium {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(40px, -30px) rotate(120deg); }
          66% { transform: translate(-30px, 40px) rotate(240deg); }
        }
        
        @keyframes float-fast {
          0%, 100% { transform: translate(0, 0) scale(1); }
          20% { transform: translate(25px, -35px) scale(1.2); }
          40% { transform: translate(-35px, -20px) scale(0.8); }
          60% { transform: translate(30px, 25px) scale(1.1); }
          80% { transform: translate(-20px, 35px) scale(0.9); }
        }
        
        @keyframes float-extra-slow {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(-50px, -30px) scale(1.1) rotate(180deg); }
        }
        
        @keyframes float-diagonal {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(50px, -50px); }
          50% { transform: translate(-30px, -80px); }
          75% { transform: translate(-60px, 30px); }
        }
      `}</style>
    </div>
  );
};

export default MovingBubbles;
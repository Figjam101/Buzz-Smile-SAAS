import React, { useState } from 'react';
import '../styles/buzz-animations.css';

const BuzzAnimationDemo = () => {
  const [selectedAnimation, setSelectedAnimation] = useState('buzz-shake');

  const animationOptions = [
    {
      id: 'buzz-shake',
      name: 'Subtle Shake/Vibration',
      description: 'A gentle shake that mimics vibration - perfect for continuous buzzing effect',
      className: 'buzz-shake'
    },
    {
      id: 'buzz-pulse',
      name: 'Pulsing Scale',
      description: 'Rhythmic scaling that creates a pulsing buzz effect',
      className: 'buzz-pulse'
    },
    {
      id: 'buzz-wobble',
      name: 'Rotation Wobble',
      description: 'Combines rotation and scaling for a dynamic wobble effect',
      className: 'buzz-wobble'
    },
    {
      id: 'buzz-electric',
      name: 'Electric Buzz',
      description: 'Fast, erratic movement with brightness changes - high energy buzz',
      className: 'buzz-electric'
    },
    {
      id: 'buzz-gentle',
      name: 'Gentle Continuous',
      description: 'Very subtle continuous movement - barely noticeable but effective',
      className: 'buzz-gentle'
    },
    {
      id: 'buzz-letter',
      name: 'Letter-by-Letter',
      description: 'Each letter vibrates independently for a unique effect',
      className: 'buzz-letter-animation'
    },
    {
      id: 'hover-only',
      name: 'Hover-Activated Buzz',
      description: 'Animation only triggers on hover - subtle and user-controlled',
      className: 'buzz-on-hover buzz-shake'
    }
  ];

  const renderBuzzText = (animation) => {
    if (animation.id === 'buzz-letter') {
      return (
        <div className={animation.className}>
          <span className="buzz-letter-1">B</span>
          <span className="buzz-letter-2">u</span>
          <span className="buzz-letter-3">z</span>
          <span className="buzz-letter-4">z</span>
        </div>
      );
    }
    
    return (
      <span className={animation.className}>
        Buzz
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Buzz Animation Options
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose from different animation styles to make the "Buzz" in your logo come alive. 
            Each option provides a unique way to convey energy and movement.
          </p>
        </div>

        {/* Main Preview */}
        <div className="bg-white rounded-2xl shadow-xl p-12 mb-12 text-center">
          <div className="mb-8">
            <div className="flex items-baseline justify-center space-x-2 text-6xl font-bold font-['Inter']">
              {renderBuzzText(animationOptions.find(opt => opt.id === selectedAnimation))}
              <span className="text-blue-600">Smile</span>
            </div>
          </div>
          
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {animationOptions.find(opt => opt.id === selectedAnimation)?.name}
            </h3>
            <p className="text-gray-600">
              {animationOptions.find(opt => opt.id === selectedAnimation)?.description}
            </p>
          </div>
        </div>

        {/* Animation Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {animationOptions.map((animation) => (
            <div
              key={animation.id}
              onClick={() => setSelectedAnimation(animation.id)}
              className={`bg-white rounded-xl p-6 cursor-pointer transition-all duration-200 border-2 ${
                selectedAnimation === animation.id
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center space-x-1 text-2xl font-bold font-['Inter'] mb-3">
                  {renderBuzzText(animation)}
                  <span className="text-blue-600">Smile</span>
                </div>
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-2 text-center">
                {animation.name}
              </h4>
              <p className="text-sm text-gray-600 text-center">
                {animation.description}
              </p>
            </div>
          ))}
        </div>

        {/* Implementation Guide */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Implementation Guide</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Implementation</h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <div className="text-gray-600 mb-2">{/* Add to your logo component: */}</div>
                <div className="text-blue-600">
                  &lt;span className="{selectedAnimation === 'buzz-letter' ? 'buzz-letter-animation' : animationOptions.find(opt => opt.id === selectedAnimation)?.className}"&gt;
                </div>
                <div className="ml-4 text-gray-900">
                  {selectedAnimation === 'buzz-letter' ? (
                    <>
                      &lt;span className="buzz-letter-1"&gt;B&lt;/span&gt;<br/>
                      &lt;span className="buzz-letter-2"&gt;u&lt;/span&gt;<br/>
                      &lt;span className="buzz-letter-3"&gt;z&lt;/span&gt;<br/>
                      &lt;span className="buzz-letter-4"&gt;z&lt;/span&gt;
                    </>
                  ) : (
                    'Buzz'
                  )}
                </div>
                <div className="text-blue-600">&lt;/span&gt;</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Subtle Shake:</strong> Best for continuous, professional buzz effect</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Hover-Only:</strong> Great for interactive, user-controlled animation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Electric Buzz:</strong> Perfect for high-energy, dynamic branding</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">ℹ</span>
                  <span>All animations respect user's motion preferences</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuzzAnimationDemo;
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Wand2 } from 'lucide-react';

const VideoEditingWizard = ({ isOpen, videoFiles, onClose, onProcessVideo }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    videoName: '',
    description: '',
    editingStyle: ''
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isStory, setIsStory] = useState(false);

  useEffect(() => {
    // Keep parity with previous behavior if needed
  }, [videoFiles]);

  if (!isOpen) return null;

  const totalSteps = 3;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };
  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinish = () => {
    const platformCatalog = getPlatformCatalog();
    const recommendedDurations = selectedPlatforms.reduce((acc, pid) => {
      const p = platformCatalog.find(pl => pl.id === pid);
      if (p) acc[pid] = p.recommendedDurations;
      return acc;
    }, {});

    const finalData = {
      ...formData,
      platforms: selectedPlatforms,
      storyMode: isStory,
      estimatedExtraCredits: isStory ? 1 : 0,
      recommendedDurations,
      orderedFiles: videoFiles || [],
      fileCount: (videoFiles || []).length
    };
    onProcessVideo(finalData);
    onClose();
  };

  const getPlatformCatalog = () => ([
    { id: 'tiktok', name: 'TikTok', recommendedDurations: ['15–30s', '30–60s'], note: '9:16 vertical' },
    { id: 'instagram-reels', name: 'Instagram Reels', recommendedDurations: ['15–30s', '30–60s'], note: '9:16 vertical' },
    { id: 'instagram-story', name: 'Instagram Story', recommendedDurations: ['15s per slide'], note: '9:16 vertical' },
    { id: 'youtube-shorts', name: 'YouTube Shorts', recommendedDurations: ['15–60s'], note: '9:16 vertical' },
    { id: 'youtube', name: 'YouTube', recommendedDurations: ['1–2m', '2–5m'], note: '16:9 horizontal' },
    { id: 'facebook', name: 'Facebook', recommendedDurations: ['30–60s', '1–2m'], note: '16:9 or 9:16' },
    { id: 'twitter', name: 'Twitter/X', recommendedDurations: ['15–60s'], note: '16:9 or 9:16' }
  ]);

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step 1: Video Information</h3>
            <p className="text-gray-600">Give your video a name and brief description</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Video Name</label>
              <input
                type="text"
                placeholder="E.g. Promo for Popeys bar in London"
                value={formData.videoName}
                onChange={(e) => handleInputChange('videoName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                placeholder="A short description or any key notes..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step 2: Platforms</h3>
            <p className="text-gray-600">What platform(s) do you need this video for? (Select multiple)</p>
            <div className="grid grid-cols-2 gap-3">
              {getPlatformCatalog().map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${selectedPlatforms.includes(p.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600">{p.note}</div>
                </button>
              ))}
            </div>

            {selectedPlatforms.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Recommended Durations</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {selectedPlatforms.map(pid => {
                    const p = getPlatformCatalog().find(pl => pl.id === pid);
                    return (
                      <li key={pid}><strong>{p?.name}:</strong> {(p?.recommendedDurations || []).join(', ')}</li>
                    );
                  })}
                </ul>
                <p className="text-xs text-blue-700 mt-2">We’ll tailor cuts and pacing to fit each platform’s best practices.</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step 3: Story Mode</h3>
            <p className="text-gray-600">Make this video a story sequence. This uses an extra credit.</p>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Create Story Version</div>
                <div className="text-sm text-gray-600">Generates story-formatted output (e.g., multiple slides at 15s for IG Story).</div>
                <div className="text-xs text-red-600 mt-1">Note: Uses 1 extra credit from your balance.</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isStory} onChange={(e) => setIsStory(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors">
                  <div className={`h-6 w-6 bg-white rounded-full shadow transform transition-transform ${isStory ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              {[{ name: 'Dynamic', desc: 'Fast cuts, energetic pacing' }, { name: 'Clean', desc: 'Minimal, professional transitions' }, { name: 'Cinematic', desc: 'Dramatic look, film-style' }].map((style) => (
                <button
                  key={style.name}
                  onClick={() => handleInputChange('editingStyle', style.name)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${formData.editingStyle === style.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-medium">{style.name}</div>
                  <div className="text-sm text-gray-600">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ zIndex: 999999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        style={{
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <Wand2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Video Editor</h2>
              <p className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 bg-white/5 backdrop-blur-sm">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">{renderStep()}</div>

        <div className="flex items-center justify-between p-6 border-t border-white/20 bg-white/5 backdrop-blur-sm">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm ${currentStep === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-white/20'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          {currentStep === totalSteps ? (
            <button onClick={handleFinish} className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg backdrop-blur-sm">
              <Wand2 className="w-4 h-4" />
              <span>Start Editing</span>
            </button>
          ) : (
            <button onClick={nextStep} className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg backdrop-blur-sm">
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoEditingWizard;
import React, { useState } from 'react';

const VideoEditingWizard = ({ isOpen, videoFiles, onClose, onProcessVideo }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    videoName: '',
    description: '',
    editingStyle: ''
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isStory, setIsStory] = useState(false);

  if (!isOpen) return null;

  const totalSteps = 3;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step 1: Video Information</h3>
            <p className="text-gray-600">Basic details to guide editing</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Video Name</label>
              <input
                className="w-full p-2 border rounded"
                value={formData.videoName}
                onChange={(e) => handleInputChange('videoName', e.target.value)}
                placeholder="e.g., Product Promo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="What’s the goal or key message?"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step 2: Platforms</h3>
            <p className="text-gray-600">Select the platform(s) for this video</p>
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
                <p className="text-xs text-blue-700 mt-2">We’ll tailor cuts and pacing to fit each platform.</p>
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step 3: Story Mode</h3>
            <p className="text-gray-600">Generate a story-formatted output (uses 1 extra credit)</p>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium text-gray-800">Create Story Version</div>
                <div className="text-sm text-gray-600">E.g., multiple slides at ~15s for IG Story</div>
                <div className="text-xs text-red-600 mt-1">Note: Uses 1 extra credit</div>
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Video Editor</h2>
          <button onClick={onClose} className="px-3 py-1 text-gray-600 hover:text-gray-900">Close</button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</div>
          <div className="space-x-2">
            {currentStep > 1 && (
              <button onClick={prevStep} className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200">Back</button>
            )}
            {currentStep < totalSteps ? (
              <button onClick={nextStep} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Next</button>
            ) : (
              <button onClick={handleFinish} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Start Processing</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditingWizard;
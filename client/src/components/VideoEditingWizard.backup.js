import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Play, Upload, Wand2 } from 'lucide-react';

const VideoEditingWizard = ({ isOpen, videoFiles, onClose, onProcessVideo }) => {
  
  // React Hooks must be called at the top level - not inside try-catch or conditionals
  const [currentStep, setCurrentStep] = useState(1);
  const [orderedFiles, setOrderedFiles] = useState(videoFiles || []);
  const [formData, setFormData] = useState({
    videoName: '',
    description: '',
    videoType: '',
    targetAudience: '',
    editingStyle: '',
    duration: '',
    specialRequests: ''
  });

  // Update orderedFiles when videoFiles prop changes
  React.useEffect(() => {
    if (videoFiles && videoFiles.length > 0) {
      setOrderedFiles(videoFiles);
    }
  }, [videoFiles]);
  
  if (!isOpen) {
    return null;
  }

  try {

  const totalSteps = videoFiles && videoFiles.length > 1 ? 7 : 6;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Process the video with the collected information
    const finalData = {
      ...formData,
      orderedFiles: orderedFiles,
      fileCount: orderedFiles.length
    };
    onProcessVideo(finalData);
    onClose();
  };

  const moveFile = (fromIndex, toIndex) => {
    const newOrderedFiles = [...orderedFiles];
    const [movedFile] = newOrderedFiles.splice(fromIndex, 1);
    newOrderedFiles.splice(toIndex, 0, movedFile);
    setOrderedFiles(newOrderedFiles);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Show file ordering step only if multiple files
        if (videoFiles && videoFiles.length > 1) {
          return (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">Step 1: Arrange Video Sequence</h3>
              <p className="text-gray-600">Drag and drop to reorder your videos. They will be combined in this order.</p>
              
              <div className="space-y-3">
                {orderedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <button
                          onClick={() => index > 0 && moveFile(index, index - 1)}
                          disabled={index === 0}
                          className={`text-xs px-2 py-1 rounded ${
                            index === 0 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => index < orderedFiles.length - 1 && moveFile(index, index + 1)}
                          disabled={index === orderedFiles.length - 1}
                          className={`text-xs px-2 py-1 rounded ${
                            index === orderedFiles.length - 1 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          ↓
                        </button>
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Preview:</strong> Your videos will be combined in the order shown above.
                </p>
              </div>
            </div>
          );
        }
        // Fall through to video information step if single file
        
      case (videoFiles && videoFiles.length > 1 ? 2 : 1):
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step {videoFiles && videoFiles.length > 1 ? 2 : 1}: Video Information</h3>
            <p className="text-gray-600">Tell us about your video content</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Name & Description
              </label>
              <input
                type="text"
                placeholder="E.g. Happy customers drinking Whiskey at Popeys bar and grill, located in UK - London"
                value={formData.videoName}
                onChange={(e) => handleInputChange('videoName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Context
              </label>
              <textarea
                placeholder="Any additional details about the video content, mood, or setting..."
                value={formData.videoDescription}
                onChange={(e) => handleInputChange('videoDescription', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case (videoFiles && videoFiles.length > 1 ? 3 : 2):
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step {videoFiles && videoFiles.length > 1 ? 3 : 2}: Video Type</h3>
            <p className="text-gray-600">What type of video is this?</p>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                'Restaurant/Bar', 'Product Demo', 'Event Coverage', 'Interview',
                'Tutorial', 'Marketing', 'Social Media', 'Other'
              ].map((type) => (
                <button
                  key={type}
                  onClick={() => handleInputChange('videoType', type)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.videoType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        );

      case (videoFiles && videoFiles.length > 1 ? 4 : 3):
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step {videoFiles && videoFiles.length > 1 ? 4 : 3}: Target Audience</h3>
            <p className="text-gray-600">Who is this video for?</p>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                'Young Adults (18-30)', 'Adults (30-50)', 'Seniors (50+)', 'Families',
                'Professionals', 'Students', 'General Public', 'Specific Niche'
              ].map((audience) => (
                <button
                  key={audience}
                  onClick={() => handleInputChange('targetAudience', audience)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.targetAudience === audience
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>
        );

      case (videoFiles && videoFiles.length > 1 ? 5 : 4):
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step {videoFiles && videoFiles.length > 1 ? 5 : 4}: Editing Style</h3>
            <p className="text-gray-600">What editing style do you prefer?</p>
            
            <div className="space-y-3">
              {[
                { name: 'Dynamic & Energetic', desc: 'Fast cuts, upbeat music, high energy' },
                { name: 'Smooth & Professional', desc: 'Clean transitions, professional look' },
                { name: 'Cinematic', desc: 'Film-like quality, dramatic effects' },
                { name: 'Social Media Ready', desc: 'Optimized for Instagram, TikTok, etc.' },
                { name: 'Documentary Style', desc: 'Natural, informative approach' },
                { name: 'Minimal & Clean', desc: 'Simple, elegant editing' }
              ].map((style) => (
                <button
                  key={style.name}
                  onClick={() => handleInputChange('editingStyle', style.name)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    formData.editingStyle === style.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{style.name}</div>
                  <div className="text-sm text-gray-600">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case (videoFiles && videoFiles.length > 1 ? 6 : 5):
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step {videoFiles && videoFiles.length > 1 ? 6 : 5}: Video Length</h3>
            <p className="text-gray-600">What's your preferred final video length?</p>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                '15-30 seconds', '30-60 seconds', '1-2 minutes', '2-5 minutes',
                '5-10 minutes', '10+ minutes', 'Keep original', 'Let AI decide'
              ].map((duration) => (
                <button
                  key={duration}
                  onClick={() => handleInputChange('duration', duration)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.duration === duration
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {duration}
                </button>
              ))}
            </div>
          </div>
        );

      case (videoFiles && videoFiles.length > 1 ? 7 : 6):
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Step {videoFiles && videoFiles.length > 1 ? 7 : 6}: Special Requests</h3>
            <p className="text-gray-600">Any specific editing requests or preferences?</p>
            
            <div>
              <textarea
                placeholder="E.g. Add captions, include logo, specific music style, color grading preferences, etc."
                value={formData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Review Your Selections:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Video:</strong> {formData.videoName}</p>
                <p><strong>Type:</strong> {formData.videoType}</p>
                <p><strong>Audience:</strong> {formData.targetAudience}</p>
                <p><strong>Style:</strong> {formData.editingStyle}</p>
                <p><strong>Duration:</strong> {formData.duration}</p>
                {videoFiles && videoFiles.length > 1 && (
                  <p><strong>Files:</strong> {videoFiles.length} videos to be combined</p>
                )}
              </div>
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
      style={{zIndex: 999999}}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        style={{
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2)'
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <Wand2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">AI Video Editor</h2>
              <p className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-white/5 backdrop-blur-sm">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/20 bg-white/5 backdrop-blur-sm">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-white/20'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep === totalSteps ? (
            <button
              onClick={handleFinish}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              <Wand2 className="w-4 h-4" />
              <span>Start AI Editing</span>
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('VideoEditingWizard ERROR:', error);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-700 mb-4">An error occurred while loading the video editor.</p>
          <button 
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }
};

export default VideoEditingWizard;
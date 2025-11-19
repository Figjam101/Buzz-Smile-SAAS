import React from 'react';
 
import '../styles/stars.css';

/**
 * DashboardStructure
 * Lightweight prototype of the desired block layout so we can iterate
 * container-by-container. Uses existing theme utilities (btn, btn-primary,
 * glass-card) to stay consistent with the site style.
 */
export default function DashboardStructure({
  uploadContent,
  processContent,
  uploadCompleted,
  processCompleted = false,
  scheduleCompleted = false,
  stepIndex = 0,
  onNext,
  onPrev,
  onFinish,
  onUploadClick,
}) {
  

  // Helpers to soften accent colors when Calm Mode is enabled
  
  const lastIndex = 3; // four slides: 0,1,2,3
  const totalSlides = lastIndex + 1;
  const perSlideShift = 100 / totalSlides; // percent of track width to move per slide
  // Navigation is button-driven only; disable scroll/keyboard-based transitions
  return (
    <div className="relative w-full h-screen">
      {/* Horizontal grey dotted timeline across the full right pane; above wrapper, below card */}
      <div
        aria-hidden="true"
        className={"pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 z-[5]"}
      >
        <div className="w-full h-0 border-t-2 border-gray-600 border-dashed opacity-90"></div>
      </div>

      {/* Progress ticks removed to avoid green check behind cards */}

      {/* Narrow centered section for wizard content */}
      <section
        id="structure-preview"
        className="relative w-full h-full overflow-hidden"
        tabIndex={0}
      >
        

        {/* Slides container: four steps (Upload, Process, Schedule, Confirm) */}
        <div
          className="relative z-10 flex h-screen transition-transform duration-700 ease-out"
          style={{ width: `${100 * totalSlides}%`, transform: `translateX(-${(stepIndex || 0) * perSlideShift}%)` }}
        >
        {/* Slide 1: Upload */}
        <div className="w-full h-screen relative">
          {/* Centered card */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 flex flex-col items-center z-0">
            <div
              className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl w-full p-6 max-w-[620px] relative z-10"
              aria-label="Upload container"
            >
              <h2 className="text-white font-extrabold uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl text-center py-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                STEP 1
              </h2>
              {uploadContent && (
                <div className="w-full">
                  {uploadContent}
                </div>
              )}
            </div>
            {/* Navigation controls under card with 16px gutter */}
            <div className="mt-4 relative z-10 flex items-center justify-center">
              <div className="flex items-center gap-2">
                {typeof onNext === 'function' && (
                  <button
                    className="btn btn-primary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg md:text-xl shadow-2xl min-w-[180px] sm:min-w-[220px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onNext}
                    disabled={!uploadCompleted}
                    aria-disabled={!uploadCompleted}
                  >
                    Next step
                  </button>
                )}
                {!uploadCompleted && (
                  <div className="group relative">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold shadow"
                      aria-label="Upload required tooltip"
                    >
                      ?
                    </button>
                    <div
                      role="tooltip"
                      className="absolute left-1/2 -translate-x-1/2 mt-2 w-max max-w-xs px-3 py-2 rounded-lg bg-gray-800 text-white text-xs shadow-lg opacity-0 group-hover:opacity-100"
                    >
                      Upload content to proceed to the next step
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Removed the below-card completion indicator to avoid overlapping the Next step button */}
        </div>

        {/* Slide 2: Process */}
        <div className="w-full h-screen relative">
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 flex flex-col items-center z-0">
            <div
              className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 w-full max-w-[620px] relative z-10"
              aria-label="Process container"
            >
              <h2 className="text-white font-extrabold uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl text-center py-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                STEP 2
              </h2>
              {processContent && (
                <div className="w-full">
                  {processContent}
                </div>
              )}
            </div>
            {/* Navigation controls under card with 16px gutter */}
            <div className="mt-4 relative z-10 flex items-center justify-center gap-3">
              {typeof onPrev === 'function' && (
                <button className="btn btn-secondary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg md:text-xl min-w-[140px] sm:min-w-[160px]" onClick={onPrev}>
                  Back
                </button>
              )}
              {typeof onNext === 'function' && (
                <button
                  className="btn btn-primary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg md:text-xl min-w-[140px] sm:min-w-[160px]"
                  onClick={onNext}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Slide 3: Schedule */}
        <div className="w-full h-screen relative">
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 flex flex-col items-center z-0">
            <div
              className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 w-full max-w-[620px] relative z-10"
              aria-label="Schedule container"
            >
              <h2 className="text-white font-extrabold uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl text-center py-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                STEP 3
              </h2>
              <div className="w-full"></div>
            </div>
            {/* Navigation controls under card with 16px gutter */}
            <div className="mt-4 relative z-10 flex items-center justify-center gap-3">
              {typeof onPrev === 'function' && (
                <button className="btn btn-secondary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg md:text-xl min-w-[140px] sm:min-w-[160px]" onClick={onPrev}>
                  Back
                </button>
              )}
              {typeof onNext === 'function' && (
                <button className="btn btn-primary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg md:text-xl shadow-2xl min-w-[180px] sm:min-w-[220px]" onClick={onNext}>
                  Next step
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Slide 4: Confirm & Finish */}
        <div className="w-full h-screen relative">
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 flex flex-col items-center z-0">
            <div
              className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 w-full max-w-[620px] relative z-10"
              aria-label="Confirm container"
            >
              <h2 className="text-white font-extrabold uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl text-center py-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                STEP 4
              </h2>
              <div className="w-full"></div>
            </div>
            {/* Navigation controls under card with 16px gutter */}
            <div className="mt-4 relative z-10 flex items-center justify-center gap-3">
              {typeof onPrev === 'function' && (
                <button className="btn btn-secondary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg md:text-xl min-w-[140px] sm:min-w-[160px]" onClick={onPrev}>
                  Back
                </button>
              )}
              {typeof onFinish === 'function' && (
                <button
                  className="btn btn-primary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg md:text-xl shadow-2xl min-w-[180px] sm:min-w-[220px]"
                  onClick={onFinish}
                  disabled={!scheduleCompleted}
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}

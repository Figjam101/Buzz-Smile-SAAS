import React, { useState } from 'react';
import { Upload, Video, CheckCircle as CheckIcon, CalendarDays } from 'lucide-react';
import SchedulingWizard from './SchedulingWizard';

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
}) {
  const [confirmed, setConfirmed] = useState(false);
  const lastIndex = 3; // four slides: 0,1,2,3
  const totalSlides = lastIndex + 1;
  const perSlideShift = 100 / totalSlides; // percent of track width to move per slide
  // Navigation is button-driven only; disable scroll/keyboard-based transitions
  return (
    <section
      id="structure-preview"
      className="relative w-full h-[calc(100vh-4rem)] overflow-hidden"
      tabIndex={0}
    >
      {/* Horizontal grey dotted timeline across middle */}
      <div aria-hidden="true" className="pointer-events-none absolute left-0 right-0 top-[calc(50%-40px)] z-0">
        <div className="w-full h-0 border-t-2 border-gray-300 border-dashed opacity-80"></div>
      </div>

      {/* Progress ticks between steps on the timeline (only after completion) */}
      {(() => {
        const baseTick = 'w-8 h-8 rounded-full flex items-center justify-center ring-2 bg-green-500 text-white ring-green-300 shadow';
        return (
          <div aria-hidden="true" className="absolute left-0 right-0 top-[calc(50%-40px)] z-10">
            {uploadCompleted && (
              <div className="absolute left-[25%] -translate-x-1/2 -translate-y-1/2">
                <div className={baseTick}>✓</div>
              </div>
            )}
            {processCompleted && (
              <div className="absolute left-[50%] -translate-x-1/2 -translate-y-1/2">
                <div className={baseTick}>✓</div>
              </div>
            )}
            {scheduleCompleted && (
              <div className="absolute left-[75%] -translate-x-1/2 -translate-y-1/2">
                <div className={baseTick}>✓</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Slides container: four steps (Upload, Process, Schedule, Confirm) */}
      <div
        className="relative z-10 flex h-[calc(100vh-4rem)] transition-transform duration-700 ease-out"
        style={{ width: `${100 * totalSlides}%`, transform: `translateX(-${(stepIndex || 0) * perSlideShift}%)` }}
      >
        {/* Slide 1: Upload */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Action button offset to top-right of page container */}
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20">
            <button className="btn btn-primary w-14 h-14 rounded-full flex items-center justify-center shadow-lg" aria-label="Upload files">
              <Upload className="w-6 h-6 text-white" />
            </button>
          </div>
          {/* Card centered (nudged upward for page-balanced look) */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-4 lg:px-0 flex justify-center">
            <div className="glass-card shiny-outline rounded-3xl px-7 py-9 w-full max-w-[720px]" aria-label="Upload container">
              {uploadContent && (
                <div className="w-full">
                  {uploadContent}
                </div>
              )}
            </div>
          </div>
          {/* Navigation controls under card (outside container) */}
          <div className="absolute left-1/2 top-[calc(50%+200px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            {typeof onNext === 'function' && (
              <button className="btn btn-primary rounded-full px-6 py-3 text-base md:text-lg" onClick={onNext}>
                Next step
              </button>
            )}
          </div>
          {/* Completion indicator slightly below card */}
          {uploadCompleted && (
            <div className="absolute left-1/2 top-[calc(50%+160px)] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
              <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center shadow ring-2 ring-green-300">
                ✓
              </div>
            </div>
          )}
        </div>

        {/* Slide 2: Process */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Action button offset to top-right of page container */}
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20">
            <button className="btn btn-primary w-16 h-16 rounded-full flex items-center justify-center shadow-lg" aria-label="Process Video">
              <Video className="w-7 h-7 text-white" />
            </button>
          </div>
          {/* Card centered (nudged upward for page-balanced look) */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-4 lg:px-0 flex justify-center">
            <div className="glass-card shiny-outline rounded-3xl px-7 py-9 w-full max-w-[720px] min-h-[120px]" aria-label="Process container">
              {processContent ? (
                processContent
              ) : (
                <div className="w-full">
                  <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                    <div className="flex items-start gap-3">
                      <CheckIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Your video is getting ready to be edited.</p>
                        <p className="text-sm">We’ll notify you when it’s ready to post.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Navigation controls under card */}
          <div className="absolute left-1/2 top-[calc(50%+200px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3">
            {typeof onPrev === 'function' && (
              <button className="btn btn-secondary rounded-full px-5 py-2" onClick={onPrev}>
                Back
              </button>
            )}
            {typeof onNext === 'function' && (
              <button className="btn btn-primary rounded-full px-5 py-2" onClick={onNext}>
                Next
              </button>
            )}
          </div>
        </div>

        {/* Slide 3: Schedule */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Action button offset to top-right of page container */}
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20">
            <button className="btn btn-primary w-16 h-16 rounded-full flex items-center justify-center shadow-lg" aria-label="Schedule Post">
              <CalendarDays className="w-7 h-7 text-white" />
            </button>
          </div>
          {/* Card centered */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-4 lg:px-0 flex justify-center">
            <div className="glass-card shiny-outline rounded-3xl px-7 py-9 w-full max-w-[720px]" aria-label="Schedule container">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Schedule your post</h3>
              </div>
              <SchedulingWizard onSchedule={() => { /* inline scheduling confirm, handled by wizard toast */ }} />
            </div>
          </div>
          {/* Navigation controls under card */}
          <div className="absolute left-1/2 top-[calc(50%+200px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3">
            {typeof onPrev === 'function' && (
              <button className="btn btn-secondary rounded-full px-5 py-2" onClick={onPrev}>
                Back
              </button>
            )}
            {typeof onNext === 'function' && (
              <button className="btn btn-primary rounded-full px-5 py-2" onClick={onNext}>
                Next
              </button>
            )}
          </div>
        </div>

        {/* Slide 4: Confirm & Finish */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Action button offset to top-right of page container */}
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20">
            <button className="btn btn-primary w-16 h-16 rounded-full flex items-center justify-center shadow-lg" aria-label="Confirm Setup">
              <CheckIcon className="w-7 h-7 text-white" />
            </button>
          </div>
          {/* Card centered */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-4 lg:px-0 flex justify-center">
            <div className="glass-card shiny-outline rounded-3xl px-7 py-9 w-full max-w-[720px]" aria-label="Confirm container">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Confirm your setup</h3>
                <label className="flex items-center gap-3 text-gray-800">
                  <input
                    id="confirmSetup"
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>I confirm the upload, processing options, and scheduled post.</span>
                </label>
              </div>
            </div>
          </div>
          {/* Navigation controls under card */}
          <div className="absolute left-1/2 top-[calc(50%+200px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3">
            {typeof onPrev === 'function' && (
              <button className="btn btn-secondary rounded-full px-5 py-2" onClick={onPrev}>
                Back
              </button>
            )}
            {typeof onFinish === 'function' && (
              <button className="btn btn-primary rounded-full px-5 py-2" onClick={onFinish} disabled={!confirmed}>
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
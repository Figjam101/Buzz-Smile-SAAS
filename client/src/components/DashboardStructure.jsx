import React, { useState } from 'react';
import { Video, CheckCircle as CheckIcon, CalendarDays } from 'lucide-react';
import SchedulingWizard from './SchedulingWizard';
import BouncyBallsBackground from './BouncyBallsBackground';

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
  const [confirmed, setConfirmed] = useState(false);
  const [bgTheme, setBgTheme] = useState('softGraphite');
  const [accent, setAccent] = useState({ base: '#3BA7FF', light: 'rgba(59,167,255,0.30)' });
  const [calmMode, setCalmMode] = useState(true);
  const [intensity, setIntensity] = useState(0.45);
  const [bgCustom, setBgCustom] = useState('#141922');
  const [sectionAccents, setSectionAccents] = useState({
    upload: '#3BA7FF',
    process: '#B066FF',
    schedule: '#10B981',
    confirm: '#D6B466',
  });

  // Helpers to soften accent colors when Calm Mode is enabled
  function hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }
  function lightenHex(hex, amount = 0.2) {
    const { r, g, b } = hexToRgb(hex);
    const lr = Math.round(r + (255 - r) * amount);
    const lg = Math.round(g + (255 - g) * amount);
    const lb = Math.round(b + (255 - b) * amount);
    return `#${lr.toString(16).padStart(2, '0')}${lg
      .toString(16)
      .padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  }
  function toRgba(hex, alpha = 0.25) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const accentBaseEffective = calmMode ? lightenHex(accent.base, 0.25) : accent.base;
  const accentLightEffective = calmMode ? toRgba(accent.base, 0.22) : accent.light;
  // Per-section effective accents
  const eff = (hex) => ({
    base: calmMode ? lightenHex(hex, 0.25) : hex,
    light: calmMode ? toRgba(hex, 0.22) : toRgba(hex, 0.30),
  });
  const uploadEff = eff(sectionAccents.upload);
  const processEff = eff(sectionAccents.process);
  const scheduleEff = eff(sectionAccents.schedule);
  const confirmEff = eff(sectionAccents.confirm);
  const currentEff = [uploadEff, processEff, scheduleEff, confirmEff][Math.max(0, Math.min(3, stepIndex || 0))];
  const PREVIEW_GRADIENTS = {
    noir: 'linear-gradient(180deg, #0f1117, #12141b, #161a22)',
    midnight: 'linear-gradient(180deg, #0d1a2b, #112338, #162b45)',
    graphite: 'linear-gradient(180deg, #111827, #0f172a, #0e1627)',
    warmSlate: 'linear-gradient(180deg, #0e1318, #141b22, #1a232c)',
    luxeNavy: 'linear-gradient(180deg, #0a0f1f, #0b1220, #0f1a2c)',
    plum: 'linear-gradient(180deg, #1a0f24, #221533, #2a1b42)',
    softGraphite: 'linear-gradient(180deg, #141922, #171e28, #1b2430)',
    softNavy: 'linear-gradient(180deg, #0e1622, #111b2a, #142133)',
    inkWash: 'linear-gradient(180deg, #16181d, #191c22, #1d2027)',
    duskGrey: 'linear-gradient(180deg, #1a1d23, #1d2128, #21252e)',
  };
  const COMBO_PRESETS = [
    // Nightlife (neon, desaturated enough for UI)
    { key: 'noirCyan', label: 'Neon Noir + Electric Cyan', bg: 'noir', accent: { base: '#00E0FF', light: 'rgba(0,224,255,0.35)' } },
    { key: 'noirMagenta', label: 'Neon Noir + Magenta', bg: 'noir', accent: { base: '#FF3B93', light: 'rgba(255,59,147,0.35)' } },
    { key: 'midnightBlue', label: 'Midnight + Royal Blue', bg: 'midnight', accent: { base: '#3BA7FF', light: 'rgba(59,167,255,0.35)' } },
    { key: 'midnightPurple', label: 'Midnight + Ultraviolet', bg: 'midnight', accent: { base: '#B066FF', light: 'rgba(176,102,255,0.35)' } },
    // Real estate (premium neutrals)
    { key: 'graphiteEmerald', label: 'Graphite + Emerald', bg: 'graphite', accent: { base: '#10B981', light: 'rgba(16,185,129,0.35)' } },
    { key: 'warmSlateGold', label: 'Warm Slate + Gold', bg: 'warmSlate', accent: { base: '#D6B466', light: 'rgba(214,180,102,0.35)' } },
    { key: 'luxeNavyAzure', label: 'Luxe Navy + Azure', bg: 'luxeNavy', accent: { base: '#2EA8FF', light: 'rgba(46,168,255,0.35)' } },
    { key: 'plumCoral', label: 'Plum + Coral', bg: 'plum', accent: { base: '#FF7A59', light: 'rgba(255,122,89,0.35)' } },
    // Calmer bases
    { key: 'softGraphiteAzure', label: 'Soft Graphite + Azure', bg: 'softGraphite', accent: { base: '#2EA8FF', light: 'rgba(46,168,255,0.30)' } },
    { key: 'softNavyEmerald', label: 'Soft Navy + Emerald', bg: 'softNavy', accent: { base: '#10B981', light: 'rgba(16,185,129,0.28)' } },
    { key: 'inkWashTeal', label: 'Ink Wash + Teal', bg: 'inkWash', accent: { base: '#2DD4BF', light: 'rgba(45,212,191,0.28)' } },
    { key: 'duskGreyGold', label: 'Dusk Grey + Gold', bg: 'duskGrey', accent: { base: '#D6B466', light: 'rgba(214,180,102,0.28)' } },
  ];
  const lastIndex = 3; // four slides: 0,1,2,3
  const totalSlides = lastIndex + 1;
  const perSlideShift = 100 / totalSlides; // percent of track width to move per slide
  // Navigation is button-driven only; disable scroll/keyboard-based transitions
  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-gray-100">
      {/* Horizontal grey dotted timeline across the full right pane; above wrapper, below card */}
      <div
        aria-hidden="true"
        className={"pointer-events-none absolute left-0 right-0 top-[calc(50%-40px)] z-[5]"}
      >
        <div className="w-full h-0 border-t-2 border-gray-600 border-dashed opacity-90"></div>
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

      {/* Narrow centered section for wizard content */}
      <section
        id="structure-preview"
        className="relative w-full h-full overflow-hidden"
        tabIndex={0}
      >
        {/* Fixed backdrop: brand color, no pattern/bubbles */}
        <BouncyBallsBackground count={0} pattern={false} theme={bgTheme} intensity={intensity} customColor={'#F3F4F6'} flat />

        {/* Slides container: four steps (Upload, Process, Schedule, Confirm) */}
        <div
          className="relative z-10 flex h-[calc(100vh-4rem)] transition-transform duration-700 ease-out"
          style={{ width: `${100 * totalSlides}%`, transform: `translateX(-${(stepIndex || 0) * perSlideShift}%)` }}
        >
        {/* Slide 1: Upload */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Card centered (nudged upward for page-balanced look) */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-2 sm:px-4 lg:px-6 flex justify-center z-0">
            <div
              className="glass-card shiny-outline rounded-3xl w-full px-5 pt-14 pb-5 sm:px-6 sm:pt-16 sm:pb-6 max-w-[440px] sm:max-w-[500px] md:max-w-[560px] lg:max-w-[620px] relative z-10"
              aria-label="Upload container"
            >
              {/* Embedded Step label inside card whitespace */}
              <h2 className="absolute left-1/2 top-4 -translate-x-1/2 text-gray-700 opacity-30 font-bold uppercase tracking-widest">
                STEP 1
              </h2>
              {uploadContent && (
                <div className="w-full">
                  {uploadContent}
                </div>
              )}
            </div>
          </div>
          {/* Navigation controls under card (outside container) */}
          <div className="absolute left-1/2 top-[calc(50%+150px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="flex items-center gap-2">
              {typeof onNext === 'function' && (
                <button
                  className="btn btn-primary rounded-full px-8 py-4 text-lg md:text-xl shadow-2xl min-w-[220px] disabled:opacity-50 disabled:cursor-not-allowed"
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
          {/* Removed the below-card completion indicator to avoid overlapping the Next step button */}
        </div>

        {/* Slide 2: Process */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Step heading: outside the card, centered at the top */}
          <h2 className="absolute left-1/2 top-4 -translate-x-1/2 text-gray-700 opacity-30 font-bold uppercase tracking-widest z-20">
            STEP 2
          </h2>
          {/* Card centered (same layout as Step 1) */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-2 sm:px-4 lg:px-6 flex justify-center z-0">
            <div
              className="glass-card shiny-outline rounded-3xl px-6 pt-16 pb-6 w-full max-w-[560px] relative z-10"
              aria-label="Process container"
            >
              <div className="w-full"></div>
            </div>
          </div>
          {/* Navigation controls under card (outside container) */}
          <div className="absolute left-1/2 top-[calc(50%+150px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3">
            {typeof onPrev === 'function' && (
              <button className="btn btn-secondary rounded-full px-6 py-3" onClick={onPrev}>
                Back
              </button>
            )}
            {typeof onNext === 'function' && (
              <button className="btn btn-primary rounded-full px-6 py-3" onClick={onNext}>
                Next step
              </button>
            )}
          </div>
        </div>

        {/* Slide 3: Schedule */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Step heading: outside the card, centered at the top */}
          <h2 className="absolute left-1/2 top-4 -translate-x-1/2 text-gray-700 opacity-30 font-bold uppercase tracking-widest z-20">
            STEP 3
          </h2>
          {/* Card centered (same layout as Step 1) */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-2 sm:px-4 lg:px-6 flex justify-center z-0">
            <div
              className="glass-card shiny-outline rounded-3xl px-6 pt-16 pb-6 w-full max-w-[560px] relative z-10"
              aria-label="Schedule container"
            >
              <div className="w-full"></div>
            </div>
          </div>
          {/* Navigation controls under card (outside container) */}
          <div className="absolute left-1/2 top-[calc(50%+150px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3">
            {typeof onPrev === 'function' && (
              <button className="btn btn-secondary rounded-full px-6 py-3" onClick={onPrev}>
                Back
              </button>
            )}
            {typeof onNext === 'function' && (
              <button className="btn btn-primary rounded-full px-6 py-3" onClick={onNext}>
                Next step
              </button>
            )}
          </div>
        </div>

        {/* Slide 4: Confirm & Finish */}
        <div className="w-full h-[calc(100vh-4rem)] relative">
          {/* Step heading: outside the card, centered at the top */}
          <h2 className="absolute left-1/2 top-4 -translate-x-1/2 text-gray-700 opacity-30 font-bold uppercase tracking-widest z-20">
            STEP 4
          </h2>
          {/* Card centered (same layout as Step 1) */}
          <div className="absolute left-1/2 top-[calc(50%-40px)] -translate-x-1/2 -translate-y-1/2 w-full px-2 sm:px-4 lg:px-6 flex justify-center z-0">
            <div
              className="glass-card shiny-outline rounded-3xl px-6 pt-16 pb-6 w-full max-w-[560px] relative z-10"
              aria-label="Confirm container"
            >
              <div className="w-full"></div>
            </div>
          </div>
          {/* Navigation controls under card (outside container) */}
          <div className="absolute left-1/2 top-[calc(50%+150px)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3">
            {typeof onPrev === 'function' && (
              <button className="btn btn-secondary rounded-full px-6 py-3" onClick={onPrev}>
                Back
              </button>
            )}
            {typeof onFinish === 'function' && (
              <button
                className="btn btn-primary rounded-full px-6 py-3"
                onClick={onFinish}
                disabled={!confirmed}
              >
                Finish
              </button>
            )}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}

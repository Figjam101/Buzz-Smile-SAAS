import React, { useState } from 'react';
import GlassCard from './ui/GlassCard';
import GlassButton from './ui/GlassButton';

const platformIcons = {
  instagram: '📸', facebook: '📘', tiktok: '🎵', youtube: '▶️', linkedin: '💼'
};

export default function SchedulingWizard({ onSchedule }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const togglePlatform = (p) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const next = () => setStep(Math.min(step + 1, 6));
  const back = () => setStep(Math.max(step - 1, 1));

  const confirm = () => {
    onSchedule?.({ title, caption, hashtags, platforms, date, time });
  };

  return (
    <GlassCard className="p-6">
      <div className="text-sm text-gray-600">Step {step} of 6</div>
      {step === 1 && (
        <div className="mt-3">
          <label className="text-sm text-gray-700">Video title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
            placeholder="Awesome product demo"
            className="mt-1 w-full rounded-lg border border-white/30 bg-white/40 backdrop-blur px-3 py-2" />
          <div className="text-xs text-gray-500 mt-1">{title.length}/100</div>
        </div>
      )}
      {step === 2 && (
        <div className="mt-3">
          <label className="text-sm text-gray-700">Caption</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
            placeholder="Tell your story…"
            className="mt-1 w-full rounded-lg border border-white/30 bg-white/40 backdrop-blur px-3 py-2" />
          <div className="text-xs text-gray-500 mt-1">Keep captions within platform limits</div>
        </div>
      )}
      {step === 3 && (
        <div className="mt-3">
          <label className="text-sm text-gray-700">Hashtags</label>
          <input value={hashtags} onChange={(e) => setHashtags(e.target.value)}
            placeholder="#marketing #video #social"
            className="mt-1 w-full rounded-lg border border-white/30 bg-white/40 backdrop-blur px-3 py-2" />
          <div className="text-xs text-gray-500 mt-1">Tip: Use 3–5 highly relevant hashtags</div>
        </div>
      )}
      {step === 4 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Object.keys(platformIcons).map(p => (
            <button key={p} onClick={() => togglePlatform(p)}
              className={`rounded-lg border px-3 py-2 ${platforms.includes(p) ? 'bg-blue-600 text-white' : 'bg-white/30'}`}
              aria-pressed={platforms.includes(p)}>
              <span className="text-xl" aria-label={p}>{platformIcons[p]}</span>
            </button>
          ))}
        </div>
      )}
      {step === 5 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white/40" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white/40" />
          </div>
        </div>
      )}
      {step === 6 && (
        <div className="mt-3">
          <h4 className="font-semibold">Preview</h4>
          <ul className="mt-2 text-sm text-gray-700">
            <li><strong>Title:</strong> {title}</li>
            <li><strong>Caption:</strong> {caption.slice(0, 200)}{caption.length > 200 ? '…' : ''}</li>
            <li><strong>Hashtags:</strong> {hashtags}</li>
            <li><strong>Platforms:</strong> {platforms.join(', ') || 'None'}</li>
            <li><strong>Schedule:</strong> {date || '—'} {time || ''}</li>
          </ul>
        </div>
      )}
      <div className="mt-6 flex justify-between">
        <GlassButton variant="secondary" onClick={back} disabled={step === 1}>Back</GlassButton>
        {step < 6 ? (
          <GlassButton onClick={next}>Next</GlassButton>
        ) : (
          <GlassButton onClick={confirm}>Schedule</GlassButton>
        )}
      </div>
    </GlassCard>
  );
}
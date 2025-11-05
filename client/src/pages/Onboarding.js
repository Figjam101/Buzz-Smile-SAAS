import React, { useEffect, useState } from 'react';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';

const steps = [
  { title: 'Welcome to BuzzSmile', desc: 'Let’s set up your space for effortless video uploads and scheduling.' },
  { title: 'Connect Social Accounts', desc: 'Link Instagram, Facebook, TikTok, YouTube or LinkedIn to schedule posts.' },
  { title: 'Set Notifications', desc: 'Choose an email for alerts when your video is processed and ready.' },
  { title: 'Default Posting Times', desc: 'Pick preferred times so scheduling is faster every week.' },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const [prefs, setPrefs] = useState({ showOnboarding: true, notifyEmail: '' });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('buzz:onboarding') || '{}');
    setPrefs(prev => ({ ...prev, ...saved }));
  }, []);

  const save = (overrides) => {
    const next = { ...prefs, ...overrides };
    setPrefs(next);
    localStorage.setItem('buzz:onboarding', JSON.stringify(next));
  };

  const complete = () => {
    save({ showOnboarding: false });
    window.location.href = '/dashboard';
  };

  const skip = () => {
    save({ showOnboarding: false });
    window.location.href = '/dashboard';
  };

  const next = () => setI(Math.min(i + 1, steps.length - 1));
  const prev = () => setI(Math.max(i - 1, 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-6">
      <GlassCard className="max-w-2xl w-full p-8">
        <div className="mb-6">
          <div className="text-sm text-gray-600">Step {i + 1} of {steps.length}</div>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{steps[i].title}</h1>
          <p className="mt-2 text-gray-600">{steps[i].desc}</p>
        </div>

        {i === 2 && (
          <div className="space-y-2">
            <label className="text-sm text-gray-700">Notification email</label>
            <input
              type="email"
              value={prefs.notifyEmail}
              onChange={(e) => save({ notifyEmail: e.target.value })}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/30 bg-white/40 backdrop-blur px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-500">We’ll send a friendly alert when your video is processed.</p>
          </div>
        )}

        {i === 3 && (
          <div className="grid grid-cols-2 gap-3">
            {['09:00', '12:00', '18:00', '20:00'].map(t => (
              <button key={t} onClick={() => save({ defaultTime: t })} className={`rounded-lg px-3 py-2 border ${prefs.defaultTime === t ? 'bg-blue-600 text-white' : 'bg-white/30'}`}>{t}</button>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2">
            <GlassButton variant="secondary" onClick={skip}>Skip for now</GlassButton>
            <GlassButton variant="ghost" onClick={() => save({ showOnboarding: true })}>Remind me later</GlassButton>
          </div>
          <div className="flex gap-2">
            <GlassButton variant="secondary" onClick={prev} disabled={i === 0}>Back</GlassButton>
            {i < steps.length - 1 ? (
              <GlassButton onClick={next}>Next</GlassButton>
            ) : (
              <GlassButton onClick={complete}>Finish</GlassButton>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
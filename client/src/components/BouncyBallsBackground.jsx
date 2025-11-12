import React, { useMemo } from 'react';

// UI-friendly background presets (avoids pure black, uses soft charcoals/navies)
const BACKGROUND_PRESETS = {
  noir: 'linear-gradient(180deg, #0f1117 0%, #12141b 55%, #161a22 100%)',
  midnight: 'linear-gradient(180deg, #0d1a2b 0%, #112338 55%, #162b45 100%)',
  graphite: 'linear-gradient(180deg, #111827 0%, #0f172a 55%, #0e1627 100%)',
  warmSlate: 'linear-gradient(180deg, #0e1318 0%, #141b22 55%, #1a232c 100%)',
  luxeNavy: 'linear-gradient(180deg, #0a0f1f 0%, #0b1220 60%, #0f1a2c 100%)',
  plum: 'linear-gradient(180deg, #1a0f24 0%, #221533 55%, #2a1b42 100%)',
  // Softer, less intense bases
  softGraphite: 'linear-gradient(180deg, #141922 0%, #171e28 55%, #1b2430 100%)',
  softNavy: 'linear-gradient(180deg, #0e1622 0%, #111b2a 55%, #142133 100%)',
  inkWash: 'linear-gradient(180deg, #16181d 0%, #191c22 55%, #1d2027 100%)',
  duskGrey: 'linear-gradient(180deg, #1a1d23 0%, #1d2128 55%, #21252e 100%)',
};

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function hexToRgb(hex) {
  const normalized = hex?.replace('#', '') || '';
  if (normalized.length !== 6) return null;
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lighten(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return rgbToHex({ r, g, b });
}

function darken(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r * (1 - amount));
  const g = Math.round(rgb.g * (1 - amount));
  const b = Math.round(rgb.b * (1 - amount));
  return rgbToHex({ r, g, b });
}

function buildBackground(themeKey, intensity = 0.5, customColor) {
  const linear = BACKGROUND_PRESETS[themeKey] || BACKGROUND_PRESETS.noir;
  // Intensity controls the highlight alpha (0 = very soft, 1 = brighter)
  const highlightAlpha = clamp(0.03 + intensity * 0.07, 0.02, 0.10);
  if (customColor) {
    const start = darken(customColor, 0.18);
    const mid = customColor;
    const end = lighten(customColor, 0.10);
    const customLinear = `linear-gradient(180deg, ${start} 0%, ${mid} 55%, ${end} 100%)`;
    return `radial-gradient(900px circle at 50% 42%, rgba(255,255,255,${highlightAlpha}), rgba(255,255,255,0) 60%), ${customLinear}`;
  }
  return `radial-gradient(900px circle at 50% 42%, rgba(255,255,255,${highlightAlpha}), rgba(255,255,255,0) 60%), ${linear}`;
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#eab308', // yellow
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#db2777', // pink
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export default function BouncyBallsBackground({ count = 30, pattern = true, theme = 'noir', intensity = 0.5, customColor = null, flat = false }) {
  const balls = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = Math.round(rand(44, 80)); // px
      const color = COLORS[i % COLORS.length];
      const startLeft = `${Math.round(rand(0, 92))}%`;
      const startTop = `${Math.round(rand(0, 92))}%`;
      const dx = `${Math.round(rand(120, 360))}px`;
      const dy = `${Math.round(rand(140, 420))}px`;
      const durX = `${rand(8, 18).toFixed(2)}s`;
      const durY = `${rand(9, 20).toFixed(2)}s`;
      const delayX = `${rand(0, 3).toFixed(2)}s`;
      const delayY = `${rand(0, 3).toFixed(2)}s`;
      const opacity = rand(0.40, 0.65).toFixed(2);
      return {
        id: i,
        size,
        color,
        startLeft,
        startTop,
        dx,
        dy,
        durX,
        durY,
        delayX,
        delayY,
        opacity,
      };
    });
  }, [count]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {/* Backdrop to improve glassmorphism contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: flat ? (customColor || '#F9FAFB') : buildBackground(theme, intensity, customColor),
        }}
      />
      {/* Angled repeating logo pattern above navy backdrop */}
      {pattern && (
        <div
          className="absolute inset-0 z-[5]"
          style={{
            transform: 'rotate(-18deg)',
            transformOrigin: 'center',
            backgroundImage: "url('/logo192.png')",
            backgroundRepeat: 'repeat',
            backgroundSize: '160px auto',
            backgroundPosition: '0 0',
            opacity: 0.06,
            filter: 'saturate(1.1)'
          }}
        />
      )}
      {balls.map((b) => (
        <div
          key={b.id}
          className="ball-anim-x"
          style={{
            left: b.startLeft,
            top: b.startTop,
            '--dx': b.dx,
            animationDuration: b.durX,
            animationDelay: b.delayX,
          }}
        >
          <div
            className="ball"
            style={{
              width: b.size,
              height: b.size,
              background: b.color,
              opacity: b.opacity,
              '--dy': b.dy,
              animationDuration: b.durY,
              animationDelay: b.delayY,
              boxShadow: '0 8px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

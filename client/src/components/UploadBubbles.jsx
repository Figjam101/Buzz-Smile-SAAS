import React, { useMemo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Deterministic PRNG so bubbles keep positions across steps/mounts
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    // Clarify precedence between bitwise XOR and zero-fill right shift
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
}
function strSeed(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h >>> 0;
}
function rand(min, max, r) {
  const n = typeof r === 'function' ? r() : Math.random();
  return n * (max - min) + min;
}

export default function UploadBubbles({ files = [], className = '', onDelete }) {
  const [thumbs, setThumbs] = useState({});
  const [mountEl, setMountEl] = useState(null);
  const [hovering, setHovering] = useState(false);
  const bubbles = useMemo(() => {
    const MAX_BUBBLES = 6; // cap to prevent GPU overload
    return files.slice(0, MAX_BUBBLES).map((vf, i) => {
      const file = vf.file || vf;
      const url = URL.createObjectURL(file);
      const seedStr = `${vf.id || i}-${file?.name || ''}-${file?.size || ''}`;
      const r = mulberry32(strSeed(seedStr));
      const size = Math.round(rand(52, 76, r));
      const startLeft = `${Math.round(rand(6, 80, r))}%`;
      const startTop = `${Math.round(rand(8, 70, r))}%`;
      const dx = `${Math.round(rand(100, 240, r))}px`;
      const dy = `${Math.round(rand(100, 220, r))}px`;
      const durX = `${rand(10, 18, r).toFixed(2)}s`;
      const durY = `${rand(10, 18, r).toFixed(2)}s`;
      const delayX = `${rand(0, 2, r).toFixed(2)}s`;
      const delayY = `${rand(0, 2, r).toFixed(2)}s`;
      return { id: vf.id || i, file, url, size, startLeft, startTop, dx, dy, durX, durY, delayX, delayY };
    });
  }, [files]);

  useEffect(() => {
    // Create a global layer so bubbles are not constrained to the card container
    if (typeof document !== 'undefined' && !mountEl) {
      const el = document.createElement('div');
      el.className = 'upload-bubbles-layer';
      // Fixed, full-viewport, non-interactive, behind other content
      el.style.position = 'fixed';
      el.style.inset = '0';
      // Keep wrapper non-interactive; individual bubbles will enable pointer events
      el.style.pointerEvents = 'none';
      // Keep on top of the upload card and other content
      el.style.zIndex = '300';
      document.body.appendChild(el);
      setMountEl(el);
    }
  }, [mountEl]);

  useEffect(() => {
    // Capture a quick thumbnail per file (video or image) using an offscreen canvas
    const resources = [];
    bubbles.forEach((b) => {
      if (thumbs[b.id]) return; // already captured
      const type = b.file?.type || '';
      const name = b.file?.name?.toLowerCase() || '';
      const isImage = type.startsWith('image/') || /(\.jpg|\.jpeg|\.png|\.gif|\.webp|\.heic|\.heif)$/.test(name);
      if (isImage) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = b.url;
          resources.push({ kind: 'img', el: img, url: b.url });
          img.onload = async () => {
            try {
              try { await img.decode?.(); } catch (_) {}
              const canvas = document.createElement('canvas');
              const maxW = 320;
              const scale = Math.min(1, maxW / (img.naturalWidth || b.size));
              const w = Math.round((img.naturalWidth || b.size) * scale) || b.size;
              const h = Math.round((img.naturalHeight || b.size) * scale) || b.size;
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              setThumbs((prev) => ({ ...prev, [b.id]: dataUrl }));
            } catch (_) {}
            try { URL.revokeObjectURL(b.url); } catch (_) {}
          };
          img.onerror = () => {
            // If image fails to decode, leave placeholder
            try { URL.revokeObjectURL(b.url); } catch (_) {}
          };
        } catch (_) {}
      } else {
        try {
          const vid = document.createElement('video');
          vid.preload = 'metadata';
          vid.muted = true;
          vid.playsInline = true;
          vid.src = b.url;
          resources.push({ kind: 'vid', el: vid, url: b.url });
          const onLoadedMeta = () => {
            try {
              // Seek slightly forward to ensure a decoded frame
              vid.currentTime = 0.12;
            } catch (_) {}
          };
          const onSeeked = () => {
            try {
              const canvas = document.createElement('canvas');
              const w = Math.min(vid.videoWidth || b.size, 320);
              const hRaw = (vid.videoHeight || b.size);
              const h = Math.round(hRaw * (w / (vid.videoWidth || b.size)));
              canvas.width = w;
              canvas.height = h > 0 ? h : w;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              setThumbs((prev) => ({ ...prev, [b.id]: dataUrl }));
            } catch (_) {
              // fallback: keep placeholder
            } finally {
              try {
                vid.removeEventListener('loadedmetadata', onLoadedMeta);
                vid.removeEventListener('seeked', onSeeked);
                vid.pause();
              } catch (_) {}
              try { URL.revokeObjectURL(b.url); } catch (_) {}
            }
          };
          vid.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
          vid.addEventListener('seeked', onSeeked, { once: true });
        } catch (_) {}
      }
    });
    return () => {
      // Clean up loaders and blob URLs to avoid ERR_FILE_NOT_FOUND spam
      resources.forEach((r) => {
        try {
          if (r.kind === 'img') {
            r.el.onload = null;
            r.el.onerror = null;
            r.el.src = '';
          } else if (r.kind === 'vid') {
            r.el.pause?.();
            r.el.removeEventListener?.('loadedmetadata', () => {});
            r.el.removeEventListener?.('seeked', () => {});
            r.el.src = '';
            r.el.removeAttribute?.('src');
            r.el.load?.();
          }
        } catch (_) {}
        // IMPORTANT: Do NOT revoke here.
        // In React dev mode (StrictMode), effects run twice which can
        // trigger cleanup before the image/video loader has finished.
        // Revoking the object URL during cleanup causes the browser
        // to attempt a network fetch for a now-invalid blob URL,
        // resulting in net::ERR_FILE_NOT_FOUND logs.
        // We only revoke the object URLs inside the onload/onerror/onseeked
        // handlers above, after we've captured the thumbnail.
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  if (!files || files.length === 0) return null;

  if (!mountEl) return null;
  return createPortal(
    <div
      className={`absolute inset-0 ${className} ${hovering ? 'bubbles-paused' : ''}`}
      style={{ zIndex: 300, willChange: 'transform, opacity', pointerEvents: 'none' }}
    >
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="upload-bubble-anim-x"
          style={{
            left: b.startLeft,
            top: b.startTop,
            '--dx': b.dx,
            animationDuration: b.durX,
            animationDelay: b.delayX,
          }}
        >
          <div
            className={`upload-bubble upload-bubble--badge ${thumbs[b.id] ? 'upload-bubble--ready upload-bubble--highlight' : 'upload-bubble--loading upload-bubble--highlight'}`}
            style={{
              width: b.size,
              height: b.size,
              '--dy': b.dy,
              animationDuration: b.durY,
              animationDelay: b.delayY,
              boxShadow: '0 10px 22px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.35)',
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {thumbs[b.id] ? (
              <img src={thumbs[b.id]} alt="thumbnail" className="upload-bubble-thumb" />
            ) : (
              // lightweight placeholder while thumbnail is captured
              <div className="upload-bubble-thumb" style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #e9eef7 100%)'
              }} />
            )}
            {/* Removed bubble-level tick for a cleaner overlay */}
            {hovering && (
              <button
                type="button"
                className="upload-bubble-delete"
                aria-label="Remove selection"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete && onDelete(b.id); }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>,
    mountEl
  );
}
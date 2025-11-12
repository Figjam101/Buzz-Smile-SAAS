import React, { useMemo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export default function UploadBubbles({ files = [] }) {
  const [thumbs, setThumbs] = useState({});
  const [mountEl, setMountEl] = useState(null);
  const bubbles = useMemo(() => {
    const MAX_BUBBLES = 6; // cap to prevent GPU overload
    return files.slice(0, MAX_BUBBLES).map((vf, i) => {
      const file = vf.file || vf;
      const url = URL.createObjectURL(file);
      const size = Math.round(rand(48, 72));
      const startLeft = `${Math.round(rand(4, 80))}%`;
      const startTop = `${Math.round(rand(6, 70))}%`;
      const dx = `${Math.round(rand(80, 240))}px`;
      const dy = `${Math.round(rand(80, 220))}px`;
      const durX = `${rand(10, 18).toFixed(2)}s`;
      const durY = `${rand(10, 18).toFixed(2)}s`;
      const delayX = `${rand(0, 2).toFixed(2)}s`;
      const delayY = `${rand(0, 2).toFixed(2)}s`;
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
      el.style.pointerEvents = 'none';
      // Keep on top of the upload card and other content
      el.style.zIndex = '40';
      document.body.appendChild(el);
      setMountEl(el);
    }
  }, [mountEl]);

  useEffect(() => {
    // Capture a quick thumbnail per file (video or image) using an offscreen canvas
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
          img.onload = () => {
            try {
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
          };
          img.onerror = () => {
            // If image fails to decode, leave placeholder
          };
        } catch (_) {}
      } else {
        try {
          const vid = document.createElement('video');
          vid.preload = 'metadata';
          vid.muted = true;
          vid.playsInline = true;
          vid.src = b.url;
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
            }
          };
          vid.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
          vid.addEventListener('seeked', onSeeked, { once: true });
        } catch (_) {}
      }
    });
    return () => {
      // Revoke all object URLs when component unmounts or files change
      bubbles.forEach(b => URL.revokeObjectURL(b.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  if (!files || files.length === 0) return null;

  if (!mountEl) return null;
  return createPortal(
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 40 }}>
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
            }}
          >
            {thumbs[b.id] ? (
              <img src={thumbs[b.id]} alt="thumbnail" className="upload-bubble-thumb" />
            ) : (
              // lightweight placeholder while thumbnail is captured
              <div className="upload-bubble-thumb" style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #e9eef7 100%)'
              }} />
            )}
            {thumbs[b.id] && (
              <span className="upload-bubble-tick" aria-label="Upload complete">✓</span>
            )}
          </div>
        </div>
      ))}
    </div>,
    mountEl
  );
}
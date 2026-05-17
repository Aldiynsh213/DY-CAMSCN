import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultCorners, getImageSize, perspectiveCropToDataUrl } from '../utils/image';
import { Check, Loader2, RotateCcw, Wand2 } from 'lucide-react';

const handles = ['tl', 'tr', 'br', 'bl'];

export default function CornerEditor({ shot, onCancel, onSave }) {
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const [imageSize, setImageSize] = useState(null);
  const [corners, setCorners] = useState(null);
  const [dragKey, setDragKey] = useState(null);
  const [mode, setMode] = useState('magic');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getImageSize(shot).then((size) => {
      setImageSize(size);
      setCorners(defaultCorners(size.width, size.height));
    });
  }, [shot]);

  const display = useMemo(() => {
    if (!imgRef.current || !imageSize) return { x: 0, y: 0, w: 1, h: 1, sx: 1, sy: 1 };

    const rect = imgRef.current.getBoundingClientRect();
    const wrapRect = wrapRef.current.getBoundingClientRect();

    return {
      x: rect.left - wrapRect.left,
      y: rect.top - wrapRect.top,
      w: rect.width,
      h: rect.height,
      sx: rect.width / imageSize.width,
      sy: rect.height / imageSize.height,
    };
  }, [imageSize, corners]);

  function toScreen(point) {
    return {
      x: display.x + point.x * display.sx,
      y: display.y + point.y * display.sy,
    };
  }

  function updateFromPointer(event) {
    if (!dragKey || !imageSize || !wrapRef.current) return;

    const rect = wrapRef.current.getBoundingClientRect();
    const client = event.touches ? event.touches[0] : event;

    const x = (client.clientX - rect.left - display.x) / display.sx;
    const y = (client.clientY - rect.top - display.y) / display.sy;

    setCorners((current) => ({
      ...current,
      [dragKey]: {
        x: Math.max(0, Math.min(imageSize.width, x)),
        y: Math.max(0, Math.min(imageSize.height, y)),
      },
    }));
  }

  useEffect(() => {
    function stop() {
      setDragKey(null);
    }

    window.addEventListener('pointermove', updateFromPointer);
    window.addEventListener('pointerup', stop);
    window.addEventListener('touchmove', updateFromPointer, { passive: false });
    window.addEventListener('touchend', stop);

    return () => {
      window.removeEventListener('pointermove', updateFromPointer);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('touchmove', updateFromPointer);
      window.removeEventListener('touchend', stop);
    };
  });

  async function applyScan() {
    if (!corners) return;

    setProcessing(true);

    try {
      const dataUrl = await perspectiveCropToDataUrl(shot, corners, {
        mode,
        normalizeA4: true,
        quality: 0.94,
      });

      onSave({
        id: crypto.randomUUID(),
        dataUrl,
        createdAt: Date.now(),
        mode,
      });
    } finally {
      setProcessing(false);
    }
  }

  if (!corners || !imageSize) {
    return (
      <div className="modal">
        <div className="modalCard loading">
          <Loader2 className="spin" />
          <p>Menyiapkan editor...</p>
        </div>
      </div>
    );
  }

  const points = handles.map((key) => toScreen(corners[key]));
  const poly = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="modal">
      <div className="editorPanel">
        <div className="editorTop">
          <div>
            <span><Wand2 size={15} /> Corner Adjust</span>
            <h2>Tarik 4 titik ke sudut dokumen</h2>
          </div>
          <button className="iconBtn" onClick={() => setCorners(defaultCorners(imageSize.width, imageSize.height))}>
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="editCanvas" ref={wrapRef}>
          <img ref={imgRef} src={shot} alt="Dokumen mentah" />
          <svg className="cornerOverlay">
            <polygon points={poly} />
            {handles.map((key) => {
              const p = toScreen(corners[key]);

              return (
                <circle
                  key={key}
                  cx={p.x}
                  cy={p.y}
                  r="17"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setDragKey(key);
                  }}
                  onTouchStart={(event) => {
                    event.preventDefault();
                    setDragKey(key);
                  }}
                />
              );
            })}
          </svg>
        </div>

        <div className="modeRow">
          {[
            ['magic', 'Magic Scan'],
            ['clean', 'Clean Color'],
            ['bw', 'B/W Text'],
            ['original', 'Original'],
          ].map(([value, label]) => (
            <button key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>
              {label}
            </button>
          ))}
        </div>

        <div className="modalActions">
          <button className="secondary" onClick={onCancel} disabled={processing}>Batal</button>
          <button className="primary" onClick={applyScan} disabled={processing}>
            {processing ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
            Terapkan Scan
          </button>
        </div>
      </div>
    </div>
  );
}

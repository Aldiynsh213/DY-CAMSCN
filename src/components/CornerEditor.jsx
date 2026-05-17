import { Check, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultCorners, getImageSize, perspectiveCropToDataUrl } from '../utils/image';

const keys = ['tl', 'tr', 'br', 'bl'];

export default function CornerEditor({ shot, onCancel, onSave }) {
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState(null);
  const [corners, setCorners] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [mode, setMode] = useState('magic');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getImageSize(shot).then((imageSize) => {
      setSize(imageSize);
      setCorners(defaultCorners(imageSize.width, imageSize.height));
    });
  }, [shot]);

  const display = useMemo(() => {
    if (!imgRef.current || !wrapRef.current || !size) {
      return { ox: 0, oy: 0, sx: 1, sy: 1 };
    }

    const imageRect = imgRef.current.getBoundingClientRect();
    const wrapRect = wrapRef.current.getBoundingClientRect();

    return {
      ox: imageRect.left - wrapRect.left,
      oy: imageRect.top - wrapRect.top,
      sx: imageRect.width / size.width,
      sy: imageRect.height / size.height,
    };
  }, [size, corners]);

  function screenPoint(point) {
    return {
      x: display.ox + point.x * display.sx,
      y: display.oy + point.y * display.sy,
    };
  }

  function updatePointer(event) {
    if (!dragging || !wrapRef.current || !size) return;

    const rect = wrapRef.current.getBoundingClientRect();
    const client = event.touches ? event.touches[0] : event;

    const x = (client.clientX - rect.left - display.ox) / display.sx;
    const y = (client.clientY - rect.top - display.oy) / display.sy;

    setCorners((current) => ({
      ...current,
      [dragging]: {
        x: Math.max(0, Math.min(size.width, x)),
        y: Math.max(0, Math.min(size.height, y)),
      },
    }));
  }

  useEffect(() => {
    function stop() {
      setDragging(null);
    }

    window.addEventListener('pointermove', updatePointer);
    window.addEventListener('pointerup', stop);
    window.addEventListener('touchmove', updatePointer, { passive: false });
    window.addEventListener('touchend', stop);

    return () => {
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('touchmove', updatePointer);
      window.removeEventListener('touchend', stop);
    };
  });

  async function apply() {
    if (!corners) return;

    setProcessing(true);

    try {
      const dataUrl = await perspectiveCropToDataUrl(shot, corners, { mode, quality: 0.95 });
      onSave({
        id: crypto.randomUUID(),
        dataUrl,
        mode,
        createdAt: Date.now(),
      });
    } finally {
      setProcessing(false);
    }
  }

  if (!size || !corners) {
    return (
      <div className="editorScreen">
        <Loader2 className="spin" />
      </div>
    );
  }

  const points = keys.map((key) => screenPoint(corners[key]));
  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="editorScreen">
      <div className="editorTop">
        <button onClick={onCancel}>Back</button>
        <strong>Adjust corners</strong>
        <button onClick={() => setCorners(defaultCorners(size.width, size.height))}>
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="editorCanvas" ref={wrapRef}>
        <img ref={imgRef} src={shot} alt="Dokumen mentah" />
        <svg>
          <polygon points={polygon} />
          {keys.map((key) => {
            const p = screenPoint(corners[key]);

            return (
              <circle
                key={key}
                cx={p.x}
                cy={p.y}
                r="20"
                onPointerDown={(event) => {
                  event.preventDefault();
                  setDragging(key);
                }}
                onTouchStart={(event) => {
                  event.preventDefault();
                  setDragging(key);
                }}
              />
            );
          })}
        </svg>
      </div>

      <div className="editorBottom">
        <div className="filterTabs">
          {[
            ['magic', 'Magic'],
            ['clean', 'Clean'],
            ['bw', 'B/W'],
            ['original', 'Original'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={mode === value ? 'active' : ''}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <button className="applyBtn" onClick={apply} disabled={processing}>
          {processing ? <Loader2 className="spin" size={20} /> : <Check size={20} />}
          {processing ? 'Processing...' : 'Save scan'}
        </button>
      </div>
    </div>
  );
}

import { Check, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cropDocument, defaultCorners, getImageSize } from '../utils/image';

const keys = ['tl', 'tr', 'br', 'bl'];

export default function CornerEditor({ shot, onBack, onSave }) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const [size, setSize] = useState(null);
  const [corners, setCorners] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [mode, setMode] = useState('balanced');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getImageSize(shot).then((imageSize) => {
      setSize(imageSize);
      setCorners(defaultCorners(imageSize.width, imageSize.height));
    });
  }, [shot]);

  const display = useMemo(() => {
    if (!wrapRef.current || !imgRef.current || !size) {
      return { ox: 0, oy: 0, sx: 1, sy: 1 };
    }

    const wrap = wrapRef.current.getBoundingClientRect();
    const img = imgRef.current.getBoundingClientRect();

    return {
      ox: img.left - wrap.left,
      oy: img.top - wrap.top,
      sx: img.width / size.width,
      sy: img.height / size.height,
    };
  }, [size, corners]);

  function toScreen(point) {
    return {
      x: display.ox + point.x * display.sx,
      y: display.oy + point.y * display.sy,
    };
  }

  function updatePointer(event) {
    if (!dragging || !size || !wrapRef.current) return;

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

  async function applyCrop() {
    if (!corners) return;

    setProcessing(true);

    try {
      const dataUrl = await cropDocument(shot, corners, { mode, quality: 0.95 });
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
      <div className="editor">
        <Loader2 className="spin" size={30} />
      </div>
    );
  }

  const points = keys.map((key) => toScreen(corners[key]));
  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <section className="editor">
      <header className="editorHeader">
        <button onClick={onBack}>Back</button>
        <strong>Adjust document</strong>
        <button onClick={() => setCorners(defaultCorners(size.width, size.height))}>
          <RotateCcw size={18} />
        </button>
      </header>

      <div className="editorCanvas" ref={wrapRef}>
        <img ref={imgRef} src={shot} alt="Raw document" />
        <svg>
          <polygon points={polygon} />
          {keys.map((key) => {
            const p = toScreen(corners[key]);

            return (
              <circle
                key={key}
                cx={p.x}
                cy={p.y}
                r="19"
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

      <footer className="editorFooter">
        <div className="filters">
          {[
            ['balanced', 'Balanced'],
            ['text', 'Text'],
            ['bw', 'B/W'],
            ['original', 'Original'],
          ].map(([value, label]) => (
            <button key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>
              {label}
            </button>
          ))}
        </div>

        <button className="saveScan" onClick={applyCrop} disabled={processing}>
          {processing ? <Loader2 className="spin" size={20} /> : <Check size={20} />}
          {processing ? 'Processing...' : 'Save Scan'}
        </button>
      </footer>
    </section>
  );
}

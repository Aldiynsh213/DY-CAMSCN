import { Camera, FlipHorizontal, ImagePlus, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { readFileAsDataUrl } from '../utils/pdf';

export default function Scanner({ onAddPage, setActiveTab }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [isStarting, setIsStarting] = useState(false);

  async function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }

  async function startCamera(mode = facingMode) {
    setCameraError('');
    setIsStarting(true);

    try {
      await stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch (error) {
      setCameraError('Kamera tidak bisa dibuka. Pastikan izin kamera aktif dan buka lewat HTTPS atau localhost.');
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function switchCamera() {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  }

  function capturePhoto() {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);

    onAddPage({ dataUrl, rotation: 0, mode: 'clean', source: 'camera' });
    setActiveTab('pages');
  }

  async function handleImport(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const dataUrl = await readFileAsDataUrl(file);
      onAddPage({ dataUrl, rotation: 0, mode: 'clean', source: 'import', name: file.name });
    }

    event.target.value = '';
    setActiveTab('pages');
  }

  return (
    <section className="scanner">
      <div className="heroCard">
        <div className="heroText">
          <span className="eyebrow">
            <ShieldCheck size={15} />
            Frontend-only scanner
          </span>
          <h2>Scan dokumen langsung dari kamera HP.</h2>
          <p>
            Ambil foto dokumen, rapikan warna, susun halaman, lalu export menjadi satu PDF.
            Cocok untuk kerjaan harian tanpa install aplikasi berat.
          </p>
        </div>
      </div>

      <div className="cameraShell">
        <div className={cameraReady ? 'videoWrap ready' : 'videoWrap'}>
          <video ref={videoRef} playsInline muted />

          {!cameraReady && (
            <div className="cameraPlaceholder">
              <Camera size={52} />
              <h3>Kamera belum aktif</h3>
              <p>Tekan tombol mulai kamera. Di HP, gunakan kamera belakang untuk hasil terbaik.</p>
            </div>
          )}

          <div className="scanFrame" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
        </div>

        {cameraError && <div className="alert error">{cameraError}</div>}

        <div className="cameraActions">
          <button className="secondaryBtn" onClick={() => startCamera()} disabled={isStarting}>
            <Zap size={18} />
            {isStarting ? 'Membuka...' : 'Mulai Kamera'}
          </button>

          <button className="secondaryBtn" onClick={switchCamera} disabled={!cameraReady}>
            <FlipHorizontal size={18} />
            Switch
          </button>

          <button className="primaryBtn capture" onClick={capturePhoto} disabled={!cameraReady}>
            <Camera size={22} />
            Ambil Scan
          </button>
        </div>

        <div className="importRow">
          <button className="ghostBtn" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={18} />
            Import foto dari galeri
          </button>

          <button className="ghostBtn" onClick={stopCamera} disabled={!cameraReady}>
            <RotateCcw size={18} />
            Matikan kamera
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImport} />
        </div>
      </div>
    </section>
  );
}

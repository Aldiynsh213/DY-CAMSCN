import { Camera, CheckCircle2, Download, FileDown, ImagePlus, Loader2, Lock, ScanLine, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { autoScanDataUrl, drawLiveDetection, waitForOpenCV } from './utils/opencvScanner';
import { exportScansToPdf } from './utils/pdf';

export default function App() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [cvReady, setCvReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState('magic');
  const [pages, setPages] = useState([]);
  const [message, setMessage] = useState('OpenCV sedang dimuat...');
  const [active, setActive] = useState('scan');

  useEffect(() => {
    waitForOpenCV()
      .then(() => {
        setCvReady(true);
        setMessage('Scanner siap. Buka kamera lalu arahkan ke dokumen.');
      })
      .catch((err) => {
        setMessage(err.message);
      });
  }, []);

  useEffect(() => {
    if (!cameraReady) return;

    const timer = setInterval(() => {
      const found = drawLiveDetection(videoRef.current, overlayRef.current);
      setLocked(found);
    }, 850);

    return () => clearInterval(timer);
  }, [cameraReady]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      setMessage('Membuka kamera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraReady(true);
      setMessage('Arahkan kamera ke dokumen sampai muncul garis hijau.');
    } catch (error) {
      setMessage('Kamera gagal dibuka. Pastikan izin kamera aktif dan gunakan HTTPS atau localhost.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setLocked(false);
  }

  function captureRawFrame() {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.96);
  }

  async function scanFromDataUrl(dataUrl) {
    setProcessing(true);
    setMessage('Mendeteksi tepi dokumen, meluruskan perspektif, lalu membersihkan hasil scan...');

    try {
      const result = await autoScanDataUrl(dataUrl, {
        mode,
        normalizeA4: true,
        quality: 0.94,
      });

      setPages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          dataUrl: result.dataUrl,
          mode,
          found: result.found,
          createdAt: Date.now(),
        },
      ]);

      setActive('pages');
      setMessage(
        result.found
          ? 'Dokumen terdeteksi dan berhasil di-crop otomatis.'
          : 'Dokumen belum terdeteksi sempurna. Hasil tetap disimpan, coba ulangi dengan background lebih kontras.'
      );
    } catch (error) {
      setMessage(error.message || 'Gagal scan dokumen.');
    } finally {
      setProcessing(false);
    }
  }

  async function captureScan() {
    if (!cameraReady || processing) return;
    const dataUrl = captureRawFrame();
    await scanFromDataUrl(dataUrl);
  }

  async function handleImport(event) {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Gagal membaca gambar.'));
        reader.readAsDataURL(file);
      });

      await scanFromDataUrl(dataUrl);
    }

    event.target.value = '';
  }

  function deletePage(id) {
    setPages((current) => current.filter((page) => page.id !== id));
  }

  function movePage(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;

    setPages((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  async function exportPdf() {
    setProcessing(true);
    setMessage('Membuat PDF hasil scan...');
    try {
      await exportScansToPdf(pages, 'dy-camscn-scan.pdf');
      setMessage('PDF berhasil dibuat. Cek folder download kamu.');
    } catch (error) {
      setMessage(error.message || 'Gagal membuat PDF.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <div className="logoMark"><ScanLine size={22} /></div>
          <div>
            <h1>dy-camscn Pro</h1>
            <p>Auto crop · Perspective fix · PDF export</p>
          </div>
        </div>

        <div className={locked ? 'lockBadge on' : 'lockBadge'}>
          {locked ? <CheckCircle2 size={16} /> : <Lock size={16} />}
          {locked ? 'Document locked' : 'Searching'}
        </div>
      </header>

      <nav className="tabs">
        <button onClick={() => setActive('scan')} className={active === 'scan' ? 'active' : ''}>
          <Camera size={17} /> Scan
        </button>
        <button onClick={() => setActive('pages')} className={active === 'pages' ? 'active' : ''}>
          <FileDown size={17} /> Results
        </button>
      </nav>

      <main>
        {active === 'scan' && (
          <section className="scanner">
            <div className="headline">
              <span><Wand2 size={15} /> Scanner seperti CamScanner</span>
              <h2>Auto detect dokumen, crop otomatis, dan luruskan hasil miring.</h2>
              <p>
                Arahkan kamera ke dokumen. Saat garis hijau mengunci area kertas, tekan Scan.
                Sistem akan melakukan perspective correction dan enhancement otomatis.
              </p>
            </div>

            <div className="modeGrid">
              {[
                ['magic', 'Magic Scan', 'Paling mirip scanner'],
                ['clean', 'Clean Color', 'Warna masih natural'],
                ['bw', 'Black & White', 'Teks sangat tegas'],
              ].map(([value, title, desc]) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={mode === value ? 'mode active' : 'mode'}
                >
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </button>
              ))}
            </div>

            <div className="cameraBox">
              <video ref={videoRef} playsInline muted />
              <canvas ref={overlayRef} className="overlay" />

              {!cameraReady && (
                <div className="placeholder">
                  <Camera size={52} />
                  <h3>Kamera belum aktif</h3>
                  <p>Gunakan HP dan tekan Mulai Kamera. Pastikan browser memberi izin kamera.</p>
                </div>
              )}

              {processing && (
                <div className="processing">
                  <Loader2 className="spin" size={34} />
                  <p>Memproses scan...</p>
                </div>
              )}
            </div>

            <div className="actions">
              <button className="secondary" onClick={startCamera} disabled={!cvReady || processing}>
                <Camera size={18} />
                Mulai Kamera
              </button>
              <button className="secondary" onClick={() => fileRef.current?.click()} disabled={!cvReady || processing}>
                <ImagePlus size={18} />
                Import Foto
              </button>
              <button className="primary" onClick={captureScan} disabled={!cameraReady || processing}>
                {processing ? <Loader2 className="spin" size={19} /> : <ScanLine size={19} />}
                Scan Dokumen
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImport} />
            </div>

            <div className={locked ? 'status good' : 'status'}>
              {message}
            </div>
          </section>
        )}

        {active === 'pages' && (
          <section className="results">
            <div className="resultHeader">
              <div>
                <span><FileDown size={15} /> {pages.length} halaman</span>
                <h2>Hasil scan</h2>
                <p>Hasil ini sudah di-crop otomatis dan diluruskan dari sudut dokumen yang terdeteksi.</p>
              </div>
              <button className="primary" onClick={exportPdf} disabled={!pages.length || processing}>
                {processing ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
                Export PDF
              </button>
            </div>

            {!pages.length ? (
              <div className="empty">
                <ScanLine size={54} />
                <h3>Belum ada hasil scan.</h3>
                <p>Kembali ke tab Scan untuk mulai mengambil dokumen.</p>
              </div>
            ) : (
              <div className="pageGrid">
                {pages.map((page, index) => (
                  <article className="pageCard" key={page.id}>
                    <img src={page.dataUrl} alt={`Halaman ${index + 1}`} />
                    <div className="pageMeta">
                      <strong>Page {index + 1}</strong>
                      <span>{page.found ? 'Auto crop berhasil' : 'Manual fallback'}</span>
                    </div>
                    <div className="pageActions">
                      <button onClick={() => movePage(index, -1)}>Up</button>
                      <button onClick={() => movePage(index, 1)}>Down</button>
                      <button className="danger" onClick={() => deletePage(page.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <span>dy-camscn Pro</span>
        <span>by Aldi</span>
      </footer>
    </div>
  );
}

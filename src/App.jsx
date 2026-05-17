import { Camera, Download, FileDown, ImagePlus, Loader2, ScanLine, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CornerEditor from './components/CornerEditor';
import { captureVideoFrame, fileToDataUrl } from './utils/image';
import { exportToPdf } from './utils/pdf';

export default function App() {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState('Siap. Buka kamera atau import foto dokumen.');
  const [shot, setShot] = useState(null);
  const [pages, setPages] = useState([]);
  const [active, setActive] = useState('scan');
  const [exporting, setExporting] = useState(false);

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
      setMessage('Kamera aktif. Foto dokumen, lalu atur 4 titik sudut.');
    } catch (error) {
      setMessage('Kamera gagal dibuka. Pastikan izin kamera aktif dan buka lewat HTTPS atau localhost.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraReady(false);
  }

  function capture() {
    if (!cameraReady || !videoRef.current) return;
    setShot(captureVideoFrame(videoRef.current));
  }

  async function importImages(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const firstImage = files.find((file) => file.type.startsWith('image/'));

    if (!firstImage) {
      setMessage('File yang dipilih bukan gambar.');
      return;
    }

    const dataUrl = await fileToDataUrl(firstImage);
    setShot(dataUrl);
    event.target.value = '';
  }

  function savePage(page) {
    setPages((current) => [...current, page]);
    setShot(null);
    setActive('pages');
    setMessage('Scan berhasil. Tambah halaman lain atau export PDF.');
  }

  function deletePage(id) {
    setPages((current) => current.filter((page) => page.id !== id));
  }

  async function exportPdf() {
    setExporting(true);
    setMessage('Membuat PDF...');

    try {
      await exportToPdf(pages, 'dy-camscn-scan.pdf');
      setMessage('PDF berhasil dibuat. Cek folder Download.');
    } catch (error) {
      setMessage(error.message || 'Gagal export PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="mark"><ScanLine size={22} /></div>
          <div>
            <h1>dy-camscn Stable</h1>
            <p>Manual corner · Perspective fix · Scanner effect</p>
          </div>
        </div>
        <div className="pageCount">{pages.length} halaman</div>
      </header>

      <nav className="tabs">
        <button className={active === 'scan' ? 'active' : ''} onClick={() => setActive('scan')}>
          <Camera size={17} /> Scan
        </button>
        <button className={active === 'pages' ? 'active' : ''} onClick={() => setActive('pages')}>
          <FileDown size={17} /> Results
        </button>
      </nav>

      {active === 'scan' && (
        <main className="scanView">
          <section className="hero">
            <span>Stabil tanpa OpenCV live</span>
            <h2>Hasil scan rapi tanpa bikin browser freeze.</h2>
            <p>
              Ambil foto dokumen, geser 4 titik sudut, lalu sistem akan crop,
              luruskan perspektif, bersihkan warna, dan simpan sebagai halaman PDF.
            </p>
          </section>

          <section className="cameraBox">
            <video ref={videoRef} playsInline muted />
            {!cameraReady && (
              <div className="placeholder">
                <Camera size={54} />
                <h3>Kamera belum aktif</h3>
                <p>Tekan Mulai Kamera di HP. Kamu juga bisa import foto dokumen dari galeri.</p>
              </div>
            )}
          </section>

          <div className="actions">
            <button className="secondary" onClick={startCamera}>
              <Camera size={18} /> Mulai Kamera
            </button>
            <button className="secondary" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={18} /> Import Foto
            </button>
            <button className="primary" onClick={capture} disabled={!cameraReady}>
              <ScanLine size={18} /> Ambil Foto
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={importImages} />
          </div>

          <div className="status">{message}</div>
        </main>
      )}

      {active === 'pages' && (
        <main className="resultsView">
          <section className="resultHeader">
            <div>
              <span>{pages.length} halaman</span>
              <h2>Hasil scan</h2>
              <p>Setiap halaman sudah di-crop dan diluruskan dari 4 titik sudut yang kamu atur.</p>
            </div>
            <button className="primary" onClick={exportPdf} disabled={!pages.length || exporting}>
              {exporting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
              Export PDF
            </button>
          </section>

          {!pages.length ? (
            <section className="empty">
              <ScanLine size={56} />
              <h3>Belum ada halaman.</h3>
              <p>Mulai scan atau import foto dokumen dulu.</p>
            </section>
          ) : (
            <div className="pageGrid">
              {pages.map((page, index) => (
                <article className="pageCard" key={page.id}>
                  <img src={page.dataUrl} alt={`Halaman ${index + 1}`} />
                  <div className="pageMeta">
                    <strong>Page {index + 1}</strong>
                    <button onClick={() => deletePage(page.id)}>
                      <Trash2 size={15} /> Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}

      {shot && (
        <CornerEditor
          shot={shot}
          onCancel={() => setShot(null)}
          onSave={savePage}
        />
      )}

      <footer>
        <span>dy-camscn Stable</span>
        <span>by Aldi</span>
      </footer>
    </div>
  );
}

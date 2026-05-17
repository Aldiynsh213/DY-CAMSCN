import { Camera, Download, FileText, ImagePlus, Loader2, Plus, ScanLine, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CornerEditor from './components/CornerEditor';
import { captureVideoFrame, fileToDataUrl } from './utils/image';
import { createPdfBlob, downloadBlob } from './utils/pdf';

export default function App() {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [view, setView] = useState('camera');
  const [shot, setShot] = useState(null);
  const [pages, setPages] = useState([]);
  const [message, setMessage] = useState('Tap Start Camera.');
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    try {
      setMessage('Opening camera...');

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
      setMessage('Ready. Tap the shutter button.');
    } catch (error) {
      setMessage('Camera failed. Allow camera permission and use HTTPS.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraReady(false);
  }

  function mainCameraAction() {
    if (!cameraReady) {
      startCamera();
      return;
    }

    if (!videoRef.current) return;
    setShot(captureVideoFrame(videoRef.current));
  }

  async function importPhoto(event) {
    const file = Array.from(event.target.files || []).find((item) => item.type.startsWith('image/'));
    if (!file) return;

    setShot(await fileToDataUrl(file));
    event.target.value = '';
  }

  function savePage(page) {
    setPages((current) => [...current, page]);
    setShot(null);
    setView('result');
    setMessage('Scan saved. Add page or download PDF.');
  }

  async function exportPdf() {
    if (!pages.length) {
      setMessage('No scan pages yet.');
      return;
    }

    setExporting(true);
    setMessage('Creating PDF...');

    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);

      const blob = await createPdfBlob(pages);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      downloadBlob(blob, 'dy-camscn-scan.pdf');
      setMessage('PDF downloaded. If it does not start, tap Open PDF.');
    } catch (error) {
      setMessage(error.message || 'Failed to create PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="app">
      {shot && (
        <CornerEditor
          shot={shot}
          onCancel={() => setShot(null)}
          onSave={savePage}
        />
      )}

      {view === 'camera' && (
        <section className="cameraView">
          <div className="cameraTop">
            <div>
              <strong>dy-camscn</strong>
              <span>{pages.length} page{pages.length === 1 ? '' : 's'}</span>
            </div>
            <button onClick={() => setView('result')} className="miniBtn">
              <FileText size={18} />
              Results
            </button>
          </div>

          <div className="cameraStage">
            <video ref={videoRef} playsInline muted />
            {!cameraReady && (
              <div className="cameraIntro">
                <ScanLine size={58} />
                <h1>Document Scanner</h1>
                <p>Start camera, take photo, adjust corners, then export a clean PDF.</p>
              </div>
            )}
            {cameraReady && <div className="guideFrame" />}
          </div>

          <div className="cameraBottom">
            <p>{message}</p>
            <button className={cameraReady ? 'shutter' : 'startBtn'} onClick={mainCameraAction}>
              {cameraReady ? <Camera size={28} /> : 'Start Camera'}
            </button>
          </div>
        </section>
      )}

      {view === 'result' && (
        <section className="resultView">
          <header className="resultTop">
            <button onClick={() => setView('camera')} className="miniBtn">
              <Plus size={18} />
              Add
            </button>
            <div>
              <strong>Scan Results</strong>
              <span>{pages.length} page{pages.length === 1 ? '' : 's'}</span>
            </div>
            <button onClick={() => fileRef.current?.click()} className="miniBtn">
              <ImagePlus size={18} />
              Import
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={importPhoto} />
          </header>

          {!pages.length ? (
            <div className="empty">
              <ScanLine size={58} />
              <h2>No scans yet</h2>
              <p>Tap Add to capture a document.</p>
            </div>
          ) : (
            <div className="pages">
              {pages.map((page, index) => (
                <article key={page.id} className="pageCard">
                  <img src={page.dataUrl} alt={`Page ${index + 1}`} />
                  <div>
                    <strong>Page {index + 1}</strong>
                    <button onClick={() => setPages((current) => current.filter((item) => item.id !== page.id))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="downloadPanel">
            <p>{message}</p>
            <button className="downloadBtn" onClick={exportPdf} disabled={!pages.length || exporting}>
              {exporting ? <Loader2 className="spin" size={20} /> : <Download size={20} />}
              {exporting ? 'Creating PDF...' : 'Download PDF'}
            </button>
            {pdfUrl && (
              <a className="openPdf" href={pdfUrl} target="_blank" rel="noreferrer">
                Open PDF preview
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

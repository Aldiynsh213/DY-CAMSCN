import { Camera, Download, FileText, Loader2, Plus, ScanLine, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CornerEditor from './components/CornerEditor';
import { captureVideoFrame } from './utils/image';
import { makePdf, openPdfPreview, savePdf } from './utils/pdf';

export default function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [view, setView] = useState('camera');
  const [cameraReady, setCameraReady] = useState(false);
  const [shot, setShot] = useState(null);
  const [pages, setPages] = useState([]);
  const [message, setMessage] = useState('Start camera.');
  const [exporting, setExporting] = useState(false);
  const [lastPdf, setLastPdf] = useState(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      setMessage('Opening camera...');

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
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
      setMessage('Ready. Tap shutter.');
    } catch (error) {
      setCameraReady(false);
      setMessage('Camera failed. Allow permission and use HTTPS.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }

  function cameraAction() {
    if (!cameraReady) {
      startCamera();
      return;
    }

    const dataUrl = captureVideoFrame(videoRef.current);
    stopCamera();
    setShot(dataUrl);
  }

  function savePage(page) {
    setPages((current) => [...current, page]);
    setShot(null);
    setView('results');
    setMessage('Scan saved.');
  }

  function goCamera() {
    setView('camera');
    setMessage('Start camera.');
  }

  async function exportPdf() {
    if (!pages.length) {
      setMessage('No scan pages yet.');
      return;
    }

    setExporting(true);
    setMessage('Creating PDF...');

    try {
      const pdf = await makePdf(pages);
      setLastPdf(pdf);
      savePdf(pdf, 'dy-camscn-scan.pdf');
      setMessage('PDF downloaded. If download does not open, tap Preview.');
    } catch (error) {
      setMessage(error.message || 'Failed creating PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="app">
      {shot && (
        <CornerEditor
          shot={shot}
          onBack={() => setShot(null)}
          onSave={savePage}
        />
      )}

      {view === 'camera' && (
        <section className="cameraScreen">
          <video ref={videoRef} playsInline muted />

          {!cameraReady && (
            <div className="intro">
              <ScanLine size={58} />
              <h1>dy-camscn</h1>
              <p>Scan documents into clean PDF pages.</p>
            </div>
          )}

          {cameraReady && <div className="frameGuide" />}

          <header className="cameraHeader">
            <div>
              <strong>dy-camscn</strong>
              <span>{pages.length} pages</span>
            </div>
            <button onClick={() => setView('results')}>
              <FileText size={18} />
            </button>
          </header>

          <footer className="cameraFooter">
            <p>{message}</p>
            <button className={cameraReady ? 'shutter' : 'startCamera'} onClick={cameraAction}>
              {cameraReady ? <Camera size={30} /> : 'Start Camera'}
            </button>
          </footer>
        </section>
      )}

      {view === 'results' && (
        <section className="resultScreen">
          <header className="resultHeader">
            <button onClick={goCamera}>
              <Plus size={18} />
              Add
            </button>
            <div>
              <strong>Results</strong>
              <span>{pages.length} pages</span>
            </div>
            <button onClick={() => lastPdf && openPdfPreview(lastPdf)} disabled={!lastPdf}>
              Preview
            </button>
          </header>

          {!pages.length ? (
            <div className="empty">
              <ScanLine size={58} />
              <h2>No pages yet</h2>
              <p>Tap Add to scan your first document.</p>
            </div>
          ) : (
            <div className="pages">
              {pages.map((page, index) => (
                <article className="pageCard" key={page.id}>
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

          <footer className="downloadBar">
            <p>{message}</p>
            <button onClick={exportPdf} disabled={!pages.length || exporting}>
              {exporting ? <Loader2 className="spin" size={20} /> : <Download size={20} />}
              {exporting ? 'Creating...' : 'Download PDF'}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

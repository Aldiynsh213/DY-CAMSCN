import { Download, FileDown, Loader2, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { exportPagesToPdf } from '../utils/pdf';

export default function ExportPanel({ pages, setActiveTab }) {
  const [fileName, setFileName] = useState('dy-camscn-scan.pdf');
  const [paper, setPaper] = useState('a4');
  const [quality, setQuality] = useState('0.92');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleExport() {
    if (!pages.length) {
      setMessage('Belum ada halaman scan.');
      return;
    }

    setExporting(true);
    setMessage('Membuat PDF...');

    try {
      await exportPagesToPdf(pages, {
        fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
        paper,
        quality: Number(quality),
      });

      setMessage('PDF berhasil dibuat. Cek folder Download kamu.');
    } catch (error) {
      setMessage(error.message || 'Gagal membuat PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="exportPanel">
      <div className="sectionTitle">
        <div>
          <span className="eyebrow"><Settings2 size={15} /> PDF Export</span>
          <h2>Export hasil scan</h2>
          <p>Pilih nama file, ukuran kertas, dan kualitas PDF.</p>
        </div>
      </div>

      <div className="exportCard">
        <div className="summaryBox">
          <FileDown size={34} />
          <div>
            <strong>{pages.length} halaman siap export</strong>
            <span>Semua proses gambar ke PDF berjalan di browser.</span>
          </div>
        </div>

        <label>
          Nama file PDF
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="nama-file.pdf" />
        </label>

        <label>
          Ukuran halaman
          <select value={paper} onChange={(event) => setPaper(event.target.value)}>
            <option value="a4">A4 otomatis</option>
            <option value="original">Ukuran original foto</option>
          </select>
        </label>

        <label>
          Kualitas gambar
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="0.82">Ringan</option>
            <option value="0.92">Seimbang</option>
            <option value="0.98">Tinggi</option>
          </select>
        </label>

        <div className="exportActions">
          <button className="ghostBtn" onClick={() => setActiveTab('scan')}>Tambah Scan</button>
          <button className="primaryBtn" onClick={handleExport} disabled={exporting || !pages.length}>
            {exporting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
            {exporting ? 'Membuat...' : 'Download PDF'}
          </button>
        </div>

        {message && <div className="alert">{message}</div>}
      </div>
    </section>
  );
}

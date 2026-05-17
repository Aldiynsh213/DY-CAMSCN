import { ArrowDown, ArrowUp, FileDown, ImageOff, RotateCw, Trash2, Wand2 } from 'lucide-react';
import { getFilterValue } from '../utils/pdf';

const modeLabels = {
  original: 'Original',
  clean: 'Clean',
  bw: 'B/W',
  soft: 'Soft',
};

export default function PageEditor({ pages, onUpdatePage, onDeletePage, onMovePage, setActiveTab }) {
  if (!pages.length) {
    return (
      <section className="emptyState">
        <ImageOff size={56} />
        <h2>Belum ada halaman scan.</h2>
        <p>Mulai dari kamera atau import foto dari galeri.</p>
        <button className="primaryBtn" onClick={() => setActiveTab('scan')}>Mulai Scan</button>
      </section>
    );
  }

  return (
    <section className="pagesSection">
      <div className="sectionTitle">
        <div>
          <span className="eyebrow"><Wand2 size={15} /> Edit Pages</span>
          <h2>Rapikan hasil scan</h2>
          <p>Rotate, hapus, susun ulang, atau pilih filter untuk tiap halaman.</p>
        </div>
        <button className="primaryBtn" onClick={() => setActiveTab('export')}>
          <FileDown size={18} />
          Export PDF
        </button>
      </div>

      <div className="pageGrid">
        {pages.map((page, index) => (
          <article className="pageCard" key={page.id}>
            <div className="pagePreview">
              <img
                src={page.dataUrl}
                alt={`Scan halaman ${index + 1}`}
                style={{ transform: `rotate(${page.rotation}deg)`, filter: getFilterValue(page.mode) }}
              />
              <span className="pageNumber">#{index + 1}</span>
            </div>

            <div className="pageControls">
              <button onClick={() => onUpdatePage(page.id, { rotation: (page.rotation + 90) % 360 })}>
                <RotateCw size={16} />
                Rotate
              </button>

              <select value={page.mode} onChange={(event) => onUpdatePage(page.id, { mode: event.target.value })}>
                {Object.entries(modeLabels).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="pageControls small">
              <button onClick={() => onMovePage(index, index - 1)} disabled={index === 0}>
                <ArrowUp size={15} />
                Up
              </button>
              <button onClick={() => onMovePage(index, index + 1)} disabled={index === pages.length - 1}>
                <ArrowDown size={15} />
                Down
              </button>
              <button className="danger" onClick={() => onDeletePage(page.id)}>
                <Trash2 size={15} />
                Hapus
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { Camera, FileDown, Images, Sparkles } from 'lucide-react';

export default function Header({ pageCount, activeTab, setActiveTab }) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brandIcon">
          <Camera size={22} />
        </div>
        <div>
          <h1>dy-camscn</h1>
          <p>Mobile Document Scanner</p>
        </div>
      </div>

      <div className="counter">
        <Sparkles size={16} />
        <span>{pageCount} halaman</span>
      </div>

      <nav className="tabs" aria-label="Main navigation">
        <button className={activeTab === 'scan' ? 'tab active' : 'tab'} onClick={() => setActiveTab('scan')}>
          <Camera size={17} /> Scan
        </button>
        <button className={activeTab === 'pages' ? 'tab active' : 'tab'} onClick={() => setActiveTab('pages')}>
          <Images size={17} /> Pages
        </button>
        <button className={activeTab === 'export' ? 'tab active' : 'tab'} onClick={() => setActiveTab('export')}>
          <FileDown size={17} /> PDF
        </button>
      </nav>
    </header>
  );
}

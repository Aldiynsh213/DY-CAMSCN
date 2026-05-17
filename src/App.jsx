import { useMemo, useState } from 'react';
import Header from './components/Header';
import Scanner from './components/Scanner';
import PageEditor from './components/PageEditor';
import ExportPanel from './components/ExportPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [pages, setPages] = useState([]);

  function onAddPage(page) {
    setPages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        mode: 'clean',
        rotation: 0,
        ...page,
      },
    ]);
  }

  function onUpdatePage(id, updates) {
    setPages((current) => current.map((page) => (page.id === id ? { ...page, ...updates } : page)));
  }

  function onDeletePage(id) {
    setPages((current) => current.filter((page) => page.id !== id));
  }

  function onMovePage(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= pages.length) return;

    setPages((current) => {
      const copy = [...current];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  }

  const activeView = useMemo(() => {
    if (activeTab === 'pages') {
      return (
        <PageEditor
          pages={pages}
          onUpdatePage={onUpdatePage}
          onDeletePage={onDeletePage}
          onMovePage={onMovePage}
          setActiveTab={setActiveTab}
        />
      );
    }

    if (activeTab === 'export') {
      return <ExportPanel pages={pages} setActiveTab={setActiveTab} />;
    }

    return <Scanner onAddPage={onAddPage} setActiveTab={setActiveTab} />;
  }, [activeTab, pages]);

  return (
    <div className="appShell">
      <Header pageCount={pages.length} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="mainContent">{activeView}</main>
      <footer className="footer">
        <span>dy-camscn</span>
        <span>by Aldi</span>
      </footer>
    </div>
  );
}

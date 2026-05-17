import jsPDF from 'jspdf';
import { loadImage } from './image';

export async function exportToPdf(pages, fileName = 'dy-camscn-scan.pdf') {
  if (!pages.length) {
    throw new Error('Belum ada halaman scan.');
  }

  let pdf = null;

  for (const page of pages) {
    const img = await loadImage(page.dataUrl);
    const orientation = img.width > img.height ? 'landscape' : 'portrait';

    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    } else {
      pdf.addPage('a4', orientation);
    }

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgRatio = img.width / img.height;
    const pageRatio = pageW / pageH;

    let w;
    let h;

    if (imgRatio > pageRatio) {
      w = pageW;
      h = w / imgRatio;
    } else {
      h = pageH;
      w = h * imgRatio;
    }

    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    pdf.addImage(page.dataUrl, 'JPEG', x, y, w, h);
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

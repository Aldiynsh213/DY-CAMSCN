import jsPDF from 'jspdf';
import { loadImage } from './image';

export async function createPdfBlob(pages) {
  if (!pages.length) {
    throw new Error('Belum ada halaman scan.');
  }

  let pdf = null;

  for (const page of pages) {
    const img = await loadImage(page.dataUrl);
    const orientation = img.width > img.height ? 'landscape' : 'portrait';

    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
    } else {
      pdf.addPage('a4', orientation);
    }

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = img.width / img.height;
    const pageRatio = pageW / pageH;

    let w;
    let h;

    if (ratio > pageRatio) {
      w = pageW;
      h = w / ratio;
    } else {
      h = pageH;
      w = h * ratio;
    }

    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    pdf.addImage(page.dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST');
  }

  return pdf.output('blob');
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

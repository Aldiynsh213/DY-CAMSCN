import jsPDF from 'jspdf';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar gagal dimuat.'));
    image.src = src;
  });
}

export async function exportScansToPdf(pages, fileName = 'dy-camscn-scan.pdf') {
  if (!pages.length) {
    throw new Error('Belum ada hasil scan.');
  }

  let pdf = null;

  for (let i = 0; i < pages.length; i += 1) {
    const image = await loadImage(pages[i].dataUrl);
    const orientation = image.width > image.height ? 'landscape' : 'portrait';

    if (!pdf) {
      pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });
    } else {
      pdf.addPage('a4', orientation);
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgRatio = image.width / image.height;
    const pageRatio = pageWidth / pageHeight;

    let renderWidth;
    let renderHeight;

    if (imgRatio > pageRatio) {
      renderWidth = pageWidth;
      renderHeight = renderWidth / imgRatio;
    } else {
      renderHeight = pageHeight;
      renderWidth = renderHeight * imgRatio;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    pdf.addImage(pages[i].dataUrl, 'JPEG', x, y, renderWidth, renderHeight);
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

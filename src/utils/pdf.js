import jsPDF from 'jspdf';

export function getFilterValue(mode) {
  if (mode === 'clean') return 'contrast(1.18) brightness(1.08) saturate(0.92)';
  if (mode === 'bw') return 'grayscale(1) contrast(1.55) brightness(1.12)';
  if (mode === 'soft') return 'contrast(1.05) brightness(1.04) saturate(1.05)';
  return 'none';
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar gagal dimuat.'));
    image.src = src;
  });
}

export async function processPageToJpeg(page, quality = 0.92) {
  const image = await loadImage(page.dataUrl);
  const rotation = ((page.rotation % 360) + 360) % 360;
  const swap = rotation === 90 || rotation === 270;

  const canvas = document.createElement('canvas');
  canvas.width = swap ? image.height : image.width;
  canvas.height = swap ? image.width : image.height;

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.filter = getFilterValue(page.mode);

  if (rotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (rotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate((3 * Math.PI) / 2);
  }

  ctx.drawImage(image, 0, 0);
  ctx.restore();

  return {
    dataUrl: canvas.toDataURL('image/jpeg', quality),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function exportPagesToPdf(pages, options = {}) {
  if (!pages.length) throw new Error('Belum ada halaman untuk dijadikan PDF.');

  const { fileName = 'dy-camscn-result.pdf', paper = 'a4', quality = 0.92, margin = 8 } = options;
  let pdf = null;

  for (let index = 0; index < pages.length; index += 1) {
    const processed = await processPageToJpeg(pages[index], quality);

    if (paper === 'original') {
      const orientation = processed.width > processed.height ? 'landscape' : 'portrait';

      if (!pdf) {
        pdf = new jsPDF({ orientation, unit: 'px', format: [processed.width, processed.height] });
      } else {
        pdf.addPage([processed.width, processed.height], orientation);
      }

      pdf.addImage(processed.dataUrl, 'JPEG', 0, 0, processed.width, processed.height);
    } else {
      const orientation = processed.width > processed.height ? 'landscape' : 'portrait';

      if (!pdf) {
        pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      } else {
        pdf.addPage('a4', orientation);
      }

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const imgRatio = processed.width / processed.height;
      const boxRatio = maxWidth / maxHeight;

      let renderWidth;
      let renderHeight;

      if (imgRatio > boxRatio) {
        renderWidth = maxWidth;
        renderHeight = renderWidth / imgRatio;
      } else {
        renderHeight = maxHeight;
        renderWidth = renderHeight * imgRatio;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(processed.dataUrl, 'JPEG', x, y, renderWidth, renderHeight);
    }
  }

  pdf.save(fileName);
}

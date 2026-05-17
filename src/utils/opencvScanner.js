export function waitForOpenCV(timeout = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (window.cv && window.cv.Mat && window.cv.imread) {
        resolve(window.cv);
        return;
      }

      if (Date.now() - start > timeout) {
        reject(new Error('OpenCV belum selesai dimuat. Coba refresh halaman atau cek koneksi internet.'));
        return;
      }

      setTimeout(check, 150);
    };

    check();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar gagal dimuat.'));
    image.src = src;
  });
}

function imageToCanvas(image, maxSide = 1800) {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas;
}

function orderPoints(points) {
  const sortedBySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const sortedByDiff = [...points].sort((a, b) => (a.y - a.x) - (b.y - b.x));

  return {
    tl: sortedBySum[0],
    br: sortedBySum[3],
    tr: sortedByDiff[0],
    bl: sortedByDiff[3],
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findBestDocumentContour(src) {
  const cv = window.cv;
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edged = new cv.Mat();
  const dilated = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    cv.Canny(blur, edged, 55, 160);

    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edged, dilated, kernel);
    kernel.delete();

    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let best = null;
    let bestArea = 0;
    const imageArea = src.cols * src.rows;

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area < imageArea * 0.08) {
        contour.delete();
        continue;
      }

      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.022 * peri, true);

      if (approx.rows === 4 && area > bestArea) {
        const points = [];

        for (let row = 0; row < 4; row += 1) {
          points.push({
            x: approx.intPtr(row, 0)[0],
            y: approx.intPtr(row, 0)[1],
          });
        }

        bestArea = area;
        best = points;
      }

      approx.delete();
      contour.delete();
    }

    return best;
  } finally {
    gray.delete();
    blur.delete();
    edged.delete();
    dilated.delete();
    contours.delete();
    hierarchy.delete();
  }
}

function enhanceMat(input, mode) {
  const cv = window.cv;

  if (mode === 'bw') {
    const gray = new cv.Mat();
    const out = new cv.Mat();
    cv.cvtColor(input, gray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(
      gray,
      out,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      31,
      9
    );
    gray.delete();
    return out;
  }

  if (mode === 'magic') {
    const gray = new cv.Mat();
    const eq = new cv.Mat();
    const out = new cv.Mat();

    cv.cvtColor(input, gray, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(gray, eq);
    cv.adaptiveThreshold(
      eq,
      out,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      41,
      11
    );

    gray.delete();
    eq.delete();
    return out;
  }

  if (mode === 'clean') {
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, input);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height;

    const ctx = outCanvas.getContext('2d');
    ctx.filter = 'brightness(1.1) contrast(1.25) saturate(0.85)';
    ctx.drawImage(canvas, 0, 0);

    const out = cv.imread(outCanvas);
    return out;
  }

  return input.clone();
}

function matToDataUrl(mat, quality = 0.94) {
  const canvas = document.createElement('canvas');
  window.cv.imshow(canvas, mat);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function autoScanDataUrl(dataUrl, options = {}) {
  const {
    mode = 'magic',
    normalizeA4 = true,
    maxSide = 1800,
    quality = 0.94,
  } = options;

  await waitForOpenCV();

  const image = await loadImage(dataUrl);
  const canvas = imageToCanvas(image, maxSide);
  const cv = window.cv;
  const src = cv.imread(canvas);
  const points = findBestDocumentContour(src);

  let working = null;
  let found = false;

  try {
    if (points) {
      found = true;

      const ordered = orderPoints(points);
      const widthTop = distance(ordered.tl, ordered.tr);
      const widthBottom = distance(ordered.bl, ordered.br);
      const heightLeft = distance(ordered.tl, ordered.bl);
      const heightRight = distance(ordered.tr, ordered.br);

      let targetWidth = Math.round(Math.max(widthTop, widthBottom));
      let targetHeight = Math.round(Math.max(heightLeft, heightRight));

      if (normalizeA4) {
        const portrait = targetHeight >= targetWidth;
        targetWidth = portrait ? 1200 : 1697;
        targetHeight = portrait ? 1697 : 1200;
      }

      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        ordered.tl.x, ordered.tl.y,
        ordered.tr.x, ordered.tr.y,
        ordered.br.x, ordered.br.y,
        ordered.bl.x, ordered.bl.y,
      ]);

      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        targetWidth, 0,
        targetWidth, targetHeight,
        0, targetHeight,
      ]);

      const matrix = cv.getPerspectiveTransform(srcTri, dstTri);
      working = new cv.Mat();
      cv.warpPerspective(
        src,
        working,
        matrix,
        new cv.Size(targetWidth, targetHeight),
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
      );

      srcTri.delete();
      dstTri.delete();
      matrix.delete();
    } else {
      working = src.clone();
    }

    const enhanced = enhanceMat(working, mode);
    const outputDataUrl = matToDataUrl(enhanced, quality);

    enhanced.delete();

    return {
      dataUrl: outputDataUrl,
      found,
    };
  } finally {
    src.delete();
    if (working) working.delete();
  }
}

export function drawLiveDetection(video, overlayCanvas) {
  if (!window.cv || !window.cv.Mat || !video || !overlayCanvas || !video.videoWidth) {
    return false;
  }

  const cv = window.cv;
  const width = 420;
  const scale = width / video.videoWidth;
  const height = Math.round(video.videoHeight * scale);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(video, 0, 0, width, height);

  const src = cv.imread(tempCanvas);
  const points = findBestDocumentContour(src);

  overlayCanvas.width = video.clientWidth;
  overlayCanvas.height = video.clientHeight;
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  if (points) {
    const ordered = orderPoints(points);
    const drawScaleX = overlayCanvas.width / width;
    const drawScaleY = overlayCanvas.height / height;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(34, 197, 94, .8)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(ordered.tl.x * drawScaleX, ordered.tl.y * drawScaleY);
    ctx.lineTo(ordered.tr.x * drawScaleX, ordered.tr.y * drawScaleY);
    ctx.lineTo(ordered.br.x * drawScaleX, ordered.br.y * drawScaleY);
    ctx.lineTo(ordered.bl.x * drawScaleX, ordered.bl.y * drawScaleY);
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(34, 197, 94, .16)';
    ctx.fill();

    src.delete();
    return true;
  }

  src.delete();
  return false;
}

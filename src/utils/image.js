export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca gambar.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar gagal dimuat.'));
    img.src = src;
  });
}

export function captureVideoFrame(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.97);
}

export async function getImageSize(dataUrl) {
  const image = await loadImage(dataUrl);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

export function defaultCorners(width, height) {
  const padX = width * 0.06;
  const padY = height * 0.05;
  return {
    tl: { x: padX, y: padY },
    tr: { x: width - padX, y: padY },
    br: { x: width - padX, y: height - padY },
    bl: { x: padX, y: height - padY },
  };
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);

  for (let i = 0; i < n; i += 1) {
    let maxRow = i;
    for (let r = i + 1; r < n; r += 1) {
      if (Math.abs(a[r][i]) > Math.abs(a[maxRow][i])) maxRow = r;
    }

    [a[i], a[maxRow]] = [a[maxRow], a[i]];
    const pivot = Math.abs(a[i][i]) < 1e-12 ? 1e-12 : a[i][i];

    for (let c = i; c <= n; c += 1) a[i][c] /= pivot;

    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const factor = a[r][i];
      for (let c = i; c <= n; c += 1) a[r][c] -= factor * a[i][c];
    }
  }

  return a.map((row) => row[n]);
}

function computeHomography(dst, src) {
  const a = [];
  const b = [];

  for (let i = 0; i < 4; i += 1) {
    const x = dst[i].x;
    const y = dst[i].y;
    const u = src[i].x;
    const v = src[i].y;

    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);

    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solveLinearSystem(a, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function sample(data, width, height, x, y) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const dx = x - x0;
  const dy = y - y0;

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  const out = [0, 0, 0, 255];

  for (let c = 0; c < 3; c += 1) {
    const top = data[i00 + c] * (1 - dx) + data[i10 + c] * dx;
    const bottom = data[i01 + c] * (1 - dx) + data[i11 + c] * dx;
    out[c] = top * (1 - dy) + bottom * dy;
  }

  return out;
}

function stretchContrast(data, low = 8, high = 245) {
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }

  const sourceMin = Math.min(low, min);
  const sourceMax = Math.max(high, max);
  const range = Math.max(1, sourceMax - sourceMin);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      data[i + c] = Math.max(0, Math.min(255, ((data[i + c] - sourceMin) / range) * 255));
    }
  }
}

function enhanceImageData(imageData, mode) {
  const data = imageData.data;

  if (mode === 'original') return imageData;

  stretchContrast(data, 14, 238);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (mode === 'text') {
      let v = (gray - 128) * 1.36 + 134;
      v = Math.max(0, Math.min(255, v));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      continue;
    }

    if (mode === 'bw') {
      let v = (gray - 128) * 1.55 + 142;
      v = v > 238 ? 255 : v;
      v = v < 34 ? 0 : v;
      v = Math.max(0, Math.min(255, v));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      continue;
    }

    // Balanced default: cleaner than photo, but not over-white.
    const contrast = 1.16;
    const brightness = 8;
    r = (r - 128) * contrast + 128 + brightness;
    g = (g - 128) * contrast + 128 + brightness;
    b = (b - 128) * contrast + 128 + brightness;

    const newGray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = newGray + (r - newGray) * 0.82;
    g = newGray + (g - newGray) * 0.82;
    b = newGray + (b - newGray) * 0.82;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  return imageData;
}

export async function cropDocument(dataUrl, corners, options = {}) {
  const { mode = 'balanced', quality = 0.95 } = options;
  const image = await loadImage(dataUrl);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth || image.width;
  sourceCanvas.height = image.naturalHeight || image.height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const src = [corners.tl, corners.tr, corners.br, corners.bl];

  const topWidth = Math.hypot(corners.tr.x - corners.tl.x, corners.tr.y - corners.tl.y);
  const leftHeight = Math.hypot(corners.bl.x - corners.tl.x, corners.bl.y - corners.tl.y);
  const portrait = leftHeight >= topWidth;

  // A4-ish output, but not too large so mobile does not freeze.
  const outW = portrait ? 1080 : 1528;
  const outH = portrait ? 1528 : 1080;

  const dst = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];

  const h = computeHomography(dst, src);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  const output = outCtx.createImageData(outW, outH);

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const denom = h[6] * x + h[7] * y + h[8];
      const sx = (h[0] * x + h[1] * y + h[2]) / denom;
      const sy = (h[3] * x + h[4] * y + h[5]) / denom;
      const idx = (y * outW + x) * 4;

      if (sx >= 0 && sy >= 0 && sx < sourceCanvas.width && sy < sourceCanvas.height) {
        const px = sample(sourceData.data, sourceCanvas.width, sourceCanvas.height, sx, sy);
        output.data[idx] = px[0];
        output.data[idx + 1] = px[1];
        output.data[idx + 2] = px[2];
        output.data[idx + 3] = 255;
      } else {
        output.data[idx] = 248;
        output.data[idx + 1] = 250;
        output.data[idx + 2] = 252;
        output.data[idx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(enhanceImageData(output, mode), 0, 0);
  return outCanvas.toDataURL('image/jpeg', quality);
}

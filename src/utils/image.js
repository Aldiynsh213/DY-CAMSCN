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
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar gagal dimuat.'));
    image.src = src;
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
  const padX = width * 0.055;
  const padY = height * 0.045;

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

function sampleBilinear(data, width, height, x, y) {
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

function blurGray(gray, width, height) {
  const out = new Float32Array(gray.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;

      for (let yy = -1; yy <= 1; yy += 1) {
        for (let xx = -1; xx <= 1; xx += 1) {
          const nx = x + xx;
          const ny = y + yy;

          if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            sum += gray[ny * width + nx];
            count += 1;
          }
        }
      }

      out[y * width + x] = sum / count;
    }
  }

  return out;
}

function autoWhiteBalance(data) {
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }

  const range = Math.max(1, max - min);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      data[i + c] = Math.max(0, Math.min(255, ((data[i + c] - min) / range) * 255));
    }
  }
}

function applyScannerEnhancement(imageData, mode) {
  const data = imageData.data;
  autoWhiteBalance(data);

  if (mode === 'magic' || mode === 'bw') {
    const gray = new Float32Array(data.length / 4);

    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const local = blurGray(gray, imageData.width, imageData.height);

    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      let value = gray[p];

      if (mode === 'magic') {
        const threshold = local[p] * 0.88;
        value = value > threshold ? 255 : Math.max(0, value * 0.32);
        value = value > 205 ? 255 : value;
      } else {
        value = (value - 128) * 1.48 + 145;
      }

      value = Math.max(0, Math.min(255, value));
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }

    return imageData;
  }

  if (mode === 'clean') {
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      const contrast = 1.34;
      const bright = 18;

      r = (r - 128) * contrast + 128 + bright;
      g = (g - 128) * contrast + 128 + bright;
      b = (b - 128) * contrast + 128 + bright;

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * 0.72;
      g = gray + (g - gray) * 0.72;
      b = gray + (b - gray) * 0.72;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = 255;
    }
  }

  return imageData;
}

export async function perspectiveCropToDataUrl(dataUrl, corners, options = {}) {
  const { mode = 'magic', quality = 0.95 } = options;
  const image = await loadImage(dataUrl);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth || image.width;
  sourceCanvas.height = image.naturalHeight || image.height;

  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const src = [corners.tl, corners.tr, corners.br, corners.bl];

  const portrait = Math.hypot(corners.bl.x - corners.tl.x, corners.bl.y - corners.tl.y) >=
                   Math.hypot(corners.tr.x - corners.tl.x, corners.tr.y - corners.tl.y);

  const outW = portrait ? 1240 : 1754;
  const outH = portrait ? 1754 : 1240;

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
        const px = sampleBilinear(sourceData.data, sourceCanvas.width, sourceCanvas.height, sx, sy);
        output.data[idx] = px[0];
        output.data[idx + 1] = px[1];
        output.data[idx + 2] = px[2];
        output.data[idx + 3] = 255;
      } else {
        output.data[idx] = 255;
        output.data[idx + 1] = 255;
        output.data[idx + 2] = 255;
        output.data[idx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(applyScannerEnhancement(output, mode), 0, 0);
  return outCanvas.toDataURL('image/jpeg', quality);
}

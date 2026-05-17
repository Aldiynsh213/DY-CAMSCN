# dy-camscn Stable

Versi stabil untuk scanner dokumen mobile.

## Kenapa versi ini dibuat?

Versi OpenCV live detection terlalu berat untuk sebagian laptop/HP dan bisa membuat browser freeze. Versi ini tidak memakai OpenCV live, jadi jauh lebih stabil.

## Fitur

- Buka kamera HP
- Ambil foto dokumen
- Import foto dari galeri
- Manual 4 titik sudut dokumen
- Perspective correction
- Auto crop sesuai sudut dokumen
- Magic Scan, Clean Color, B/W Text, Original
- Multi-page PDF export
- Tidak perlu backend
- Cocok deploy ke Vercel

## Cara pakai

1. Mulai Kamera atau Import Foto
2. Ambil foto dokumen
3. Geser 4 titik hijau ke sudut dokumen
4. Pilih mode scan
5. Klik Terapkan Scan
6. Export PDF

## Run lokal

```bash
npm install
npm run dev
```

## Deploy Vercel

- Framework: Vite
- Build command: npm run build
- Output directory: dist

Created by Aldi.

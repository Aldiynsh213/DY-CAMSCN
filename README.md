# dy-camscn

Mobile-first camera document scanner web app.

## Fitur

- Buka kamera HP langsung dari browser
- Ambil foto dokumen
- Import foto dari galeri
- Susun banyak halaman
- Rotate halaman
- Pilih mode enhancement: Original, Clean, B/W, Soft
- Export semua halaman menjadi 1 PDF
- Frontend-only, tidak perlu backend
- Cocok deploy ke Vercel

## Cara jalanin lokal

```bash
npm install
npm run dev
```

Buka:

```txt
http://localhost:5173
```

## Catatan kamera

Kamera browser hanya berjalan di:

- localhost
- HTTPS website

Kalau sudah deploy ke Vercel, kamera bisa dipakai di HP.

## Deploy ke Vercel

1. Push project ke GitHub
2. Import repo di Vercel
3. Framework: Vite
4. Build command: npm run build
5. Output directory: dist

## Struktur penting

```txt
src/App.jsx                  pengatur state utama
src/components/Scanner.jsx   kamera dan import gambar
src/components/PageEditor.jsx edit halaman scan
src/components/ExportPanel.jsx export ke PDF
src/utils/pdf.js             proses gambar dan export PDF pakai jsPDF
```

Created by Aldi.

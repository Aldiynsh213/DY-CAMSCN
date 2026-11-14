# dy-camscn

Pemindai dokumen mobile-first yang berjalan di browser: ambil foto lewat kamera, potong sudut, perbaiki tampilan, lalu ekspor ke PDF.

## Fitur
- Kamera layar penuh, tombol shutter tunggal
- Crop sudut dokumen (corner editor)
- Filter perbaikan scan, default Balanced
- Ekspor PDF dengan `jsPDF` dan pratinjau setelah ekspor
- PWA: manifest dan ikon tersedia di `public/`

## Teknologi
React 19, Vite, jsPDF, lucide-react.

## Struktur
```
src/App.jsx                    alur utama
src/components/CornerEditor.jsx editor crop sudut
src/utils/image.js             pemrosesan gambar
src/utils/pdf.js               ekspor PDF
public/                        manifest dan ikon
```

## Menjalankan
```bash
npm install
npm run dev        # dapat diakses dari HP di jaringan yang sama
npm run build
```
Kamera di browser butuh HTTPS atau `localhost`. Deploy di Vercel memakai `vercel.json` (SPA rewrite).

## Lisensi
MIT

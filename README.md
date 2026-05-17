# dy-camscn Mobile Pro

Versi yang fokus untuk HP dan kerjaan harian.

## Perbaikan dari versi sebelumnya

- Tampilan kamera tidak perlu scroll
- Menu ambil gambar cuma punya satu tombol utama
- Tombol Mulai Kamera berubah menjadi tombol foto/shutter
- Tidak pakai OpenCV live, jadi tidak bikin browser freeze
- Corner adjust full-screen
- Hasil scan lebih putih dan lebih mirip dokumen scanner
- Export PDF lebih reliable
- Setelah export, muncul juga link Open PDF preview

## Cara pakai

1. Start Camera
2. Tombol berubah jadi shutter/foto
3. Ambil foto dokumen
4. Geser 4 titik hijau ke sudut dokumen
5. Pilih Magic/Clean/BW
6. Save scan
7. Download PDF

## Run

```bash
npm install
npm run dev
```

## Deploy Vercel

```bash
git add .
git commit -m "upgrade mobile scanner ui"
git push
```

Created by Aldi.

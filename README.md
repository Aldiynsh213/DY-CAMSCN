# dy-camscn Mobile Fixed

Versi perbaikan setelah feedback:

- Kamera fullscreen, tidak ketutup padding/box.
- Menu kamera hanya punya tombol utama.
- Start Camera berubah menjadi tombol shutter/foto.
- Setelah satu scan, kamera tidak stuck hitam. Camera stream dimatikan lalu bisa dibuka ulang dari Add.
- Hasil scan tidak dibuat putih berlebihan.
- Default filter Balanced lebih jelas dan natural.
- Download PDF pakai `pdf.save()` agar lebih reliable.
- Preview PDF tetap tersedia setelah export.

## Cara update

Copy isi folder ini ke folder project lama, jangan hapus `.git`.

```bash
npm install
npm run dev
```

Lalu:

```bash
git add .
git commit -m "fix camera scanner mobile flow"
git push
```

Created by Aldi.

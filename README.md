# dy-camscn Pro

Auto document scanner web app.

## What is new in Pro

- Auto document edge detection
- Live green document lock overlay
- Perspective correction for tilted documents
- Auto crop only document area
- Magic Scan / Clean Color / Black & White modes
- Multi-page PDF export
- Frontend-only, deploys well on Vercel

## Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Important

OpenCV.js is loaded from the official OpenCV CDN. The first load can take a few seconds.

Camera works only on:

- localhost
- HTTPS deployment, such as Vercel

## Deploy

Recommended: Vercel

- Framework: Vite
- Build command: npm run build
- Output directory: dist

Created by Aldi.

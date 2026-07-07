# ReportReady marketing media

Auto-generated screenshots and short WebM walkthrough clips for the app.

## Generate

From the repo root (first time: installs Chromium for Playwright):

```bash
npm run capture:media:install
npm run capture:media
```

## Output

| File | Route |
|------|-------|
| `screenshots/home.png` | `/` |
| `screenshots/breakroom.png` | `/breakroom` (Tiny Nurse lounge) |
| `screenshots/print-sheet.png` | `/sheets/quick-dirty` |
| `videos/home.webm` | Home page walkthrough |
| `videos/breakroom.webm` | Breakroom lounge |
| `videos/print-flow.webm` | Gallery → printable sheet |

Set `CAPTURE_SKIP_SERVER=1` if the dev server is already running on port 22838.

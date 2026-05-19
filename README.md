# Phone Lunk Alarm Lab

A fresh, scoped rebuild inspired by `neonwatty/phone-lunk-alarm`.

This repo does not copy the old Next.js app wholesale. The reference app was used
to understand the concept, UX, package setup, tests, and docs: a landing page with
an in-browser phone detector, privacy messaging, alarm effects, theme/sound
controls, and camera-oriented QA paths.

This first pass keeps the surface small enough for one QA session:

- Vite + React + TypeScript app
- Local camera preview with permission/error handling
- Manual "Simulate Phone Spot" trigger for repeatable QA without TensorFlow or
  staged camera footage
- Alarm mode controls for classic, coach, and silent visual alarms
- Detection counter, clearable alarm overlay, and scoped implementation notes
- Vitest coverage for render, camera start/stop, unsupported camera state, alarm
  mode switching, and alarm clearing

## Quick Start

Prerequisites:

- Node.js 20+
- npm 10+
- A browser with camera permissions for the live preview path

Install and run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Verification

```bash
npm run lint
npm run test
npm run build
```

The camera preview can only be fully exercised in a browser with camera access.
The automated tests mock `getUserMedia` so CI and local headless runs can verify
the app logic without camera hardware.

## Concept vs. Rebuild

The reference app uses Next.js, Tailwind, TensorFlow COCO-SSD, webcam detection,
recording previews, sound selection, theme persistence, and Playwright camera
flows. This rebuild intentionally narrows scope for a reliable first pass:

- Keeps the core idea: spot phone use near shared equipment and raise a visible
  alarm.
- Preserves the privacy-first framing and alarm-mode interaction.
- Replaces AI detection with a manual simulator so QA can validate the product
  loop deterministically.
- Uses a fresh implementation stack and design instead of porting components,
  styles, assets, or tests from the old repo.

## Known Gaps

- No TensorFlow/COCO-SSD detection yet.
- No audio alarm playback.
- No recording or watermark export path.
- No Playwright camera workflow yet; current automated coverage is unit/UI state
  testing with mocked camera APIs.

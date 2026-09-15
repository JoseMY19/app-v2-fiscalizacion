# Fiscalización Campo (PWA)

Field application for municipal inspectors of the PAS (Procedimiento
Administrativo Sancionador) system, Municipalidad de San Juan de Lurigancho.
An installable, offline-first PWA used on the inspector's own phone during
on-site inspections.

## Why offline-first

This is a hard requirement, not an optional feature. Inspectors use their
personal phones (BYOD), often at night, frequently without network coverage.
Every screen persists to IndexedDB before attempting to sync — the app must
keep working with zero connectivity from start to finish of an inspection.

## Tech stack

- **React** + **Vite** + **TypeScript**
- **Dexie** (IndexedDB) for local persistence
- **vite-plugin-pwa** for the installable app shell and service worker
- **socket.io-client** for a live heads-up channel (never the sync transport)
- **Vitest** for unit testing

## Key behaviors

- GPS is captured at the **start** of the intervention, before any other data
- Photos are compressed client-side (long side ~1600px, ~70% quality) before
  being persisted — the original file is never stored
- The sync engine is event-driven (no polling): retries on reconnect and on
  app start, with exponential backoff, and is idempotent by intervention id
- Local storage is only purged after the server confirms a successful sync
- Every act screen requires a photo of the signed physical act (mandatory for
  Exhortación, Fiscalización and Notificación de Cargo; optional for the
  accessory acts)

## Project structure

```
src/features/
  auth/              login and session persistence
  nueva-intervencion/ step-by-step intervention wizard
  cuis/              infractions catalog selector
  uit/               calculation base and amount
  actas/             act screens (exhortación, fiscalización, cargo notice...)
  evidencia/         photo and signature capture
  resumen/           pre-close summary
  sincronizacion/    offline-first sync engine
  correccion/        rework flow for office-observed interventions
  mis-tramites/      case status visibility for the inspector
```

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL if not using the default
npm run dev
```

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run test` | Run the Vitest suite |
| `npm run preview` | Preview the production build locally |

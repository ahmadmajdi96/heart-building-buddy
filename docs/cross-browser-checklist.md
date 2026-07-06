# Cross-Browser & Device QA Checklist

Targets: **iOS Safari 16+**, **Android Chrome**, **desktop Chrome/Edge**, **desktop Firefox**, **desktop Safari**.

## Smoke pass (every release)
- [ ] Landing page `/` renders hero + all sections without layout shift
- [ ] `/auth` loads; error boundary shows on forced chunk-load failure and auto-reloads once
- [ ] Sign in with email+password, magic link, reset password
- [ ] RTL Arabic layout mirrors correctly (nav, tables, forms)
- [ ] LTR English layout unaffected after `?lang=en` toggle

## Time tracking (regression: timer frozen on Windows)
- [ ] Start timer → HH:MM:SS increments every second on Windows Firefox, Windows Chrome, Windows Edge
- [ ] Stop timer → duration matches wall-clock ±1s
- [ ] Refresh page mid-timer → resumes with correct elapsed
- [ ] Verify `parseTs` handles Postgres `"YYYY-MM-DD HH:MM:SS+00"` (Firefox rejects this natively)

## Dashboard
- [ ] All StatTiles clickable, land on the right route
- [ ] Cards focusable via keyboard (Tab), Enter activates

## Financials / Payment plans
- [ ] Create plan → invoice split ledger shows all installments
- [ ] Download receipt PDF renders in iOS Safari (uses inline blob URL)
- [ ] Debt-collection reminders show next scheduled date

## Layout guards (per `responsive-layout-patterns`)
- [ ] Header rows use `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `shrink-0`
- [ ] No horizontal scroll at 320px width
- [ ] Sticky headers survive iOS Safari rubber-band scroll
- [ ] Tap targets ≥ 44×44px on mobile

## Known cross-browser gotchas we've patched
| Symptom | Cause | Fix |
|---|---|---|
| Timer frozen at 00:00:00 on Windows Firefox | `Date.parse("2026-07-06 12:34:56+00")` returns NaN | `parseTs()` in `src/routes/app.time.tsx` normalizes space→T and expands short offsets |
| Blank page after redeploy | Stale dynamic-import chunk in cached tab | Root + `/auth` `ErrorComponent` detect ChunkLoadError and hard-reload once |
| Landing page slow to render | framer-motion runtime cost | `motion-lite` shim strips animation runtime |
| Safari animation quirks | framer-motion transforms conflict | `motion-lite` used in `app/primitives.tsx` |

## Manual test URLs
- `/` — landing
- `/auth` — auth
- `/app/dashboard` — pressable tiles
- `/app/time` — timer
- `/app/financials` — payment plans
- `/app/clients` — profile navigation

# Coverage plan — mohkam_landing_content.md + mohkam_readiness.md

Two separate documents, two very different scopes. I want to confirm the plan before I start editing 30+ files.

## Track A — Landing page rewrite (`mohkam_landing_content.md`)

This is a full content + IA rewrite of `src/routes/index.tsx`. Bounded, low risk, purely presentational.

**Remove**
1. "Trusted by" logo marquee (`Trust` section).
2. Placeholder testimonial block (`Testimonial`).
3. All Courtroom Simulation & Legal Academy mentions on marketing.
4. "والعالم العربي" / "wider Arab world" positioning — Jordan only.
5. "فواتير ضريبية" wording (until JoFotara live).

**Change / rewrite in place**
6. Announcement bar → new AR/EN copy.
7. Nav → Platform · How it works · Compliance · Collections · Pricing · FAQ.
8. Hero → new eyebrow / headline / subhead / CTAs / proof bullets; hero visual becomes an anatomized لائحة دعوى document (parties → facts → characterization → subject & basis → requests → evidence list) with a "Ready for lawyer review" seal — no dashboard mock.
9. Six-pillar names → real modules (Case Management, Clients, Deadlines & Hearings, Billing & Finance, Debt Collection, Drafting & Legal Research).
10. Unify CTA verb to "Request beta access / اطلب الوصول للبيتا".
11. Hero mock numbers → realistic JOD only.
12. Fix Privacy/Terms links → route to real `/privacy` and `/terms` pages (new stubs, PDPL-aligned copy from the spec).
13. Unify domain/email to `mohkamlaw.com`.

**Add new sections (bilingual, AR primary)**
14. Honest trust strip (replaces fake logos).
15. Problem section — six pains + closer.
16. "How lawyers work" (inputs → outputs) — centerpiece.
17. Jordan Compliance section with the JoFotara readiness wording + swap-in line.
18. Collections spotlight.
19. AI honest framing + oath line.
20. Honesty block ("What we don't claim").
21. Security summary.
22. Who it's for.
23. Pricing (Starter / Growth / Pro, JOD, "request" CTAs).
24. Beta form (add practice-area field, reply-time promise, cohort scarcity).
25. FAQ (8 items from spec).
26. Final CTA + Footer with real disclaimer + one brand email + +962.

**SEO**
27. Rewrite `head()` meta (AR + EN title/description/keywords per §3.19).

**New files**
- `src/routes/privacy.tsx`, `src/routes/terms.tsx` — real PDPL-aligned stubs.

## Track B — Pilot Readiness (`mohkam_readiness.md`)

This one is much bigger and mixes copy, config, product, infra. I'll split by feasibility inside this repo.

### B1. Ships now (config + UI, all inside the app)
- **Currency/tax/phone/timezone defaults** — JOD, 16%, +962, Asia/Amman as org-level settings; audit and replace any USD/SAR/15%/+966 leftovers across financials, invoicing, expenses, payment plans, seed/mock data.
- **Rename "Tax invoice" → "Billing record"** everywhere in UI + PDF until JoFotara is wired.
- **Hide raw Twilio errors** — replace with human-readable delivery status in SMS logs / debt collection.
- **Research corpus scope** — surface "covers X laws, Y rulings, updated to Z" and enforce "out of corpus → say so" (already partly in `ai-tasks.functions.ts`; make the scope banner visible).
- **Purge junk demo data** — clean `mock-data.ts` (`asdfasdf`, `0.00 SAR`, non-Arabic filler) and reseed with realistic Arabic demo rows.
- **Hide Courtroom Simulation & Legal Academy** behind a flag; remove from the app sidebar nav; keep routes reachable only via direct URL.
- **Reposition SMS** as "Reminders engine" inside Collections/Deadlines, not a top-level product.
- **Analytics vanity cut** — keep revenue, outstanding, overdue deadlines, hours, caseload; drop the rest.
- **Dashboard reorg** — "lawyer's day first": today's hearings, this week's deadlines, overdue invoices, recent documents at the top; KPIs demoted.
- **Nav flatten** — Dashboard · Cases · Clients · Calendar · Billing · Collections · AI Tools · Settings.
- **RTL-first default** — set Arabic as the default locale on first load (keep toggle); audit tables/modals/charts for RTL issues.
- **Hijri + Gregorian on all legal PDFs** — extend the quote helper to invoices, receipts, pleadings.
- **Arabic terminology glossary** — unify موكل/خصم/لائحة دعوى/جلسة/بينة/دفوع via `i18n.tsx`.
- **Empty states + skeletons** on the core list pages (Cases, Clients, Invoices, Deadlines).
- **Table density + column control** on Cases/Invoices lists (extend the existing `data-table-pager`).
- **Global search** — omnibox over cases/clients/documents/invoices (server fn + Cmd-K sheet).
- **Notification center** — bell that surfaces deadlines/hearings/payments in one panel (extend existing `notification-bell`).
- **Onboarding checklist** — org profile → tax settings → first case → first invoice on the dashboard.
- **Case detail merge** — keep one canonical `app.cases.$caseId.tsx`, redirect `app.workspace.$caseId.tsx` to it.
- **New Case wizard** — court level/type · case type · number/year · client + وكالة · opposing party/counsel.
- **Hearing outcome capture** — post-hearing outcome + next-hearing date fields on the session screen.
- **JBA fee + court-fee calculator** — table-driven, wired into quotes/invoices.
- **Power of Attorney (وكالة)** — new table + CRUD tab on client profile (number, notary, scope, expiry, linked case, expiry alerts).
- **Conflict check v2** — extend client-create to screen opposing parties, log dataset version + result.
- **File-cap raise** — bump upload limit to ≥200 MB, chunked upload path (client + server route).
- **Client portal read-only v1** — a `/portal/$token` route showing case status, hearings, invoices, docs (share-token gated).

### B2. Cannot ship in this repo (I'll list them in the coverage report as "out of scope, why")
- **JoFotara integration** — needs an external certified integrator + ISTD credentials the user does not have in-project. Deliverable here: rename "Tax invoice" → "Billing record", keep the "readiness" copy on the landing, prepare the invoice PDF to accept a QR + UBL payload later.
- **Arabic OCR + full-text search** — Cloudflare Worker runtime has no `sharp`/Tesseract; needs an external OCR service. Deliverable: raise cap + queue placeholder; flag as roadmap.
- **WhatsApp Business channel** — requires WhatsApp BSP + Meta review. Deliverable: keep SMS as primary, leave WA channel as a stub.
- **PDPL 24h/72h breach workflow** — process/legal, not code. Deliverable: privacy page + DPA download stub.
- **Native mobile app** — out of scope; PWA manifest is already responsive.

## Deliverables at the end
- Landing page rewritten AR-primary against the spec.
- Two new legal pages (Privacy, Terms).
- App-wide JOD/16%/+962/Asia-Amman lockdown.
- Nav flatten + dashboard "lawyer's day" + onboarding checklist + global search + notification center.
- Case wizard + POA + conflict v2 + hearing outcome + JBA fee calc + client portal v1.
- Hidden Sim/Academy, cleaned demo data, human-readable SMS errors.
- Full **coverage report** at the end, item-by-item against both files, marking each as Done / Partial / Deferred (with reason).

## Confirm before I start
This is roughly 30–50 file edits and 3–5 new DB migrations. Two questions:

1. **Order of shipping** — do you want Track A (landing) merged first as a standalone pass so you can preview it, then Track B (app) after? Or one big pass?
2. **Anything in the B2 "cannot ship" list you want me to attempt anyway** (I'd flag the limits in the report), or leave them as documented gaps?

Approve as-is and I'll start immediately with Track A.

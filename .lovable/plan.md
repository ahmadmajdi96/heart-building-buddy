
# Fill the payment-system gaps — phased plan

Scope is large, so I'll ship in the doc's migration order. Each phase is a self-contained batch that leaves the app in a working state. **WhatsApp is dropped everywhere — SMS only.** All reminder channels comply with Jordan TRC rules (see §J).

Status:
- ✅ Phase 1 — Single ledger + derived statuses (shipped)
- ✅ Phase 2 — Currency lockdown (shipped)
- ✅ Phase 5 — Jordan SMS compliance rail (shipped: sender ID, quiet hours, daily cap, opt-outs, consent, bilingual footer, encoding/segments, inbound STOP handler, settings UI)
- ⏳ Phase 3, 4, 6, 7, 8, 9, 10, 11 — pending

## Phase 1 — Single ledger + derived statuses (kills the over-count bug class)

**Schema (one migration)**
- New `payment_allocations` (payment_id, invoice_id?, schedule_id?, retainer_case_id?, amount, currency, created_at). One payment → many allocations.
- `tax_invoices.status` enum gains `sent`, `viewed`, `written_off`. Keep existing values.
- `tax_invoices.amount_paid` demoted to a **generated / view-computed** value; add trigger that recomputes from `SUM(payment_allocations.amount)` on allocation write. Status derived: paid = allocations ≥ total, partial > 0, overdue = due_date < today AND paid < total.
- New `client_credits` (client_id, org_id, amount, currency, source_payment_id) for overpayments.
- Backfill: existing `payments.invoice_id` → one allocation row per legacy payment.

**Server**
- Rewrite `markInvoicePaid`, `deletePayment`, retainer sync, and `debt_collection_payments` to write allocations.
- Remove `setInvoiceStatus` for computed states (`paid/partial/overdue`); allow only `draft/sent/void/written_off` manual transitions.
- Overpay → automatic client-credit row + auto-apply to next invoice.

**UI**
- Payments dialog gets a multi-invoice allocation picker.
- Invoice detail shows allocations table.
- Client profile shows a "Credit balance" tile.

---

## Phase 2 — Currency lockdown + written-off status
- `payments/tax_invoices/payment_schedules.currency` default changes from `'SAR'` to workspace currency (`organizations.currency`, JOD).
- Insert paths take currency from org, not payload.
- Written-off flow (already added by enum in Phase 1) exposed as a case-closure / invoice action with a required reason.

---

## Phase 3 — Split own-fee installments from Debt Collection
- Own-fee installment plans move onto `payment_schedules` linked only to `invoice_id` (Financials domain). The "Convert to installments" button on the Client Owed tab creates an **invoice + schedule set**, no longer a `debt_case`.
- Existing debt cases created from client fees are migrated to the new plan model (data migration inside Phase 3 migration).
- `debt_cases` becomes strictly third-party recovery (matching Principle 5).

---

## Phase 4 — Pre-bill review queue + expense/disbursement object

**Schema**
- New `expenses` (org_id, case_id, client_id, kind [court_fee/expert/translation/other], amount, currency, incurred_on, billable, status [wip/billed/written_off], invoice_id).
- New `prebills` (org_id, case_id, period_start, period_end, status [draft/approved/billed], subtotal_time, subtotal_expenses, discount, narrative, approved_by, approved_at). A prebill snapshots `time_entries` + `expenses` in a WIP window.

**UI**
- New "Pre-bill" tab per case: shows current-period WIP (time + expenses), inline write-up/write-down, mark non-billable, edit client-facing narrative, "Approve → generate invoice".
- `createInvoiceFromTime` becomes `createInvoiceFromPrebill`; direct time→invoice path deprecated.
- Case + Client tabs add an Expenses list with CRUD.

---

## Phase 5 — Promise-to-pay, aging buckets, and the Jordan compliance rail

**Schema**
- Extend `debt_cases`/`debt_case_payers`: add `promise_to_pay_date`, `promise_amount`, `promised_at`, `dispute_reason`, `disputed_at`, `opted_out_at`, `last_reminder_at`.
- New enum `debtor_status`: `new, contacted, promise_to_pay, partial, paid, disputed, formal_notice, in_litigation, judgment, enforcement, settled, written_off`. Derived from payer state.
- New `sms_opt_outs` (org_id, phone unique, reason, opted_out_at).
- `organizations` gets `sms_quiet_hours_start/end` (defaults **09:00** and **21:00** Asia/Amman), `sms_daily_cap_per_recipient` (default 1), `sms_sender_id` (approved TRC alphanumeric), `sms_bilingual_footer` (bool).

**Server (aging + rail)**
- View `debtor_aging` returning bucket in {0-30, 31-60, 61-90, 90+} per payer, driving ladder position.
- SMS gateway wrapper (`whatsapp.server.ts` → renamed `sms.server.ts`, removes any WhatsApp branch) refuses to send when:
  - recipient in `sms_opt_outs`,
  - local time outside quiet-hours window (Asia/Amman),
  - recipient already received `sms_daily_cap_per_recipient` messages today,
  - status = `promise_to_pay` and today < promise date,
  - status = `disputed`.
- Every send logs to `sms_messages` with template id + language + segment count.

**UI**
- Debtor row: promise-to-pay action (date + amount), dispute action, opt-out marker.
- Debt-collection index gets aging-bucket tiles.
- Workspace Settings → SMS: sender ID, quiet hours, daily cap, opt-out list, compliance preview.

**§J — Jordan SMS regulations enforced by the rail**
- **Sender ID**: must be a TRC-approved alphanumeric; stored per org, injected into every send. UI blocks sends until set.
- **Consent**: `clients`/`debt_case_payers` get `sms_consent_at` + `sms_consent_source`; sends refused without consent for commercial/reminder categories.
- **Opt-out keywords**: inbound STOP / إيقاف / الغاء / UNSUB → write `sms_opt_outs`; every outbound message appends a bilingual opt-out line: `للإيقاف أرسل إيقاف · Reply STOP to unsubscribe`.
- **Language + encoding**: template picked from client's `preferred_language`; Arabic body sent as UCS-2 (70-char segments), Latin as GSM-7 (160). Segment count computed and logged; UI warns before multi-segment sends.
- **Quiet hours**: Amman local 21:00–09:00 blocked; queued for next open window.
- **Frequency cap**: max 1 commercial SMS per recipient per 24h (configurable, default matches TRC guidance).
- **Content limits**: no misleading sender, no third-party promotion, no unsolicited marketing to non-consenting recipients; templates reviewed and versioned in `sms_templates`.
- **Record retention**: `sms_messages` keeps message body, sender id, delivery status, and consent snapshot for 12 months minimum (TRC audit).
- No WhatsApp anywhere — connector references + UI paths removed.

---

## Phase 6 — Quote e-acceptance link; merge billing tabs

- `quotes.share_token`, `accepted_at`, `accepted_ip`, `accepted_otp_hash`.
- Public route `src/routes/share.quote.$token.tsx` shows the quote PDF preview and an OTP-to-accept flow (SMS OTP via the same rail).
- On acceptance → auto-create invoice or engagement (fixed-fee → invoice, hourly → engagement record) and set quote status.
- Financials IA collapses from three tabs (Quotes / Invoices / Tax Invoices) to two (Quotes / Invoices) with `Draft` as a status.

---

## Phase 7 — Payment links (CliQ / eFAWATEERcom) + auto-reconcile

- Abstraction `payment_links` (invoice_id or schedule_id, provider, external_ref, url, qr_svg, status, paid_amount, paid_at).
- Provider adapter interface with two implementations: **CliQ (JoPACC alias)** and **eFAWATEERcom (MADFOOATCOM)**. Public webhook routes under `src/routes/api/public/hooks/{cliq,efawateer}.ts` with HMAC verification; on paid callback create a payment + allocation automatically.
- Invoice PDF + SMS templates embed the pay link + QR.
- Secrets needed from user before this phase: PSP merchant id + webhook secret (add_secret at that point).

---

## Phase 8 — إنذار عدلي generation + debt-case → litigation

- One-click "Generate formal notice" on a debt case: pulls debtor/evidence, calls the drafting module with a bilingual إنذار عدلي template, saves the PDF as a document on the case, logs delivery event.
- "Escalate to litigation" button: creates a `cases` row with debtor as party, links `evidence`, copies amounts as claim value, marks debt case status `in_litigation`. Enforcement (`حجز/تنفيذ`) tracked as case events.

---

## Phase 9 — Remittance runs + client statements

**Schema**
- `remittance_runs` (org_id, client_id, period_start, period_end, total_collected, success_fee, net_remit, status [draft/awaiting_approval/approved/paid], client_approved_at, bank_ref, paid_at).
- `remittance_lines` (run_id, debt_collection_payment_id, amount, fee).

**UI**
- Debt-collection → "Remit" opens a run wizard: pick client + period, preview كشف حساب PDF (bilingual), send to client for approval via signed link (same OTP as quote acceptance), mark remitted with bank reference.

---

## Phase 10 — Trust / retainer accounting (flagship)

- Retainer stops being a synthetic payments row. New `trust_accounts` (org_id, client_id, currency, balance) + `trust_ledger` (account_id, direction [in/out], amount, kind [deposit/apply/refund/adjust], invoice_id?, note, created_by).
- Case `retainer_amount` becomes an expected commitment; actual money lives in trust.
- Apply-to-invoice writes both a trust `out` and a payment allocation of type `retainer`.
- Trust reconciliation report; segregation warnings when firm cash and trust cash mix.

---

## Phase 11 — Reports (aging, realization, collection) + client-facing PDFs

- New `/app/financials/reports` with three canonical KPIs (aging buckets, realization = billed ÷ worked, collection = collected ÷ billed).
- Per-client recovery PDF report for debt-collection engagements.
- Activity log gets consistent writes across payments/allocations/trust/remittance/prebill/expenses.

---

## Cross-cutting cleanup
- Remove `WhatsApp` label and code paths from `whatsapp.server.ts`, `sms.functions.ts`, i18n strings, and UI.
- Drop the 25-payer ceiling; CSV import for debt portfolios (Rung 0).
- Fuzzy Arabic conflict-check against `cases` + `clients` on debtor intake.
- Fee-agreement object on debt cases (success %, flat, hybrid, per-rung tier).

---

## Sequencing note
Phases 1–5 are the bug-killers and the compliance rail — biggest wins. Phase 7 requires PSP credentials (I'll pause and request them at that point via the secure secrets form). Phase 10 is the flagship and depends on Phase 1's ledger, so it ships last.

## Out of scope for this initiative
- Design token / visual redesign.
- Auth changes.
- Native mobile app.

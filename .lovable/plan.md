# Implementation Plan — Mohkam Law Overhaul

Big batch across four areas. I'll ship a single migration first, then the UI/server changes.

## 1. Database migration (single migration)

New columns / tables:
- `cases`: add `agreed_fee numeric`, `retainer_amount numeric`, `hourly_rate numeric`, `fee_currency text default 'JOD'`, `close_result text` (won/lost/settled/withdrawn/other), `closed_at timestamptz`.
- `documents`: ensure `client_id uuid` FK exists (used by counter + client tab). Add index.
- `debt_cases`: add `recurrence text` (none/weekly/monthly/yearly), `recurrence_interval int default 1`, `next_recur_at date`, `parent_debt_case_id uuid` (for tracking series).
- `payment_schedules`: already exists — will reuse for installments.
- New: `case_pricing` covered by columns on `cases` (no separate table).

All new columns nullable so existing rows are safe. Migration also backfills `documents.client_id` from `cases.client_id` where a document has a `case_id` and no `client_id`.

## 2. Documents page
- Add split "New" action → menu: **Upload file**, **From template**, and require selecting either a case or a client (or both). Templates come from existing `drafts` table.
- Fix client-related counter: query `documents` by `client_id` OR by `case_id IN (client's cases)`.

## 3. Case Management
- **Close case button**: on case profile → opens dialog "Close case" with result select (Won / Lost / Settled / Withdrawn / Other) + optional note; sets `status='closed'`, `close_result`, `closed_at`.
- **List → table with page-size selector** (25/50/100/200) mirroring the activity log pattern, with search + status filter.
- **Pricing section** on case profile: agreed fee, retainer, hourly rate, currency. Editable inline.
- Remove Invoices tab from case profile (moved to client).

## 4. Clients Management
- Client profile: expand tabs to **Overview, Cases, Documents, Meetings, Appointments, Invoices, Payments, Owed, Interactions, Activity**.
  - Each tab lists items and supports add/delete (inline dialogs).
  - Cases tab "Attach case" picker: only cases with `client_id IS NULL`.
  - **Owed tab**: computes total owed = unpaid invoices + unbilled billable time entries + case retainer balance. Shows table + a **Convert to installments** button → opens dialog (amount, currency, N installments, frequency weekly/monthly, start date). Creates one debt case + N `payment_schedules` rows.
- **List → paginated table** (same pattern as activity log).
- Invoices are now shown per-client (query `tax_invoices` by client's case_ids + direct client_id). Migration keeps `case_id` — invoices list joins through cases.

## 5. Debt Cases
- Replace "Service fees" card on index with a more useful metric — **Collected this month** (sum of `debt_collection_payments.amount` where paid_at in current month).
- **List → paginated table** with page-size selector.
- Add recurrence: create/edit debt case dialog gets a "Recurring" section (none/weekly/monthly/yearly + interval). A daily cron (`api.public.hooks.debt-reminders` or new `debt-recurrence` hook) rolls over due recurring cases, creating a child case + updating `next_recur_at`.
- Recurrence badge shown on the row.

## Files touched
- New migration
- `src/lib/documents.functions.ts` — counter fix, template upload
- `src/lib/cases.functions.ts` — close case, pricing fields
- `src/lib/clients.functions.ts` — owed calculation, attach case, installment converter
- `src/lib/debt-collection.functions.ts` — recurrence, monthly-collected metric
- `src/routes/app.documents.tsx` — new/template picker, counter query
- `src/routes/app.cases.index.tsx` — paginated table
- `src/routes/app.cases.$caseId.tsx` — close button, pricing, drop invoices tab
- `src/routes/app.clients.index.tsx` — paginated table
- `src/routes/app.clients.$clientId.tsx` — new tabs, owed, installments
- `src/routes/app.debt-collection.index.tsx` — new metric card, paginated table, recurrence UI
- New shared `src/components/data-table-pager.tsx` — reusable page-size + pager (activity log pattern)
- New `src/routes/api.public.hooks.debt-recurrence.ts` + cron insert

## Out of scope
- No design token changes.
- No auth changes.
- Invoice UI itself unchanged; only where it's surfaced.

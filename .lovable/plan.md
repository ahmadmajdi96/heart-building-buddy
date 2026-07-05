# Implementation Plan

## 1. Toasts on creation (Cases + Clients)
Root cause: mutation `onSuccess` fires, but form dialog closes and re-renders may swallow toast. Fix by moving `toast.success` calls to before `setOpen(false)` and ensure Sonner Toaster mounted in `__root.tsx`. Verify both add and edit flows.

## 2. Client email validation feedback
In client dialog: parse with same Zod schema client-side before submit; on failure, show inline red helper text under the email field + `toast.error("Invalid email")`. Prevent submission.

## 3. Cases table column order
In `app.cases.index.tsx` cases table, move Client column before Address (currently after). Adjust header + row cells and mobile card layout to match.

## 4. Client profile page (like case profile)
Add route `src/routes/app.clients.$clientId.tsx` mirroring `app.cases.$caseId.tsx`:
- Header w/ name, status, type
- Tabs: Overview, Cases, Interactions, Documents, Invoices, Activity
- Uses existing `getClient` + queries for documents/invoices filtered by `client_id`
- Link from clients list row → detail page

## 5. CRUD in all case-profile tabs
In `app.cases.$caseId.tsx`:
- **Events**: already has add; add edit + delete with confirm + toasts
- **Documents**: add upload + delete + view (see #6)
- **Appointments**: add create/edit/delete inline (use `appointments.functions`)
- **Invoices**: create draft invoice + delete + status change
- **Time entries**: add create/edit/delete
All with AlertDialog confirms + sonner toasts.

## 6. Document preview in case profile
Reuse `DocumentPreviewBody` from `financials/document-preview` (or extract to shared) and add "View" icon on doc rows in case profile, opening Dialog with iframe/img.

## 7. Draft "Invoices" tab in Financials
- New table `public.draft_invoices` (same shape as `tax_invoices` minus tax fields, status: draft/accepted/rejected)
- Migration with GRANT + RLS (org-scoped)
- Server fns: `listDrafts`, `createDraft`, `updateDraft`, `deleteDraft`, `acceptDraft` (moves to `tax_invoices`)
- New tab in `app.financials.tsx` "Invoices" (before "Tax Invoices"); "Accept" button converts + removes from drafts

## 8. Time tracker: bulk delete + invoice targets drafts
- Add checkboxes per row + "Delete selected" button with AlertDialog confirm + toast
- `bulkDeleteTimeEntries` server fn
- Change "Create invoice from selected" to create a **draft invoice** (calls `createDraft`) instead of `createInvoiceFromTime` (which writes to `tax_invoices`)

## Technical notes
- New migration: `draft_invoices` table, GRANTs, RLS (org-member read/write, service_role all), `updated_at` trigger
- New file: `src/lib/draft-invoices.functions.ts`
- Shared: extract `DocumentPreviewBody` to `src/components/documents/preview.tsx` if not already reusable
- Reuse existing zod schemas; add client-side `.parse` in client form
- All destructive actions: `AlertDialog` + `toast.success/.error`

## Files touched
- `supabase` migration (new table)
- `src/lib/draft-invoices.functions.ts` (new)
- `src/lib/time-entries.functions.ts` (add bulk delete)
- `src/routes/app.clients.tsx` (link to detail, validation, toasts)
- `src/routes/app.clients.$clientId.tsx` (new)
- `src/routes/app.cases.index.tsx` (column reorder, toasts confirm)
- `src/routes/app.cases.$caseId.tsx` (CRUD all tabs, doc preview)
- `src/routes/app.financials.tsx` (Invoices tab)
- `src/routes/app.time.tsx` (bulk delete, draft invoice)
- `src/components/documents/preview.tsx` (shared, optional)

## Out of scope
No design system changes; keep existing tokens and typography.

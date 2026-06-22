
## Goals

1. Two account types: **Solo Lawyer** and **Law Firm**.
2. Firms have **members with roles** (owner, partner, associate, paralegal, accountant, assistant) with permission-gated access.
3. **Organization profile** (logo, legal name, email, phone, address, tax ID) configured once and reused in every financial document, header, and outgoing communication.
4. Replace `Billing & Invoices` with a single **Financials** page containing tabs: Payments, Payment Schedules, Quotes, Tax Invoices.
5. Everything adapts to the active account type (solo vs firm).

---

## Data model (new migration)

```text
organizations           one row per workspace (solo or firm)
  id, type ('solo'|'firm'), legal_name, display_name,
  email, phone, address, tax_id, logo_path, currency, created_by

organization_members    user ↔ org with a role
  org_id, user_id, role ('owner'|'partner'|'associate'|'paralegal'|'accountant'|'assistant'),
  status ('active'|'invited'|'disabled'), invited_email

app_role                enum reused by has_role() (separate user_roles table kept
                        for cross-org platform roles like 'admin')

clients / cases / ...   add org_id FK (backfill from profiles.org)

financial_accounts      payment methods / bank accounts on the org
quotes                  org_id, client_id, case_id, number, issue_date,
                        valid_until, status, subtotal, tax, total, notes, items jsonb
tax_invoices            org_id, client_id, case_id, quote_id?, number, issue_date,
                        due_date, status, subtotal, tax, total, items jsonb, pdf_path
payments                org_id, invoice_id?, client_id, amount, method, paid_at, reference
payment_schedules       org_id, invoice_id, due_date, amount, status, reminder_sent_at
```

Add storage bucket `org-assets` (logos) with org-scoped RLS.

All public tables get explicit GRANTs + RLS scoped via a `is_org_member(org_id, role[])` security-definer function so policies never recurse.

---

## Server (TanStack server functions)

- `organizations.functions.ts` — `getMyOrg`, `updateOrg`, `uploadLogo`, `switchOrg`.
- `members.functions.ts` — `listMembers`, `inviteMember`, `updateMemberRole`, `removeMember`. Owner/partner only.
- `financials.functions.ts` — CRUD for quotes, invoices, payments, schedules; PDF rendering helpers reuse org profile.
- All gated by `requireSupabaseAuth` + `has_role`/`is_org_member` checks.

---

## Frontend

### Onboarding
After signup, if user has no org → `/app/onboarding` asks "Solo lawyer or Law firm?" and collects org profile fields. Creates org + adds caller as `owner`.

### Settings → Organization tab
Edit logo, name, contact, address, tax ID, currency. Solo and firm share the form; firm adds a **Members** subtab (invite, role change, remove).

### Access control
- `useOrg()` hook exposes `{ org, role, can(permission) }`.
- Permission matrix:

```text
                    owner partner associate paralegal accountant assistant
manage_org           x      x
manage_members       x      x
view_cases           x      x      x         x                    x
edit_cases           x      x      x         x
view_financials      x      x                          x
edit_financials      x      x                          x
view_clients         x      x      x         x                    x
```

- Sidebar items and route `beforeLoad` use `can(...)`; unauthorized → `/app/unauthorized`.

### Financials page (`/app/financials`)
Replaces `/app/billing`. Single route, shadcn `Tabs`:
1. **Payments** — list, record payment, filter by client/case/date.
2. **Schedules** — upcoming/overdue installments, mark paid, send reminder.
3. **Quotes** — create/edit/send, convert to invoice, PDF preview.
4. **Tax Invoices** — create/edit/issue, mark paid, PDF preview with org header (logo + legal name + tax ID + address).

PDF/preview component pulls org profile so solo vs firm renders correctly with the right logo, name, and contact block.

---

## File changes

- New: `supabase` migration; `src/lib/organizations.functions.ts`, `members.functions.ts`, `financials.functions.ts`; `src/lib/org-context.tsx` (`useOrg`, `can`); `src/components/financials/*` (tabs, forms, pdf-preview); `src/components/org/document-header.tsx`.
- New routes: `src/routes/app.onboarding.tsx`, `src/routes/app.financials.tsx`, `src/routes/app.unauthorized.tsx`.
- Update: `src/routes/app.settings.tsx` (Organization + Members tabs), `src/routes/app.tsx` (load org, gate nav by `can`), sidebar/nav to rename "Billing" → "Financials".
- Delete/redirect: `src/routes/app.billing.tsx` → redirect to `/app/financials`.
- i18n strings for new screens (EN + AR).

---

## Open questions

1. **Tax model** — flat % per org, per line item, or both (e.g. VAT + withholding)?
2. **Invoice numbering** — auto sequence per org (`INV-2026-0001`) ok, or do you have a required format?
3. **Multi-org per user?** A lawyer could belong to a firm AND have a solo practice — support org switcher now or assume one org per user for v1?
4. **Payment processing** — record payments manually only, or wire a real processor (Stripe/Paddle) now?

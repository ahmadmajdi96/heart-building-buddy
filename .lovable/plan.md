This is a large, schema-heavy build. I'll do it in one coordinated pass so the data model is consistent. Here's exactly what I'll ship.

## 1. Database schema (single migration)

Tables (all with RLS scoped to `owner_id = auth.uid()`, plus GRANTs for `authenticated` + `service_role`):

- `profiles` — id (auth.users), full_name, avatar_url, role
- `clients` — id, owner_id, name, email, phone, company, national_id, address, notes, created_at
- `client_interactions` — id, owner_id, client_id, kind (`call`|`session`|`note`|`email`), title, body, occurred_at
- `cases` — id, owner_id, client_id (nullable), title, case_number, court, jurisdiction, status (`open`|`pending`|`closed`|`won`|`lost`), priority, opened_at, description
- `case_events` — id, owner_id, case_id, kind (`update`|`feedback`|`court_session`|`appointment`|`milestone`), title, body, scheduled_at (nullable), completed bool, created_at
- `appointments` — id, owner_id, case_id (nullable), client_id (nullable), title, description, location, starts_at, ends_at, all_day bool, color, kind (`court`|`meeting`|`deadline`|`reminder`)
- `documents` — id, owner_id, case_id (nullable), client_id (nullable), name, mime_type, size, storage_path, extracted_text (nullable), tags, created_at
- `drafts` — id, owner_id, case_id (nullable), title, template, variables jsonb, content, created_at, updated_at
- `courtroom_simulations` — id, owner_id, case_id (nullable), scenario jsonb, transcript jsonb, verdict jsonb, score int, created_at

Storage bucket: `documents` (private) with RLS so users only access their own paths (`{user_id}/...`).

## 2. Server functions (`src/lib/*.functions.ts`)

All use `requireSupabaseAuth`:

- `clients.functions.ts` — list, get, create, update, delete; list/create interactions
- `cases.functions.ts` — list, get (with events, documents, client), create, update, delete; create/update/delete event
- `appointments.functions.ts` — list (by date range), create, update, delete
- `documents.functions.ts` — list, create (after upload), getSignedUrl (download), delete (storage + row)
- `drafting.functions.ts` — list drafts, save draft, generate draft (calls AI with variables + selected document text)
- `courtroom.functions.ts` (extend) — auto-save simulation, list past simulations
- `analytics.functions.ts` — aggregate counts/trends; `generateInsights` (AI) over real data

## 3. AI text sanitization

New `src/lib/markdown.tsx` — renders model output with `react-markdown` + `remark-gfm` (lists, bullets, headings, tables). Replace every `<div>{aiText}</div>` across research, drafting, courtroom, analytics with `<MarkdownView>`. Removes the `###` raw display.

## 4. Drafting variables + document picker

`/app/drafting`:
- Variables editor: add/remove key→value rows; `{{key}}` placeholders interpolated client-side preview AND sent to AI
- Document picker: multi-select from user's uploaded documents (with "none" option). Selected docs' `extracted_text` is included in AI context.
- Save generated draft to `drafts` table; list saved drafts.

## 5. Calendar — Google-Calendar style

`/app/calendar`:
- Month/Week/Day toggle
- Click empty slot → create appointment dialog
- Click event → edit/delete
- Events colored by `kind`; drag handled via simple time-pick (no drag-and-drop library to keep scope tight — clickable edit instead)
- Filter by case/client

## 6. Cases — full profiling

`/app/cases`:
- List + create/edit/delete
- Detail drawer/page: overview, linked client, timeline of `case_events` (updates, feedback, court sessions, appointments), document list with upload/download/delete, schedule appointment inline, add update/feedback inline.

## 7. Clients — full CRUD + profile

`/app/clients`:
- List + create/edit/delete
- Detail drawer: client info, related cases (auto), interaction log (calls, sessions, notes, emails) with add/delete.

## 8. Documents page

- Upload (to storage), list, download (signed URL), delete (storage + row)
- Optional case/client assignment
- Text extraction: for `.txt`/`.md` on upload; PDFs stored as-is, AI can still reference name/tags

## 9. Courtroom auto-save

- On verdict/sign, automatically insert into `courtroom_simulations`
- "Past simulations" panel listing prior runs with reload

## 10. Analytics — expanded + AI insights

`/app/analytics`:
- KPIs from real tables: total cases by status, win rate, upcoming appointments (7d), documents count, client growth, draft count, courtroom sessions count
- Charts: cases over time, appointments per week, case status distribution, top clients by case count
- "AI Insights" panel: server fn calls Lovable AI with aggregated stats → returns prioritized insights/recommendations (sanitized markdown)

## Technical notes

- All AI calls go through existing `ai-gateway.server.ts` helper (`google/gemini-3-flash-preview`).
- Storage uploads go through a server fn that returns a signed upload URL, or direct `supabase.storage` from client using user session (simpler — chosen).
- New deps: `react-markdown`, `remark-gfm`, `date-fns` (already?), no calendar lib.
- Existing `mock-data.ts` is replaced where pages now read from DB.
- Auth gate: all `/app/*` routes already authenticated via current setup; will move under `_authenticated` if not already.

## Out of scope (will mention in closing)

- Drag-to-resize calendar events
- Real-time collaboration
- PDF text extraction (would need a worker-compatible parser; stored & referenced by name instead)

Ready to build on approval.
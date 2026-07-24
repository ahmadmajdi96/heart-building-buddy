import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GlobalSearchHit = {
  id: string;
  type: "client" | "case" | "invoice" | "document" | "debt_case";
  title: string;
  subtitle?: string;
  href: string;
};

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }): Promise<GlobalSearchHit[]> => {
    const sb = context.supabase as any;
    const q = data.q.trim();
    const like = `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`;
    const hits: GlobalSearchHit[] = [];

    const [clients, cases, invoices, documents, debts] = await Promise.all([
      sb.from("clients").select("id,name,company,email,phone").or(
        `name.ilike.${like},company.ilike.${like},email.ilike.${like},phone.ilike.${like}`
      ).limit(6),
      sb.from("cases").select("id,title,case_number,status").or(
        `title.ilike.${like},case_number.ilike.${like}`
      ).limit(6),
      sb.from("tax_invoices").select("id,number,total,status").ilike("number", like).limit(6),
      sb.from("documents").select("id,name,case_id,client_id").ilike("name", like).limit(6),
      sb.from("debt_cases").select("id,case_number,title,status").or(
        `case_number.ilike.${like},title.ilike.${like}`
      ).limit(6),
    ]);

    for (const c of clients.data ?? []) {
      hits.push({
        id: c.id, type: "client",
        title: c.name || c.company || "—",
        subtitle: [c.company, c.email, c.phone].filter(Boolean).join(" · "),
        href: `/app/clients/${c.id}`,
      });
    }
    for (const c of cases.data ?? []) {
      hits.push({
        id: c.id, type: "case",
        title: c.title || c.case_number || "—",
        subtitle: [c.case_number, c.status].filter(Boolean).join(" · "),
        href: `/app/cases/${c.id}`,
      });
    }
    for (const i of invoices.data ?? []) {
      hits.push({
        id: i.id, type: "invoice",
        title: i.number || "Invoice",
        subtitle: [i.status, i.total != null ? `${i.total}` : null].filter(Boolean).join(" · "),
        href: `/app/invoices`,
      });
    }
    for (const d of documents.data ?? []) {
      hits.push({
        id: d.id, type: "document",
        title: d.name || "Document",
        href: `/app/documents`,
      });
    }
    for (const d of debts.data ?? []) {
      hits.push({
        id: d.id, type: "debt_case",
        title: d.title || d.case_number || "—",
        subtitle: [d.case_number, d.status].filter(Boolean).join(" · "),
        href: `/app/debt-collection/${d.id}`,
      });
    }

    return hits;
  });

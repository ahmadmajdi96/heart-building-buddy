import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrgRole = "owner" | "partner" | "associate" | "paralegal" | "accountant" | "assistant";
export type OrgType = "solo" | "firm";
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type Permission =
  | "manage_org"
  | "manage_members"
  | "view_cases"
  | "edit_cases"
  | "view_clients"
  | "view_financials"
  | "edit_financials"
  | "delete_financials";

const matrix: Record<OrgRole, Permission[]> = {
  owner: ["manage_org","manage_members","view_cases","edit_cases","view_clients","view_financials","edit_financials","delete_financials"],
  partner: ["manage_org","manage_members","view_cases","edit_cases","view_clients","view_financials","edit_financials","delete_financials"],
  associate: ["view_cases","edit_cases","view_clients"],
  paralegal: ["view_cases","edit_cases","view_clients"],
  accountant: ["view_clients","view_financials","edit_financials"],
  assistant: ["view_cases","view_clients"],
};

type Ctx = {
  loading: boolean;
  org: Organization | null;
  role: OrgRole | null;
  userId: string | null;
  can: (p: Permission) => boolean;
  refresh: () => Promise<void>;
};

const OrgCtx = createContext<Ctx | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    setUserId(uid);
    if (!uid) { setOrg(null); setRole(null); setLoading(false); return; }
    const { data: mem } = await supabase
      .from("organization_members")
      .select("role, org_id, organizations(*)")
      .eq("user_id", uid)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (mem && mem.organizations) {
      setOrg(mem.organizations as Organization);
      setRole(mem.role as OrgRole);
    } else {
      setOrg(null); setRole(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const can = (p: Permission) => !!role && matrix[role].includes(p);

  return (
    <OrgCtx.Provider value={{ loading, org, role, userId, can, refresh: load }}>
      {children}
    </OrgCtx.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgCtx);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}

export function roleLabel(r: OrgRole, locale: "ar" | "en"): string {
  const m: Record<OrgRole, [string,string]> = {
    owner: ["المالك", "Owner"],
    partner: ["شريك", "Partner"],
    associate: ["محامٍ", "Associate"],
    paralegal: ["مساعد قانوني", "Paralegal"],
    accountant: ["محاسب", "Accountant"],
    assistant: ["إداري", "Assistant"],
  };
  return m[r][locale === "ar" ? 0 : 1];
}

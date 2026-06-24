
function TeamTab({ caseId }: { caseId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listCaseMembers);
  const add = useServerFn(addCaseMember);
  const remove = useServerFn(removeCaseMember);
  const updateRole = useServerFn(updateCaseMemberRole);
  const listUsers = useServerFn(listAssignableUsers);
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ user_id: string; full_name: string | null }>>([]);
  const [picking, setPicking] = useState<string>("");
  const [pickRole, setPickRole] = useState<string>("associate");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [ms, us] = await Promise.all([list({ data: { case_id: caseId } }), listUsers()]);
      setRows(ms as any[]);
      setUsers(us as any[]);
    } catch (e) { toast.error((e as Error).message); }
  }
  useEffect(() => { refresh(); }, [caseId]);

  const assignedIds = new Set(rows.map((r) => r.user_id));
  const available = users.filter((u) => !assignedIds.has(u.user_id));

  const roleLabels: Record<string, [string, string]> = {
    lead: ["محامي رئيسي", "Lead"],
    co_counsel: ["محامي مشارك", "Co-counsel"],
    associate: ["محامي", "Associate"],
    paralegal: ["مساعد قانوني", "Paralegal"],
    support: ["دعم", "Support"],
  };
  const tr = (k: string) => roleLabels[k]?.[ar ? 0 : 1] ?? k;

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <Label>{ar ? "إضافة عضو فريق" : "Add team member"}</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Select value={picking} onValueChange={setPicking}>
            <SelectTrigger><SelectValue placeholder={ar ? "اختر زميلًا…" : "Select a colleague…"} /></SelectTrigger>
            <SelectContent>
              {available.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{ar ? "لا يوجد زملاء متاحون" : "No available colleagues"}</div>}
              {available.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pickRole} onValueChange={setPickRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(roleLabels).map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="gold" size="sm" className="gap-1.5" disabled={!picking || busy} onClick={async () => {
            setBusy(true);
            try {
              await add({ data: { case_id: caseId, user_id: picking, role: pickRole as any } });
              setPicking(""); setPickRole("associate"); refresh();
              toast.success(ar ? "أُضيف العضو" : "Member added");
            } catch (e) { toast.error((e as Error).message); }
            finally { setBusy(false); }
          }}><UserPlus className="size-4" />{ar ? "إضافة" : "Add"}</Button>
        </div>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا يوجد أعضاء بعد" : "No team members yet"}</div>
        : <ul className="divide-y">{rows.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium">{m.profiles?.full_name || m.user_id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{ar ? "أُضيف" : "Added"} {new Date(m.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={m.role} onValueChange={async (v) => {
                try { await updateRole({ data: { id: m.id, role: v as any } }); refresh(); }
                catch (e) { toast.error((e as Error).message); }
              }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(roleLabels).map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={async () => {
                if (!confirm(ar ? "إزالة العضو؟" : "Remove member?")) return;
                try { await remove({ data: { id: m.id } }); refresh(); }
                catch (e) { toast.error((e as Error).message); }
              }}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          </li>
        ))}</ul>}
      </div>
    </div>
  );
}

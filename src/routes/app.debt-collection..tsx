
/* -------------- Settings: reminder rules -------------- */

const TEMPLATE_VARS = [
  { key: "{{name}}", label: "Payer name" },
  { key: "{{amount_due}}", label: "Amount due" },
  { key: "{{amount_paid}}", label: "Amount paid" },
  { key: "{{balance}}", label: "Remaining balance" },
  { key: "{{due_date}}", label: "Due date" },
  { key: "{{case_title}}", label: "Case title" },
  { key: "{{case_type}}", label: "Case type" },
  { key: "{{reference}}", label: "Case reference" },
  { key: "{{currency}}", label: "Currency" },
  { key: "{{forwarder}}", label: "Forwarder name" },
];

function offsetLabel(days: number, ar: boolean) {
  if (days === 0) return ar ? "في يوم الاستحقاق" : "On due date";
  if (days < 0) return ar ? `${Math.abs(days)} يوم قبل الاستحقاق` : `${Math.abs(days)} day(s) before due`;
  return ar ? `${days} يوم بعد الاستحقاق` : `${days} day(s) after due`;
}

function SettingsTab({ caseId, caseData, ar }: any) {
  const qc = useQueryClient();
  const listFn = useServerFn(listReminderRules);
  const saveFn = useServerFn(saveReminderRule);
  const delFn = useServerFn(deleteReminderRule);
  const [editing, setEditing] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["debt-reminder-rules", caseId],
    queryFn: () => listFn({ data: { case_id: caseId } }),
  });

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => {
      toast.success(ar ? "تم الحفظ" : "Saved");
      qc.invalidateQueries({ queryKey: ["debt-reminder-rules", caseId] });
      setOpenDialog(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success(ar ? "تم الحذف" : "Deleted");
      qc.invalidateQueries({ queryKey: ["debt-reminder-rules", caseId] });
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{ar ? "قواعد التذكير التلقائي" : "Automatic reminder rules"}</div>
          <div className="text-xs text-muted-foreground">
            {ar
              ? "أضف عدة تذكيرات مع محتوى مخصص. سيتم إرسالها تلقائياً للدافعين حسب تاريخ الاستحقاق."
              : "Add multiple reminders with custom message content. Sent to payers automatically based on their due date."}
          </div>
        </div>
        <Dialog open={openDialog} onOpenChange={(v) => { setOpenDialog(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="gold" onClick={() => setEditing(null)}>
              <Plus className="size-4" />{ar ? "إضافة تذكير" : "Add reminder"}
            </Button>
          </DialogTrigger>
          <ReminderRuleDialog
            caseId={caseId}
            initial={editing}
            onSubmit={(v: any) => save.mutate(v)}
            pending={save.isPending}
            ar={ar}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-10 text-center"><Loader2 className="size-5 animate-spin inline" /></div>
      ) : (rules ?? []).length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد قواعد بعد. أضف واحدة للبدء." : "No rules yet. Add one to start."}
        </div>
      ) : (
        <div className="space-y-2">
          {(rules ?? []).map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{r.label}</div>
                  <Badge variant="outline" className="text-xs">{offsetLabel(r.offset_days, ar)}</Badge>
                  {!r.active && <Badge variant="secondary" className="text-xs">{ar ? "معطل" : "Inactive"}</Badge>}
                </div>
                <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{r.message_template}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(r); setOpenDialog(true); }}>
                  {ar ? "تعديل" : "Edit"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">{ar ? "المتغيرات المتاحة" : "Available variables"}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {TEMPLATE_VARS.map((v) => (
            <code key={v.key} className="rounded bg-background px-1.5 py-0.5">{v.key}</code>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ReminderRuleDialog({ caseId, initial, onSubmit, pending, ar }: any) {
  const [form, setForm] = useState(() => ({
    id: initial?.id,
    case_id: caseId,
    label: initial?.label ?? "",
    offset_days: initial?.offset_days ?? -3,
    kind: initial?.kind ?? "reminder_upcoming",
    message_template: initial?.message_template ?? "Hi {{name}}, this is a reminder that {{amount_due}} {{currency}} is due on {{due_date}} for {{case_title}}.",
    active: initial?.active ?? true,
  }));
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) { setForm((f) => ({ ...f, message_template: f.message_template + v })); return; }
    const start = el.selectionStart ?? form.message_template.length;
    const end = el.selectionEnd ?? form.message_template.length;
    const next = form.message_template.slice(0, start) + v + form.message_template.slice(end);
    setForm({ ...form, message_template: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + v.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{initial ? (ar ? "تعديل التذكير" : "Edit reminder") : (ar ? "تذكير جديد" : "New reminder")}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>{ar ? "التسمية" : "Label"}</Label>
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={ar ? "مثال: تذكير قبل ٣ أيام" : "e.g. 3-day advance reminder"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{ar ? "التوقيت (أيام مقارنة بالاستحقاق)" : "Timing (days vs due date)"}</Label>
            <Input type="number" value={form.offset_days} onChange={(e) => setForm({ ...form, offset_days: Number(e.target.value) })} />
            <div className="mt-1 text-xs text-muted-foreground">{offsetLabel(form.offset_days, ar)}</div>
          </div>
          <div>
            <Label>{ar ? "النوع" : "Kind"}</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reminder_upcoming">Upcoming</SelectItem>
                <SelectItem value="reminder_due">Due</SelectItem>
                <SelectItem value="reminder_overdue">Overdue</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>{ar ? "محتوى الرسالة" : "Message content"}</Label>
          <Textarea ref={textareaRef} rows={5} value={form.message_template} onChange={(e) => setForm({ ...form, message_template: e.target.value })} />
          <div className="mt-2 flex flex-wrap gap-1">
            {TEMPLATE_VARS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVar(v.key)}
                className="rounded border border-border/60 bg-background px-1.5 py-0.5 text-xs hover:bg-muted"
                title={v.label}
              >
                {v.key}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
          <div>
            <div className="text-sm font-medium">{ar ? "مفعل" : "Active"}</div>
            <div className="text-xs text-muted-foreground">{ar ? "أوقف مؤقتاً بدون حذف" : "Pause without deleting"}</div>
          </div>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="gold" disabled={pending || !form.label || !form.message_template} onClick={() => onSubmit(form)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : (ar ? "حفظ" : "Save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

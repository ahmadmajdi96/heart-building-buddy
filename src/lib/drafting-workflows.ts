/**
 * Structured drafting workflows (pilot gate #4).
 *
 * Six guided workflows replace the old free-text generator:
 *   1. استشارة قانونية      — legal opinion / advice memo
 *   2. لائحة دعوى           — statement of claim (wizard)
 *   3. لائحة جوابية         — statement of defence / reply
 *   4. عقد                  — contract
 *   5. وكالة                — power of attorney
 *   6. مكتبة النماذج        — template library
 *
 * Pure data — imported by both the page and the server function so the AI
 * prompt and the UI can never drift apart.
 */
import type { Bi } from "./jordan-legal";

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "multiselect" | "money";

export type WorkflowField = {
  name: string;
  label: Bi;
  type: FieldType;
  required?: boolean;
  placeholder?: Bi;
  help?: Bi;
  options?: { value: string; label: Bi }[];
  /** UI grouping — fields with the same step render together. */
  step: number;
};

export type WorkflowKind = "opinion" | "claim" | "reply" | "contract" | "poa" | "library";

export type Workflow = {
  kind: WorkflowKind;
  label: Bi;
  blurb: Bi;
  icon: "scroll" | "gavel" | "shield" | "handshake" | "stamp" | "library";
  steps: Bi[];
  fields: WorkflowField[];
  /** Document skeleton the model must follow, in order. */
  outline: Bi[];
};

const YES_NO = [
  { value: "yes", label: { ar: "نعم", en: "Yes" } },
  { value: "no", label: { ar: "لا", en: "No" } },
];

/* ----------------------------- 1. استشارة ----------------------------- */
const opinion: Workflow = {
  kind: "opinion",
  label: { ar: "استشارة قانونية", en: "Legal opinion" },
  blurb: { ar: "مذكّرة رأي قانوني مسنَدة إلى التشريع الأردني مع الخيارات والمخاطر.", en: "An advice memo grounded in Jordanian legislation, with options and risks." },
  icon: "scroll",
  steps: [
    { ar: "الأطراف والسياق", en: "Parties & context" },
    { ar: "المسألة القانونية", en: "Legal question" },
    { ar: "المخرجات", en: "Output" },
  ],
  fields: [
    { step: 0, name: "client_name", type: "text", required: true, label: { ar: "اسم الموكل", en: "Client name" } },
    { step: 0, name: "matter", type: "text", required: true, label: { ar: "موضوع الاستشارة", en: "Matter" }, placeholder: { ar: "مثال: إنهاء عقد عمل غير محدد المدة", en: "e.g. Terminating an open-ended employment contract" } },
    { step: 0, name: "facts", type: "textarea", required: true, label: { ar: "الوقائع", en: "Facts" }, help: { ar: "اسرد الوقائع بالترتيب الزمني — كلما زادت التفاصيل، دقّت المذكرة.", en: "List the facts chronologically — more detail yields a sharper memo." } },
    { step: 1, name: "questions", type: "textarea", required: true, label: { ar: "الأسئلة المطلوب الإجابة عنها", en: "Questions to answer" }, placeholder: { ar: "سؤال في كل سطر", en: "One question per line" } },
    { step: 1, name: "area", type: "select", label: { ar: "الفرع القانوني", en: "Area of law" }, options: [
      { value: "civil", label: { ar: "مدني", en: "Civil" } },
      { value: "commercial", label: { ar: "تجاري وشركات", en: "Commercial & companies" } },
      { value: "labour", label: { ar: "عمل وضمان اجتماعي", en: "Labour & social security" } },
      { value: "criminal", label: { ar: "جزائي", en: "Criminal" } },
      { value: "personal_status", label: { ar: "أحوال شخصية", en: "Personal status" } },
      { value: "administrative", label: { ar: "إداري", en: "Administrative" } },
      { value: "tax", label: { ar: "ضريبي وجمركي", en: "Tax & customs" } },
      { value: "realestate", label: { ar: "عقاري وإيجارات", en: "Real estate & tenancy" } },
      { value: "tech", label: { ar: "تقني وحماية بيانات", en: "Tech & data protection" } },
    ] },
    { step: 2, name: "risk_appetite", type: "select", label: { ar: "درجة التحفّظ", en: "Tone of advice" }, options: [
      { value: "conservative", label: { ar: "متحفّظ", en: "Conservative" } },
      { value: "balanced", label: { ar: "متوازن", en: "Balanced" } },
      { value: "assertive", label: { ar: "هجومي", en: "Assertive" } },
    ] },
    { step: 2, name: "include_steps", type: "select", label: { ar: "تضمين خطة عمل", en: "Include an action plan" }, options: YES_NO },
  ],
  outline: [
    { ar: "١. ملخص تنفيذي (الخلاصة أولاً)", en: "1. Executive summary (bottom line first)" },
    { ar: "٢. الوقائع كما وردت", en: "2. Facts as presented" },
    { ar: "٣. الإطار القانوني الأردني المنطبق (نص المواد)", en: "3. Applicable Jordanian legal framework (cite articles)" },
    { ar: "٤. التحليل وتطبيق النص على الوقائع", en: "4. Analysis — applying the law to the facts" },
    { ar: "٥. المخاطر والاحتمالات المضادة", en: "5. Risks and counter-arguments" },
    { ar: "٦. التوصية وخطة العمل", en: "6. Recommendation and action plan" },
    { ar: "٧. المصادر", en: "7. Sources" },
  ],
};

/* --------------------------- 2. لائحة دعوى --------------------------- */
const claim: Workflow = {
  kind: "claim",
  label: { ar: "لائحة دعوى", en: "Statement of claim" },
  blurb: { ar: "معالج خطوة بخطوة ينتج لائحة دعوى مطابقة لأصول المرافعات المدنية الأردنية.", en: "A step-by-step wizard producing a claim compliant with Jordanian civil procedure." },
  icon: "gavel",
  steps: [
    { ar: "المحكمة", en: "Court" },
    { ar: "الخصوم", en: "Parties" },
    { ar: "الوقائع والأسانيد", en: "Facts & grounds" },
    { ar: "الطلبات", en: "Reliefs" },
  ],
  fields: [
    { step: 0, name: "court_name", type: "text", required: true, label: { ar: "المحكمة", en: "Court" }, placeholder: { ar: "محكمة بداية حقوق عمّان", en: "Amman Court of First Instance" } },
    { step: 0, name: "case_number", type: "text", label: { ar: "رقم الدعوى (إن وجد)", en: "Case number (if any)" } },
    { step: 0, name: "claim_value", type: "money", label: { ar: "قيمة المطالبة (د.أ)", en: "Claim value (JOD)" }, help: { ar: "تُحتسب عليها الرسوم القضائية.", en: "Court fees are assessed on this value." } },
    { step: 1, name: "plaintiff", type: "textarea", required: true, label: { ar: "المدّعي", en: "Plaintiff" }, placeholder: { ar: "الاسم الرباعي، الرقم الوطني، العنوان", en: "Full name, national ID, address" } },
    { step: 1, name: "defendant", type: "textarea", required: true, label: { ar: "المدّعى عليه", en: "Defendant" }, placeholder: { ar: "الاسم الرباعي/اسم الشركة، العنوان للتبليغ", en: "Full name / company, service address" } },
    { step: 1, name: "attorney", type: "text", label: { ar: "وكيل المدّعي", en: "Plaintiff's attorney" } },
    { step: 2, name: "facts", type: "textarea", required: true, label: { ar: "الوقائع", en: "Facts" }, help: { ar: "بالترتيب الزمني — ستُرقَّم تلقائياً كبنود.", en: "Chronological — will be auto-numbered into paragraphs." } },
    { step: 2, name: "legal_basis", type: "textarea", label: { ar: "الأسانيد القانونية", en: "Legal grounds" }, placeholder: { ar: "مواد القانون المدني / قانون العمل …", en: "Civil Code / Labour Law articles…" } },
    { step: 2, name: "evidence", type: "textarea", label: { ar: "البيّنات", en: "Evidence" }, placeholder: { ar: "بيّنة خطية، شهود، خبرة …", en: "Documents, witnesses, expert evidence…" } },
    { step: 3, name: "reliefs", type: "textarea", required: true, label: { ar: "الطلبات", en: "Reliefs sought" }, placeholder: { ar: "طلب في كل سطر", en: "One relief per line" } },
    { step: 3, name: "interim", type: "select", label: { ar: "طلب حجز تحفظي", en: "Request precautionary attachment" }, options: YES_NO },
    { step: 3, name: "fees_costs", type: "select", label: { ar: "المطالبة بالرسوم والأتعاب", en: "Claim fees and attorney costs" }, options: YES_NO },
  ],
  outline: [
    { ar: "ترويسة المحكمة ورقم الدعوى", en: "Court heading and case number" },
    { ar: "بيان الخصوم (المدّعي / المدّعى عليه)", en: "Parties (plaintiff / defendant)" },
    { ar: "موضوع الدعوى وقيمتها", en: "Subject and value of the claim" },
    { ar: "الوقائع — بنود مرقّمة", en: "Facts — numbered paragraphs" },
    { ar: "الأسانيد القانونية مع الإحالة للمواد", en: "Legal grounds with article citations" },
    { ar: "البيّنات", en: "Evidence" },
    { ar: "الطلبات الختامية", en: "Prayer for relief" },
    { ar: "التوقيع والتاريخ", en: "Signature and date" },
  ],
};

/* -------------------------- 3. لائحة جوابية -------------------------- */
const reply: Workflow = {
  kind: "reply",
  label: { ar: "لائحة جوابية", en: "Statement of defence" },
  blurb: { ar: "ردّ مُنظَّم على لائحة الدعوى مع الدفوع الشكلية والموضوعية.", en: "A structured reply with procedural and substantive defences." },
  icon: "shield",
  steps: [
    { ar: "الدعوى المردود عليها", en: "Claim being answered" },
    { ar: "الدفوع", en: "Defences" },
    { ar: "الطلبات", en: "Reliefs" },
  ],
  fields: [
    { step: 0, name: "court_name", type: "text", required: true, label: { ar: "المحكمة", en: "Court" } },
    { step: 0, name: "case_number", type: "text", required: true, label: { ar: "رقم الدعوى", en: "Case number" } },
    { step: 0, name: "respondent", type: "textarea", required: true, label: { ar: "المدّعى عليه (موكلنا)", en: "Defendant (our client)" } },
    { step: 0, name: "claim_summary", type: "textarea", required: true, label: { ar: "ملخص ادعاءات الخصم", en: "Summary of the claimant's allegations" } },
    { step: 1, name: "formal_defences", type: "multiselect", label: { ar: "الدفوع الشكلية", en: "Procedural defences" }, options: [
      { value: "jurisdiction", label: { ar: "عدم الاختصاص", en: "Lack of jurisdiction" } },
      { value: "capacity", label: { ar: "انعدام الصفة أو الأهلية", en: "No standing / capacity" } },
      { value: "limitation", label: { ar: "مرور الزمن (التقادم)", en: "Limitation / prescription" } },
      { value: "res_judicata", label: { ar: "سبق الفصل", en: "Res judicata" } },
      { value: "service", label: { ar: "بطلان التبليغ", en: "Defective service" } },
      { value: "arbitration_clause", label: { ar: "وجود شرط تحكيم", en: "Arbitration clause" } },
      { value: "non_joinder", label: { ar: "عدم إدخال خصم لازم", en: "Non-joinder of a necessary party" } },
    ] },
    { step: 1, name: "substantive", type: "textarea", required: true, label: { ar: "الدفاع الموضوعي", en: "Substantive defence" }, help: { ar: "أنكِر أو فسّر كل واقعة على حدة.", en: "Deny or explain each alleged fact." } },
    { step: 1, name: "evidence", type: "textarea", label: { ar: "بيّنات الدفاع", en: "Defence evidence" } },
    { step: 2, name: "counterclaim", type: "textarea", label: { ar: "الدعوى المتقابلة (اختياري)", en: "Counterclaim (optional)" } },
    { step: 2, name: "reliefs", type: "textarea", required: true, label: { ar: "الطلبات", en: "Reliefs sought" }, placeholder: { ar: "ردّ الدعوى وتضمين المدّعي الرسوم والأتعاب", en: "Dismiss the claim and charge the claimant fees and costs" } },
  ],
  outline: [
    { ar: "ترويسة المحكمة ورقم الدعوى", en: "Court heading and case number" },
    { ar: "أولاً: الدفوع الشكلية", en: "First: procedural defences" },
    { ar: "ثانياً: الردّ على الوقائع بنداً بنداً", en: "Second: paragraph-by-paragraph reply to the facts" },
    { ar: "ثالثاً: الدفاع الموضوعي والأسانيد", en: "Third: substantive defence and legal grounds" },
    { ar: "رابعاً: البيّنات", en: "Fourth: evidence" },
    { ar: "خامساً: الدعوى المتقابلة (إن وجدت)", en: "Fifth: counterclaim (if any)" },
    { ar: "الطلبات الختامية والتوقيع", en: "Prayer for relief and signature" },
  ],
};

/* ------------------------------ 4. عقد ------------------------------- */
const contract: Workflow = {
  kind: "contract",
  label: { ar: "عقد", en: "Contract" },
  blurb: { ar: "عقد كامل البنود وفق القانون المدني الأردني رقم ٤٣ لسنة ١٩٧٦.", en: "A fully-clause contract under Jordanian Civil Code 43/1976." },
  icon: "handshake",
  steps: [
    { ar: "نوع العقد", en: "Contract type" },
    { ar: "الأطراف", en: "Parties" },
    { ar: "الشروط التجارية", en: "Commercial terms" },
    { ar: "البنود القانونية", en: "Legal clauses" },
  ],
  fields: [
    { step: 0, name: "contract_type", type: "select", required: true, label: { ar: "نوع العقد", en: "Contract type" }, options: [
      { value: "employment", label: { ar: "عقد عمل", en: "Employment" } },
      { value: "services", label: { ar: "عقد تقديم خدمات", en: "Services" } },
      { value: "lease", label: { ar: "عقد إيجار", en: "Lease" } },
      { value: "sale", label: { ar: "عقد بيع", en: "Sale" } },
      { value: "nda", label: { ar: "اتفاقية سرية", en: "NDA" } },
      { value: "partnership", label: { ar: "عقد شراكة", en: "Partnership" } },
      { value: "agency", label: { ar: "عقد وكالة تجارية", en: "Commercial agency" } },
      { value: "settlement", label: { ar: "اتفاقية صلح", en: "Settlement agreement" } },
      { value: "retainer", label: { ar: "اتفاقية أتعاب محاماة", en: "Legal retainer" } },
      { value: "construction", label: { ar: "عقد مقاولة", en: "Construction / works" } },
    ] },
    { step: 0, name: "title", type: "text", label: { ar: "عنوان العقد", en: "Contract title" } },
    { step: 1, name: "party_a", type: "textarea", required: true, label: { ar: "الطرف الأول", en: "Party A" }, placeholder: { ar: "الاسم، الرقم الوطني/الرقم الوطني للمنشأة، العنوان", en: "Name, national ID / company no., address" } },
    { step: 1, name: "party_b", type: "textarea", required: true, label: { ar: "الطرف الثاني", en: "Party B" } },
    { step: 2, name: "subject", type: "textarea", required: true, label: { ar: "محل العقد", en: "Subject matter" } },
    { step: 2, name: "consideration", type: "money", label: { ar: "البدل (د.أ)", en: "Consideration (JOD)" } },
    { step: 2, name: "payment_terms", type: "textarea", label: { ar: "شروط الدفع", en: "Payment terms" } },
    { step: 2, name: "start_date", type: "date", label: { ar: "تاريخ النفاذ", en: "Start date" } },
    { step: 2, name: "duration", type: "text", label: { ar: "المدة", en: "Duration" } },
    { step: 3, name: "clauses", type: "multiselect", label: { ar: "بنود إضافية", en: "Additional clauses" }, options: [
      { value: "confidentiality", label: { ar: "السرية", en: "Confidentiality" } },
      { value: "non_compete", label: { ar: "عدم المنافسة", en: "Non-compete" } },
      { value: "ip", label: { ar: "الملكية الفكرية", en: "Intellectual property" } },
      { value: "penalty", label: { ar: "الشرط الجزائي", en: "Penalty clause" } },
      { value: "force_majeure", label: { ar: "القوة القاهرة", en: "Force majeure" } },
      { value: "termination", label: { ar: "الإنهاء والفسخ", en: "Termination" } },
      { value: "data_protection", label: { ar: "حماية البيانات (قانون ٢٤/٢٠٢٣)", en: "Data protection (PDPL 24/2023)" } },
      { value: "notices", label: { ar: "التبليغات والعناوين", en: "Notices" } },
      { value: "assignment", label: { ar: "التنازل عن العقد", en: "Assignment" } },
    ] },
    { step: 3, name: "dispute_forum", type: "select", label: { ar: "تسوية النزاعات", en: "Dispute resolution" }, options: [
      { value: "amman_courts", label: { ar: "محاكم عمّان", en: "Amman courts" } },
      { value: "arbitration", label: { ar: "التحكيم (قانون ٣١/٢٠٠١)", en: "Arbitration (Law 31/2001)" } },
      { value: "mediation_then_courts", label: { ar: "وساطة ثم القضاء", en: "Mediation then courts" } },
    ] },
    { step: 3, name: "copies", type: "select", label: { ar: "عدد النسخ", en: "Number of copies" }, options: [
      { value: "2", label: { ar: "نسختان", en: "Two" } },
      { value: "3", label: { ar: "ثلاث نسخ", en: "Three" } },
      { value: "4", label: { ar: "أربع نسخ", en: "Four" } },
    ] },
  ],
  outline: [
    { ar: "العنوان وتاريخ التحرير ومكانه", en: "Title, date and place of execution" },
    { ar: "بيان الأطراف وصفاتهم وعناوينهم", en: "Parties, capacities and addresses" },
    { ar: "التمهيد (حيثيات التعاقد)", en: "Recitals" },
    { ar: "البند الأول: التمهيد جزء لا يتجزأ", en: "Clause 1: recitals form an integral part" },
    { ar: "بنود محل العقد والبدل والمدة", en: "Subject, consideration and term clauses" },
    { ar: "الالتزامات المتبادلة", en: "Mutual obligations" },
    { ar: "البنود الإضافية المختارة", en: "Selected additional clauses" },
    { ar: "القانون الواجب التطبيق وتسوية النزاعات", en: "Governing law and dispute resolution" },
    { ar: "النسخ والتواقيع", en: "Copies and signatures" },
  ],
};

/* ------------------------------ 5. وكالة ----------------------------- */
const poa: Workflow = {
  kind: "poa",
  label: { ar: "وكالة", en: "Power of attorney" },
  blurb: { ar: "وكالة خصومة أو عامة بصيغة معتمدة لدى الكاتب العدل الأردني.", en: "Litigation or general PoA in a form accepted by the Jordanian notary public." },
  icon: "stamp",
  steps: [
    { ar: "الموكِّل", en: "Principal" },
    { ar: "الوكيل", en: "Attorney" },
    { ar: "نطاق الوكالة", en: "Scope" },
  ],
  fields: [
    { step: 0, name: "principal_name", type: "text", required: true, label: { ar: "اسم الموكِّل", en: "Principal's name" } },
    { step: 0, name: "principal_id", type: "text", label: { ar: "الرقم الوطني / رقم جواز السفر", en: "National ID / passport no." } },
    { step: 0, name: "principal_address", type: "text", label: { ar: "عنوان الموكِّل", en: "Principal's address" } },
    { step: 0, name: "principal_type", type: "select", label: { ar: "صفة الموكِّل", en: "Principal type" }, options: [
      { value: "individual", label: { ar: "شخص طبيعي", en: "Individual" } },
      { value: "company", label: { ar: "شخص اعتباري (شركة)", en: "Legal entity (company)" } },
    ] },
    { step: 1, name: "attorney_name", type: "text", required: true, label: { ar: "اسم الوكيل (المحامي)", en: "Attorney's name" } },
    { step: 1, name: "attorney_bar_no", type: "text", label: { ar: "رقم نقابة المحامين", en: "Bar registration no." } },
    { step: 1, name: "attorney_firm", type: "text", label: { ar: "اسم المكتب", en: "Firm name" } },
    { step: 2, name: "scope", type: "select", required: true, label: { ar: "نوع الوكالة", en: "PoA type" }, options: [] /* filled from POA_SCOPES at runtime */ },
    { step: 2, name: "powers", type: "multiselect", label: { ar: "الصلاحيات الممنوحة", en: "Powers granted" }, options: [] /* filled from POA_POWERS */ },
    { step: 2, name: "subject_matter", type: "textarea", label: { ar: "موضوع الوكالة", en: "Matter covered" }, placeholder: { ar: "الدعوى رقم … / بيع القطعة رقم …", en: "Case no. … / sale of plot no. …" } },
    { step: 2, name: "expiry", type: "date", label: { ar: "تاريخ انتهاء الوكالة (اختياري)", en: "Expiry date (optional)" } },
    { step: 2, name: "notary", type: "text", label: { ar: "الكاتب العدل / السفارة", en: "Notary public / embassy" } },
  ],
  outline: [
    { ar: "عنوان: وكالة (نوعها)", en: "Title: Power of attorney (type)" },
    { ar: "بيانات الموكِّل الكاملة", en: "Full particulars of the principal" },
    { ar: "بيانات الوكيل ورقم نقابته", en: "Attorney's particulars and bar number" },
    { ar: "صيغة التوكيل ونطاقه", en: "Appointment wording and scope" },
    { ar: "تعداد الصلاحيات الممنوحة", en: "Enumeration of powers granted" },
    { ar: "حدود الوكالة ومدتها", en: "Limits and duration" },
    { ar: "مكان التصديق والتوقيع", en: "Attestation, place and signature" },
  ],
};

/* -------------------------- 6. مكتبة النماذج -------------------------- */
const library: Workflow = {
  kind: "library",
  label: { ar: "مكتبة النماذج", en: "Template library" },
  blurb: { ar: "نماذج أردنية جاهزة — ابدأ من نموذج ثم عدّله.", en: "Ready Jordanian templates — start from one and edit." },
  icon: "library",
  steps: [{ ar: "اختر نموذجاً", en: "Pick a template" }],
  fields: [],
  outline: [],
};

export const WORKFLOWS: Workflow[] = [opinion, claim, reply, contract, poa, library];
export function getWorkflow(kind: WorkflowKind) {
  return WORKFLOWS.find((w) => w.kind === kind)!;
}

/* ------------------------------------------------------------------ */
/*  Built-in Jordanian template library                                */
/* ------------------------------------------------------------------ */

export type LibraryTemplate = {
  id: string;
  category: Bi;
  title: Bi;
  summary: Bi;
  /** Pre-filled workflow + field values used to seed a guided draft. */
  seed: { kind: WorkflowKind; values: Record<string, string> };
};

export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  {
    id: "claim_debt",
    category: { ar: "لوائح دعوى", en: "Claims" },
    title: { ar: "دعوى مطالبة بدين (كمبيالة/سند)", en: "Debt claim (promissory note)" },
    summary: { ar: "مطالبة بقيمة سند دين مع الفائدة القانونية والرسوم.", en: "Claim on a debt instrument with legal interest, fees and costs." },
    seed: { kind: "claim", values: { court_name: "محكمة بداية حقوق عمّان", legal_basis: "القانون المدني الأردني رقم 43/1976 (المواد 202، 361)، قانون أصول المحاكمات المدنية رقم 24/1988", reliefs: "إلزام المدّعى عليه بأداء قيمة السند\nالفائدة القانونية من تاريخ الاستحقاق\nالرسوم والمصاريف وأتعاب المحاماة", fees_costs: "yes" } },
  },
  {
    id: "claim_dismissal",
    category: { ar: "لوائح دعوى", en: "Claims" },
    title: { ar: "دعوى فصل تعسفي ومستحقات عمالية", en: "Unfair dismissal & labour entitlements" },
    summary: { ar: "تعويض الفصل التعسفي، بدل الإشعار، مكافأة نهاية الخدمة، الإجازات.", en: "Dismissal compensation, notice in lieu, end-of-service, accrued leave." },
    seed: { kind: "claim", values: { court_name: "محكمة صلح عمّان (عمالية)", legal_basis: "قانون العمل الأردني رقم 8/1996 وتعديلاته (المواد 25، 28، 32، 33)، قانون الضمان الاجتماعي رقم 1/2014", reliefs: "تعويض الفصل التعسفي\nبدل الإشعار\nمكافأة نهاية الخدمة\nبدل الإجازات السنوية غير المستعملة\nالرسوم والأتعاب" } },
  },
  {
    id: "claim_eviction",
    category: { ar: "لوائح دعوى", en: "Claims" },
    title: { ar: "دعوى إخلاء مأجور", en: "Eviction of leased premises" },
    summary: { ar: "إخلاء لعدم دفع الأجرة أو لانتهاء المدة وفق قانون المالكين والمستأجرين.", en: "Eviction for non-payment or expiry under the Landlords & Tenants Law." },
    seed: { kind: "claim", values: { court_name: "محكمة صلح حقوق عمّان", legal_basis: "قانون المالكين والمستأجرين، القانون المدني الأردني رقم 43/1976", reliefs: "إخلاء المأجور وتسليمه خالياً من الشواغل\nالأجور المتراكمة والمثل حتى الإخلاء\nالرسوم والأتعاب" } },
  },
  {
    id: "reply_limitation",
    category: { ar: "لوائح جوابية", en: "Defences" },
    title: { ar: "لائحة جوابية بدفع التقادم", en: "Defence pleading limitation" },
    summary: { ar: "دفع شكلي بمرور الزمن مع ردّ موضوعي احتياطي.", en: "Procedural limitation defence with an alternative substantive reply." },
    seed: { kind: "reply", values: { formal_defences: "limitation,jurisdiction", reliefs: "ردّ الدعوى شكلاً لمرور الزمن\nوبالنتيجة ردّها موضوعاً\nتضمين المدّعي الرسوم والمصاريف وأتعاب المحاماة" } },
  },
  {
    id: "reply_jurisdiction",
    category: { ar: "لوائح جوابية", en: "Defences" },
    title: { ar: "لائحة جوابية بعدم الاختصاص وشرط التحكيم", en: "Defence: jurisdiction & arbitration clause" },
    summary: { ar: "دفع بعدم اختصاص المحكمة لوجود شرط تحكيم في العقد.", en: "Court lacks jurisdiction because the contract contains an arbitration clause." },
    seed: { kind: "reply", values: { formal_defences: "jurisdiction,arbitration_clause", reliefs: "ردّ الدعوى لعدم الاختصاص\nإحالة النزاع إلى التحكيم\nالرسوم والأتعاب" } },
  },
  {
    id: "contract_employment",
    category: { ar: "عقود", en: "Contracts" },
    title: { ar: "عقد عمل غير محدد المدة", en: "Open-ended employment contract" },
    summary: { ar: "مطابق لقانون العمل الأردني مع بنود السرية وعدم المنافسة.", en: "Compliant with the Jordanian Labour Law, with confidentiality and non-compete." },
    seed: { kind: "contract", values: { contract_type: "employment", clauses: "confidentiality,non_compete,ip,termination,data_protection", dispute_forum: "amman_courts", copies: "3" } },
  },
  {
    id: "contract_lease",
    category: { ar: "عقود", en: "Contracts" },
    title: { ar: "عقد إيجار عقار", en: "Property lease agreement" },
    summary: { ar: "عقد إيجار سنوي قابل للتجديد مع شرط جزائي.", en: "Renewable annual lease with a penalty clause." },
    seed: { kind: "contract", values: { contract_type: "lease", clauses: "penalty,termination,notices", dispute_forum: "amman_courts", copies: "3" } },
  },
  {
    id: "contract_nda",
    category: { ar: "عقود", en: "Contracts" },
    title: { ar: "اتفاقية سرية متبادلة", en: "Mutual non-disclosure agreement" },
    summary: { ar: "حماية المعلومات السرية مع الالتزام بقانون حماية البيانات ٢٤/٢٠٢٣.", en: "Protects confidential information; aligned with PDPL 24/2023." },
    seed: { kind: "contract", values: { contract_type: "nda", clauses: "confidentiality,ip,data_protection,penalty", dispute_forum: "arbitration", copies: "2" } },
  },
  {
    id: "contract_retainer",
    category: { ar: "عقود", en: "Contracts" },
    title: { ar: "اتفاقية أتعاب محاماة", en: "Legal retainer agreement" },
    summary: { ar: "أتعاب وفق الحد الأدنى النقابي مع دفعة مقدمة ومراحل.", en: "Fees at JBA minimums with a retainer and staged payments." },
    seed: { kind: "contract", values: { contract_type: "retainer", clauses: "confidentiality, termination, notices".replace(/\s/g, ""), dispute_forum: "amman_courts", copies: "2" } },
  },
  {
    id: "poa_litigation",
    category: { ar: "وكالات", en: "Powers of attorney" },
    title: { ar: "وكالة خصومة عامة", en: "General litigation power of attorney" },
    summary: { ar: "تمثيل أمام جميع درجات المحاكم مع حق التوكيل والصلح.", en: "Representation at all court levels, with substitution and settlement rights." },
    seed: { kind: "poa", values: { scope: "litigation", powers: "file_claims,plead,settle,appoint_substitute,receive_funds" } },
  },
  {
    id: "poa_execution",
    category: { ar: "وكالات", en: "Powers of attorney" },
    title: { ar: "وكالة تنفيذ وتحصيل", en: "Execution & collection PoA" },
    summary: { ar: "متابعة التنفيذ والحجز ومنع السفر وقبض المبالغ.", en: "Execution, attachment, travel bans and receipt of funds." },
    seed: { kind: "poa", values: { scope: "execution", powers: "execution_steps,receive_funds,settle,appoint_substitute" } },
  },
  {
    id: "opinion_termination",
    category: { ar: "استشارات", en: "Opinions" },
    title: { ar: "رأي قانوني في إنهاء عقد عمل", en: "Opinion on terminating employment" },
    summary: { ar: "تحليل المادة ٢٨ و٣١ من قانون العمل ومخاطر الفصل التعسفي.", en: "Analysis of Labour Law arts. 28 & 31 and unfair-dismissal exposure." },
    seed: { kind: "opinion", values: { area: "labour", risk_appetite: "conservative", include_steps: "yes", questions: "هل يجوز إنهاء العقد دون إشعار؟\nما التعويض المتوقع في حال اعتُبر الفصل تعسفياً؟" } },
  },
];

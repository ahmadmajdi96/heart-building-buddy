/**
 * Jordanian legal taxonomy + fee calculators.
 *
 * Pure data/logic module — safe to import from client and server.
 * Figures follow the published Jordanian court-fee schedule (Law of Fees for
 * Courts) and the Jordan Bar Association (JBA) minimum-fee guidance. They are
 * indicative helpers for quoting, NOT an official assessment.
 */

export type Bi = { ar: string; en: string };

/* ------------------------------------------------------------------ */
/*  Court taxonomy                                                     */
/* ------------------------------------------------------------------ */

export type CourtBranch =
  | "civil"
  | "criminal"
  | "sharia"
  | "administrative"
  | "labour"
  | "execution"
  | "customs_tax"
  | "arbitration";

export const COURT_BRANCHES: { value: CourtBranch; label: Bi }[] = [
  { value: "civil", label: { ar: "القضاء النظامي — مدني", en: "Regular courts — Civil" } },
  { value: "criminal", label: { ar: "القضاء النظامي — جزائي", en: "Regular courts — Criminal" } },
  { value: "sharia", label: { ar: "المحاكم الشرعية", en: "Sharia courts" } },
  { value: "administrative", label: { ar: "القضاء الإداري", en: "Administrative judiciary" } },
  { value: "labour", label: { ar: "قضايا العمل", en: "Labour matters" } },
  { value: "execution", label: { ar: "دائرة التنفيذ", en: "Execution department" } },
  { value: "customs_tax", label: { ar: "الجمارك والضريبة", en: "Customs & tax" } },
  { value: "arbitration", label: { ar: "التحكيم", en: "Arbitration" } },
];

export type CourtLevel = { value: string; label: Bi; branch: CourtBranch };

/** Court levels/instances actually used in the Hashemite Kingdom of Jordan. */
export const COURT_LEVELS: CourtLevel[] = [
  // Civil
  { value: "conciliation", branch: "civil", label: { ar: "محكمة الصلح", en: "Conciliation Court" } },
  { value: "first_instance", branch: "civil", label: { ar: "محكمة البداية", en: "Court of First Instance" } },
  { value: "appeal", branch: "civil", label: { ar: "محكمة الاستئناف", en: "Court of Appeal" } },
  { value: "cassation", branch: "civil", label: { ar: "محكمة التمييز", en: "Court of Cassation" } },
  // Criminal
  { value: "magistrate_penal", branch: "criminal", label: { ar: "محكمة صلح جزاء", en: "Magistrate Penal Court" } },
  { value: "first_instance_penal", branch: "criminal", label: { ar: "محكمة بداية جزاء", en: "First Instance Penal Court" } },
  { value: "major_felonies", branch: "criminal", label: { ar: "محكمة الجنايات الكبرى", en: "Major Felonies Court" } },
  { value: "state_security", branch: "criminal", label: { ar: "محكمة أمن الدولة", en: "State Security Court" } },
  { value: "penal_appeal", branch: "criminal", label: { ar: "استئناف جزاء", en: "Penal Court of Appeal" } },
  { value: "penal_cassation", branch: "criminal", label: { ar: "تمييز جزاء", en: "Penal Cassation" } },
  // Sharia
  { value: "sharia_first", branch: "sharia", label: { ar: "المحكمة الشرعية الابتدائية", en: "Sharia Court of First Instance" } },
  { value: "sharia_appeal", branch: "sharia", label: { ar: "محكمة الاستئناف الشرعية", en: "Sharia Court of Appeal" } },
  // Administrative
  { value: "admin_court", branch: "administrative", label: { ar: "المحكمة الإدارية", en: "Administrative Court" } },
  { value: "high_admin_court", branch: "administrative", label: { ar: "المحكمة الإدارية العليا", en: "High Administrative Court" } },
  // Labour
  { value: "labour_conciliation", branch: "labour", label: { ar: "محكمة صلح (عمالية)", en: "Conciliation Court (labour)" } },
  { value: "labour_first_instance", branch: "labour", label: { ar: "محكمة بداية (عمالية)", en: "First Instance (labour)" } },
  // Execution
  { value: "execution_dept", branch: "execution", label: { ar: "دائرة التنفيذ", en: "Execution Department" } },
  // Customs & tax
  { value: "customs_court", branch: "customs_tax", label: { ar: "محكمة الجمارك", en: "Customs Court" } },
  { value: "tax_court", branch: "customs_tax", label: { ar: "محكمة قضايا ضريبة الدخل والمبيعات", en: "Income & Sales Tax Court" } },
  // Arbitration
  { value: "arbitration_panel", branch: "arbitration", label: { ar: "هيئة تحكيم", en: "Arbitral tribunal" } },
];

/** Governorates — used for the court venue field. */
export const JO_GOVERNORATES: Bi[] = [
  { ar: "عمّان", en: "Amman" },
  { ar: "الزرقاء", en: "Zarqa" },
  { ar: "إربد", en: "Irbid" },
  { ar: "البلقاء (السلط)", en: "Balqa (Salt)" },
  { ar: "المفرق", en: "Mafraq" },
  { ar: "جرش", en: "Jerash" },
  { ar: "عجلون", en: "Ajloun" },
  { ar: "مادبا", en: "Madaba" },
  { ar: "الكرك", en: "Karak" },
  { ar: "الطفيلة", en: "Tafilah" },
  { ar: "معان", en: "Ma'an" },
  { ar: "العقبة", en: "Aqaba" },
];

export type CaseTypeDef = { value: string; label: Bi; branch: CourtBranch; monetary: boolean };

/** Case (subject-matter) taxonomy per branch. */
export const CASE_TYPES: CaseTypeDef[] = [
  { value: "debt_claim", branch: "civil", monetary: true, label: { ar: "مطالبة بدين", en: "Debt claim" } },
  { value: "contract_dispute", branch: "civil", monetary: true, label: { ar: "نزاع عقدي", en: "Contract dispute" } },
  { value: "compensation", branch: "civil", monetary: true, label: { ar: "دعوى تعويض", en: "Compensation claim" } },
  { value: "real_estate", branch: "civil", monetary: true, label: { ar: "دعوى عقارية", en: "Real-estate claim" } },
  { value: "tenancy", branch: "civil", monetary: false, label: { ar: "دعوى إخلاء مأجور", en: "Tenancy / eviction" } },
  { value: "company_dispute", branch: "civil", monetary: true, label: { ar: "نزاع شركات", en: "Company dispute" } },
  { value: "insolvency", branch: "civil", monetary: true, label: { ar: "إعسار / تصفية", en: "Insolvency / liquidation" } },
  { value: "cheque_criminal", branch: "criminal", monetary: true, label: { ar: "شيك بدون رصيد", en: "Dishonoured cheque" } },
  { value: "misdemeanour", branch: "criminal", monetary: false, label: { ar: "جنحة", en: "Misdemeanour" } },
  { value: "felony", branch: "criminal", monetary: false, label: { ar: "جناية", en: "Felony" } },
  { value: "cybercrime", branch: "criminal", monetary: false, label: { ar: "جرائم إلكترونية", en: "Cybercrime" } },
  { value: "divorce", branch: "sharia", monetary: false, label: { ar: "تفريق / طلاق", en: "Divorce / separation" } },
  { value: "alimony", branch: "sharia", monetary: true, label: { ar: "نفقة", en: "Alimony / maintenance" } },
  { value: "custody", branch: "sharia", monetary: false, label: { ar: "حضانة", en: "Custody" } },
  { value: "inheritance", branch: "sharia", monetary: true, label: { ar: "إرث / حصر إرث", en: "Inheritance" } },
  { value: "admin_annulment", branch: "administrative", monetary: false, label: { ar: "دعوى إلغاء قرار إداري", en: "Annulment of administrative decision" } },
  { value: "admin_compensation", branch: "administrative", monetary: true, label: { ar: "تعويض إداري", en: "Administrative compensation" } },
  { value: "unfair_dismissal", branch: "labour", monetary: true, label: { ar: "فصل تعسفي", en: "Unfair dismissal" } },
  { value: "end_of_service", branch: "labour", monetary: true, label: { ar: "مستحقات نهاية الخدمة", en: "End-of-service entitlements" } },
  { value: "work_injury", branch: "labour", monetary: true, label: { ar: "إصابة عمل", en: "Work injury" } },
  { value: "execution_judgment", branch: "execution", monetary: true, label: { ar: "تنفيذ حكم", en: "Execution of judgment" } },
  { value: "execution_bond", branch: "execution", monetary: true, label: { ar: "تنفيذ سند", en: "Execution of a bond/instrument" } },
  { value: "customs_objection", branch: "customs_tax", monetary: true, label: { ar: "اعتراض جمركي", en: "Customs objection" } },
  { value: "tax_appeal", branch: "customs_tax", monetary: true, label: { ar: "اعتراض ضريبي", en: "Tax appeal" } },
  { value: "arbitration_claim", branch: "arbitration", monetary: true, label: { ar: "دعوى تحكيم", en: "Arbitration claim" } },
];

export function courtLevelsFor(branch: CourtBranch) {
  return COURT_LEVELS.filter((c) => c.branch === branch);
}
export function caseTypesFor(branch: CourtBranch) {
  return CASE_TYPES.filter((c) => c.branch === branch);
}
export function bi(v: Bi | undefined, locale: "ar" | "en") {
  return v ? v[locale] : "";
}

/** Human court name, e.g. "محكمة بداية عمّان" / "Amman Court of First Instance". */
export function composeCourtName(levelValue: string, governorate: string, locale: "ar" | "en") {
  const level = COURT_LEVELS.find((c) => c.value === levelValue);
  if (!level) return governorate;
  const l = level.label[locale];
  if (!governorate) return l;
  return locale === "ar" ? `${l} — ${governorate}` : `${governorate} ${l}`;
}

/* ------------------------------------------------------------------ */
/*  Court fee + JBA fee calculator                                     */
/* ------------------------------------------------------------------ */

export type FeeBreakdownLine = { label: Bi; amount: number; note?: Bi };
export type FeeEstimate = {
  claimValue: number;
  courtFee: number;
  jbaShare: number;
  stamps: number;
  serviceFees: number;
  attorneyFee: number;
  totalUpfront: number;
  lines: FeeBreakdownLine[];
  disclaimer: Bi;
};

/**
 * Jordanian court fee: 3% of the claim value for monetary civil claims, with
 * a floor and a statutory cap. Non-monetary / status claims carry a fixed fee.
 */
const COURT_FEE_RATE = 0.03;
const COURT_FEE_MIN = 5;
const COURT_FEE_CAP = 15_000;
/** Fixed lump-sum fee for non-monetary claims, by court level. */
const FIXED_FEES: Record<string, number> = {
  conciliation: 15,
  first_instance: 30,
  appeal: 50,
  cassation: 75,
  sharia_first: 10,
  sharia_appeal: 20,
  admin_court: 50,
  high_admin_court: 100,
  execution_dept: 10,
};
/** Bar-association solidarity/stamp share added on top of the court fee. */
const JBA_SHARE_RATE = 0.005;
/** Revenue + court-service stamps (طوابع واردات + رسوم خدمات). */
const STAMPS = 5;
const SERVICE_FEES = 10;

/**
 * JBA minimum attorney-fee guidance for monetary claims: a sliding percentage
 * of the claim value with a per-instance minimum.
 */
const JBA_TIERS: { upTo: number; rate: number }[] = [
  { upTo: 5_000, rate: 0.1 },
  { upTo: 20_000, rate: 0.07 },
  { upTo: 100_000, rate: 0.05 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.03 },
];
const JBA_MIN_BY_LEVEL: Record<string, number> = {
  conciliation: 150,
  first_instance: 300,
  appeal: 400,
  cassation: 600,
  magistrate_penal: 200,
  first_instance_penal: 400,
  major_felonies: 1_000,
  state_security: 1_000,
  sharia_first: 200,
  sharia_appeal: 300,
  admin_court: 500,
  high_admin_court: 750,
  execution_dept: 150,
  arbitration_panel: 1_000,
};

export function jbaAttorneyFee(claimValue: number, level: string) {
  const min = JBA_MIN_BY_LEVEL[level] ?? 250;
  if (!claimValue || claimValue <= 0) return min;
  let remaining = claimValue;
  let prev = 0;
  let fee = 0;
  for (const t of JBA_TIERS) {
    const slice = Math.max(0, Math.min(remaining, t.upTo - prev));
    fee += slice * t.rate;
    remaining -= slice;
    prev = t.upTo;
    if (remaining <= 0) break;
  }
  return Math.max(min, Math.round(fee));
}

export function estimateFees(opts: {
  claimValue: number;
  level: string;
  monetary: boolean;
  includeAttorney?: boolean;
}): FeeEstimate {
  const { claimValue, level, monetary, includeAttorney = true } = opts;
  const courtFee = monetary
    ? Math.min(COURT_FEE_CAP, Math.max(COURT_FEE_MIN, Math.round(claimValue * COURT_FEE_RATE * 100) / 100))
    : FIXED_FEES[level] ?? 25;
  const jbaShare = Math.round(courtFee * JBA_SHARE_RATE * 100) / 100;
  const attorneyFee = includeAttorney ? jbaAttorneyFee(monetary ? claimValue : 0, level) : 0;
  const lines: FeeBreakdownLine[] = [
    {
      label: { ar: "الرسوم القضائية", en: "Court fee" },
      amount: courtFee,
      note: monetary
        ? { ar: "٣٪ من قيمة المطالبة (بحد أقصى ١٥٬٠٠٠ د.أ)", en: "3% of claim value (capped at JOD 15,000)" }
        : { ar: "رسم مقطوع لدعوى غير مقدّرة القيمة", en: "Fixed fee — non-monetary claim" },
    },
    { label: { ar: "حصة نقابة المحامين", en: "Bar association share" }, amount: jbaShare },
    { label: { ar: "طوابع واردات", en: "Revenue stamps" }, amount: STAMPS },
    { label: { ar: "رسوم خدمات ومحاماة", en: "Court service fees" }, amount: SERVICE_FEES },
  ];
  if (includeAttorney) {
    lines.push({
      label: { ar: "أتعاب المحاماة (الحد الأدنى النقابي)", en: "Attorney fee (JBA minimum)" },
      amount: attorneyFee,
      note: { ar: "استرشادي — يجوز الاتفاق على أكثر", en: "Indicative — may be agreed higher" },
    });
  }
  return {
    claimValue,
    courtFee,
    jbaShare,
    stamps: STAMPS,
    serviceFees: SERVICE_FEES,
    attorneyFee,
    totalUpfront: Math.round((courtFee + jbaShare + STAMPS + SERVICE_FEES + attorneyFee) * 100) / 100,
    lines,
    disclaimer: {
      ar: "تقدير استرشادي وفق جداول رسوم المحاكم الأردنية والحد الأدنى لأتعاب نقابة المحامين. الرسوم النهائية تحددها المحكمة.",
      en: "Indicative estimate based on Jordanian court-fee schedules and JBA minimum-fee guidance. Final fees are assessed by the court.",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Power of Attorney (وكالة)                                          */
/* ------------------------------------------------------------------ */

export type PoaScope = "general" | "litigation" | "execution" | "sale" | "company" | "sharia" | "banking";

export const POA_SCOPES: { value: PoaScope; label: Bi; blurb: Bi }[] = [
  { value: "general", label: { ar: "وكالة عامة", en: "General power of attorney" }, blurb: { ar: "تفويض واسع لإدارة الشؤون القانونية والإدارية.", en: "Broad mandate over legal and administrative affairs." } },
  { value: "litigation", label: { ar: "وكالة خصومة (مرافعة)", en: "Litigation power of attorney" }, blurb: { ar: "تمثيل أمام المحاكم النظامية بجميع درجاتها.", en: "Representation before the regular courts at all levels." } },
  { value: "execution", label: { ar: "وكالة تنفيذ", en: "Execution power of attorney" }, blurb: { ar: "متابعة إجراءات التنفيذ والحجز والتحصيل.", en: "Execution, attachment and collection proceedings." } },
  { value: "sale", label: { ar: "وكالة بيع/شراء", en: "Sale / purchase power of attorney" }, blurb: { ar: "التصرف بالعقارات والمنقولات نيابة عن الموكل.", en: "Dealing in property on behalf of the principal." } },
  { value: "company", label: { ar: "وكالة تمثيل شركة", en: "Corporate representation" }, blurb: { ar: "التمثيل أمام مراقب الشركات والجهات الرسمية.", en: "Representation before the Companies Controller and authorities." } },
  { value: "sharia", label: { ar: "وكالة شرعية", en: "Sharia power of attorney" }, blurb: { ar: "قضايا الأحوال الشخصية أمام المحاكم الشرعية.", en: "Personal-status matters before the Sharia courts." } },
  { value: "banking", label: { ar: "وكالة بنكية", en: "Banking power of attorney" }, blurb: { ar: "إدارة الحسابات والمعاملات المصرفية.", en: "Managing accounts and banking transactions." } },
];

export const POA_POWERS: { value: string; label: Bi; scopes: PoaScope[] }[] = [
  { value: "file_claims", scopes: ["general", "litigation", "sharia", "company"], label: { ar: "إقامة الدعاوى وتقديم اللوائح", en: "File claims and pleadings" } },
  { value: "plead", scopes: ["general", "litigation", "sharia"], label: { ar: "المرافعة والمخاصمة أمام المحاكم", en: "Plead and litigate before the courts" } },
  { value: "settle", scopes: ["general", "litigation", "execution"], label: { ar: "الصلح والتنازل والإبراء", en: "Settle, waive and release" } },
  { value: "arbitrate", scopes: ["general", "litigation"], label: { ar: "الاتفاق على التحكيم وتعيين المحكّم", en: "Agree to arbitration and appoint arbitrators" } },
  { value: "receive_funds", scopes: ["general", "execution", "banking"], label: { ar: "قبض المبالغ والتوقيع بالاستلام", en: "Receive funds and sign receipts" } },
  { value: "execution_steps", scopes: ["general", "execution"], label: { ar: "متابعة التنفيذ والحجز ومنع السفر", en: "Pursue execution, attachment and travel bans" } },
  { value: "appoint_substitute", scopes: ["general", "litigation", "execution", "sharia"], label: { ar: "توكيل الغير كلياً أو جزئياً", en: "Appoint substitute counsel" } },
  { value: "sign_contracts", scopes: ["general", "sale", "company"], label: { ar: "التوقيع على العقود والاتفاقيات", en: "Sign contracts and agreements" } },
  { value: "register_property", scopes: ["sale"], label: { ar: "التسجيل لدى دائرة الأراضي والمساحة", en: "Register at the Department of Lands & Survey" } },
  { value: "represent_authorities", scopes: ["general", "company", "banking"], label: { ar: "التمثيل أمام الدوائر الرسمية", en: "Represent before official departments" } },
];

export function powersForScope(scope: PoaScope) {
  return POA_POWERS.filter((p) => p.scopes.includes(scope));
}

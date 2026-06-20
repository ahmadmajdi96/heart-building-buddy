export type CaseStatus = "active" | "pending" | "closed" | "urgent";
export type Case = {
  id: string;
  ref: string;
  titleAr: string;
  titleEn: string;
  client: string;
  court: string;
  practice: string;
  status: CaseStatus;
  nextHearing: string;
  lead: string;
  progress: number;
};

export const cases: Case[] = [
  { id: "c1", ref: "QD-2026-0142", titleAr: "نزاع تجاري — شركة الأنوار ضد المورد الإقليمي", titleEn: "Commercial dispute — Al Anwar vs. Regional Supplier", client: "شركة الأنوار", court: "المحكمة التجارية، الرياض", practice: "تجاري", status: "active", nextHearing: "2026-06-28", lead: "د. ليلى المنصور", progress: 64 },
  { id: "c2", ref: "QD-2026-0118", titleAr: "قضية عمالية — مطالبة بمستحقات نهاية الخدمة", titleEn: "Labor case — End-of-service entitlements", client: "أحمد الزهراني", court: "محكمة العمل، جدة", practice: "عمالي", status: "urgent", nextHearing: "2026-06-22", lead: "أ. خالد التميمي", progress: 82 },
  { id: "c3", ref: "QD-2026-0091", titleAr: "عقد امتياز تجاري — مراجعة وتفاوض", titleEn: "Franchise agreement — Review & negotiation", client: "مجموعة الواحة", court: "—", practice: "عقود", status: "pending", nextHearing: "2026-07-04", lead: "د. ليلى المنصور", progress: 35 },
  { id: "c4", ref: "QD-2026-0076", titleAr: "تحكيم دولي — مشروع البنية التحتية", titleEn: "International arbitration — Infrastructure project", client: "وزارة الأشغال", court: "غرفة دبي للتحكيم", practice: "تحكيم", status: "active", nextHearing: "2026-07-11", lead: "م. هشام العنزي", progress: 48 },
  { id: "c5", ref: "QD-2025-9842", titleAr: "ميراث وتركة — تقسيم عقاري", titleEn: "Inheritance — Real estate division", client: "ورثة آل سالم", court: "محكمة الأحوال، الكويت", practice: "أحوال", status: "closed", nextHearing: "—", lead: "أ. منى السبيعي", progress: 100 },
  { id: "c6", ref: "QD-2026-0203", titleAr: "ملكية فكرية — انتهاك علامة تجارية", titleEn: "IP — Trademark infringement", client: "شركة نسيج", court: "محكمة الاستئناف، القاهرة", practice: "ملكية فكرية", status: "active", nextHearing: "2026-06-30", lead: "د. ياسر فؤاد", progress: 71 },
  { id: "c7", ref: "QD-2026-0211", titleAr: "اندماج واستحواذ — العناية الواجبة", titleEn: "M&A — Due diligence", client: "Gulf Capital", court: "—", practice: "شركات", status: "pending", nextHearing: "2026-07-15", lead: "د. ليلى المنصور", progress: 22 },
];

export type Doc = {
  id: string;
  name: string;
  type: "contract" | "brief" | "evidence" | "judgment" | "template";
  caseRef?: string;
  updated: string;
  size: string;
  author: string;
  status: "draft" | "review" | "signed" | "filed";
};

export const documents: Doc[] = [
  { id: "d1", name: "عقد توريد — الأنوار v3.2", type: "contract", caseRef: "QD-2026-0142", updated: "2026-06-18", size: "284 KB", author: "د. ليلى المنصور", status: "review" },
  { id: "d2", name: "مذكرة دفاع — قضية العمل", type: "brief", caseRef: "QD-2026-0118", updated: "2026-06-19", size: "112 KB", author: "أ. خالد التميمي", status: "draft" },
  { id: "d3", name: "قالب اتفاقية عدم إفصاح (NDA)", type: "template", updated: "2026-06-10", size: "48 KB", author: "النظام", status: "signed" },
  { id: "d4", name: "حكم تمييز — رقم 4421/2024", type: "judgment", caseRef: "QD-2025-9842", updated: "2026-05-22", size: "640 KB", author: "النظام", status: "filed" },
  { id: "d5", name: "أدلة الانتهاك — صور وعينات", type: "evidence", caseRef: "QD-2026-0203", updated: "2026-06-17", size: "12.4 MB", author: "د. ياسر فؤاد", status: "filed" },
  { id: "d6", name: "تقرير العناية الواجبة — Gulf Capital", type: "brief", caseRef: "QD-2026-0211", updated: "2026-06-20", size: "1.8 MB", author: "د. ليلى المنصور", status: "draft" },
];

export type Hearing = {
  id: string;
  date: string;
  time: string;
  caseRef: string;
  court: string;
  type: string;
  attendee: string;
};

export const hearings: Hearing[] = [
  { id: "h1", date: "2026-06-22", time: "09:30", caseRef: "QD-2026-0118", court: "محكمة العمل، جدة", type: "جلسة مرافعة", attendee: "أ. خالد التميمي" },
  { id: "h2", date: "2026-06-25", time: "11:00", caseRef: "QD-2026-0142", court: "المحكمة التجارية، الرياض", type: "تقديم مذكرة", attendee: "د. ليلى المنصور" },
  { id: "h3", date: "2026-06-28", time: "10:00", caseRef: "QD-2026-0203", court: "محكمة الاستئناف، القاهرة", type: "نظر دعوى", attendee: "د. ياسر فؤاد" },
  { id: "h4", date: "2026-07-04", time: "13:30", caseRef: "QD-2026-0091", court: "اجتماع تفاوض", type: "جلسة تفاوض", attendee: "د. ليلى المنصور" },
  { id: "h5", date: "2026-07-11", time: "09:00", caseRef: "QD-2026-0076", court: "غرفة دبي للتحكيم", type: "جلسة تحكيم", attendee: "م. هشام العنزي" },
];

export const billingMonthly = [
  { m: "ينا", revenue: 184, hours: 612 },
  { m: "فبر", revenue: 211, hours: 698 },
  { m: "مار", revenue: 198, hours: 654 },
  { m: "أبر", revenue: 240, hours: 742 },
  { m: "ماي", revenue: 268, hours: 801 },
  { m: "يون", revenue: 295, hours: 845 },
];

export const practiceMix = [
  { name: "تجاري", value: 32 },
  { name: "تحكيم", value: 18 },
  { name: "عقود", value: 22 },
  { name: "عمالي", value: 12 },
  { name: "أحوال", value: 8 },
  { name: "ملكية فكرية", value: 8 },
];

export const invoices = [
  { id: "INV-2026-0481", client: "شركة الأنوار", amount: 48200, currency: "SAR", issued: "2026-06-01", due: "2026-07-01", status: "paid" },
  { id: "INV-2026-0482", client: "Gulf Capital", amount: 126500, currency: "USD", issued: "2026-06-05", due: "2026-07-05", status: "sent" },
  { id: "INV-2026-0483", client: "وزارة الأشغال", amount: 312000, currency: "AED", issued: "2026-06-10", due: "2026-07-10", status: "overdue" },
  { id: "INV-2026-0484", client: "مجموعة الواحة", amount: 18750, currency: "SAR", issued: "2026-06-12", due: "2026-07-12", status: "draft" },
  { id: "INV-2026-0485", client: "شركة نسيج", amount: 64300, currency: "EGP", issued: "2026-06-15", due: "2026-07-15", status: "sent" },
];

export type Course = {
  id: string;
  titleAr: string;
  titleEn: string;
  instructor: string;
  hours: number;
  level: "أساسي" | "متقدم" | "خبراء";
  enrolled: number;
  rating: number;
  cpd: number;
};

export const courses: Course[] = [
  { id: "co1", titleAr: "أصول الصياغة التشريعية", titleEn: "Principles of Legislative Drafting", instructor: "د. فاطمة الحمادي", hours: 24, level: "متقدم", enrolled: 412, rating: 4.8, cpd: 24 },
  { id: "co2", titleAr: "التحكيم التجاري الدولي", titleEn: "International Commercial Arbitration", instructor: "م. هشام العنزي", hours: 32, level: "خبراء", enrolled: 287, rating: 4.9, cpd: 32 },
  { id: "co3", titleAr: "أساسيات قانون العمل الخليجي", titleEn: "GCC Labor Law Fundamentals", instructor: "أ. خالد التميمي", hours: 16, level: "أساسي", enrolled: 1284, rating: 4.7, cpd: 16 },
  { id: "co4", titleAr: "الذكاء الاصطناعي والمسؤولية القانونية", titleEn: "AI & Legal Liability", instructor: "د. ليلى المنصور", hours: 12, level: "متقدم", enrolled: 736, rating: 4.9, cpd: 12 },
  { id: "co5", titleAr: "حماية البيانات والخصوصية", titleEn: "Data Protection & Privacy", instructor: "د. ياسر فؤاد", hours: 20, level: "متقدم", enrolled: 521, rating: 4.6, cpd: 20 },
  { id: "co6", titleAr: "قانون الشركات الحديث", titleEn: "Modern Corporate Law", instructor: "أ. منى السبيعي", hours: 28, level: "متقدم", enrolled: 398, rating: 4.7, cpd: 28 },
];

export const researchSources = [
  { id: "r1", titleAr: "النظام التجاري السعودي — المادة 217", titleEn: "Saudi Commercial Code — Art. 217", jurisdiction: "السعودية", year: 2024, type: "تشريع" },
  { id: "r2", titleAr: "حكم محكمة التمييز الإماراتية — 2023/118", titleEn: "UAE Court of Cassation — 2023/118", jurisdiction: "الإمارات", year: 2023, type: "اجتهاد" },
  { id: "r3", titleAr: "قانون التحكيم المصري رقم 27 لسنة 1994", titleEn: "Egyptian Arbitration Law No. 27/1994", jurisdiction: "مصر", year: 1994, type: "تشريع" },
  { id: "r4", titleAr: "اتفاقية نيويورك بشأن الاعتراف بأحكام التحكيم", titleEn: "New York Convention on Arbitral Awards", jurisdiction: "دولي", year: 1958, type: "معاهدة" },
  { id: "r5", titleAr: "نظام حماية البيانات الشخصية — السعودية", titleEn: "Personal Data Protection Law — KSA", jurisdiction: "السعودية", year: 2023, type: "تشريع" },
];

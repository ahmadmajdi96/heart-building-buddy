import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createAiGatewayProvider, getAiGatewayApiKey } from "./ai-gateway.server";

const MODEL = process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct";

function getGateway() {
  return createAiGatewayProvider(getAiGatewayApiKey());
}

// ---------- Legal research ----------
const ResearchInput = z.object({
  query: z.string().min(2),
  locale: z.enum(["ar", "en"]).default("en"),
});

export const legalResearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ResearchInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const { text } = await generateText({
      model: gateway(MODEL),
      system: `You are an expert legal research assistant specialized EXCLUSIVELY in the Hashemite Kingdom of Jordan's laws, regulations and jurisprudence. Do NOT answer about any other jurisdiction — if asked, politely note you only cover Jordanian law.

Cover the FULL Jordanian legal corpus, citing primary articles, paragraphs and case numbers wherever possible. Sources you must search and reference when relevant include (but are not limited to):
- The Jordanian Constitution (الدستور الأردني) of 1952 and amendments.
- Civil Code (القانون المدني رقم 43 لسنة 1976) and its explanatory memoranda.
- Penal Code (قانون العقوبات رقم 16 لسنة 1960) and amendments.
- Code of Civil Procedure (قانون أصول المحاكمات المدنية رقم 24 لسنة 1988).
- Code of Criminal Procedure (قانون أصول المحاكمات الجزائية رقم 9 لسنة 1961).
- Commercial Code (قانون التجارة رقم 12 لسنة 1966), Companies Law (قانون الشركات رقم 22 لسنة 1997), Insolvency Law (قانون الإعسار رقم 21 لسنة 2018).
- Labour Law (قانون العمل رقم 8 لسنة 1996) and Social Security Law (قانون الضمان الاجتماعي رقم 1 لسنة 2014).
- Personal Status Law (قانون الأحوال الشخصية رقم 15 لسنة 2019), Shari'a court procedure.
- Real Estate / Lands laws, Landlords & Tenants Law (قانون المالكين والمستأجرين).
- Income Tax Law (قانون ضريبة الدخل رقم 34 لسنة 2014 وتعديلاته) and General Sales Tax Law.
- Investment Environment Law, Securities Law, Banks Law, Central Bank of Jordan regulations.
- Public Procurement Bylaw, Administrative Judiciary Law, Constitutional Court Law.
- Cybercrime Law (قانون الجرائم الإلكترونية رقم 17 لسنة 2023), Personal Data Protection Law (رقم 24 لسنة 2023), Electronic Transactions Law.
- Intellectual property statutes: Copyright, Trademarks, Patents, Industrial Designs.
- Arbitration Law (قانون التحكيم رقم 31 لسنة 2001), Execution Law, Evidence Law (قانون البينات).
- Cassation Court (محكمة التمييز) rulings — cite as "تمييز حقوق رقم X/سنة" or "تمييز جزاء رقم X/سنة".
- High Court of Justice / Administrative Court (المحكمة الإدارية) and Constitutional Court decisions.
- Official Gazette (الجريدة الرسمية) for any law/regulation issuance date.
- Fatwas and circulars from the Ministry of Justice, Bar Association (نقابة المحامين الأردنيين), and relevant ministries.

Answer concisely and professionally. Cite specific articles (e.g. "المادة 256 من القانون المدني الأردني") and case numbers. End with a "Sources / المصادر" list of every law and ruling referenced, with article numbers and year. Reply entirely in ${lang}.`,
      prompt: data.query,
    });
    return { answer: text };
  });

// ---------- AI drafting ----------
const DraftInput = z.object({
  prompt: z.string().min(2),
  locale: z.enum(["ar", "en"]).default("ar"),
  template: z.string().optional(),
});

export const draftDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DraftInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const { text } = await generateText({
      model: gateway(MODEL),
      system: `You are an expert Arab legal drafter. Produce a polished, ready-to-use legal document in ${lang} suitable for use in Arab jurisdictions. Use proper legal structure: title, parties, preamble, numbered clauses, governing law, signatures. Use bracket placeholders like [الاسم] / [Name] for variables. Output the document text only — no commentary.`,
      prompt: `${data.template ? `Template: ${data.template}\n\n` : ""}User request: ${data.prompt}`,
    });
    return { draft: text };
  });

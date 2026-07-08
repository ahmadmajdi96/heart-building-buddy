import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type AiLocale = "ar" | "en";

const ARABIC_DISALLOWED_SCRIPT = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const ARABIC_DISALLOWED_SCRIPT_GLOBAL = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu;
const ENGLISH_DISALLOWED_SCRIPT = /[\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const ENGLISH_DISALLOWED_SCRIPT_GLOBAL = /[\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu;
const ARABIC_LETTERS_GLOBAL = /[\p{Script=Arabic}]/gu;
const LATIN_LETTERS_GLOBAL = /[\p{Script=Latin}]/gu;

// Novita AI (OpenAI-compatible) is the default provider.
const DEFAULT_AI_GATEWAY_BASE_URL = "https://api.novita.ai/v3/openai";
export const DEFAULT_AI_MODEL =
  process.env.AI_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct";

export function getAiGatewayApiKey() {
  const key =
    process.env.NOVITA_API_KEY ||
    process.env.AI_GATEWAY_API_KEY ||
    process.env.LOVABLE_API_KEY ||
    process.env.API_KEY;
  if (!key) {
    throw new Error(
      "Missing NOVITA_API_KEY. Set it in your Docker .env or server environment.",
    );
  }
  return key;
}

export function createAiGatewayProvider(apiKey: string) {
  const baseURL =
    process.env.AI_GATEWAY_BASE_URL?.trim() || DEFAULT_AI_GATEWAY_BASE_URL;
  return createOpenAICompatible({
    name: "novita",
    baseURL,
    apiKey,
  });
}

function normalizeAiWhitespace(text: string) {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([،؛,.!?;:])/g, "$1")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeLanguageText(text: string, locale: AiLocale) {
  const disallowed = locale === "ar" ? ARABIC_DISALLOWED_SCRIPT : ENGLISH_DISALLOWED_SCRIPT;
  const strip = locale === "ar" ? ARABIC_DISALLOWED_SCRIPT_GLOBAL : ENGLISH_DISALLOWED_SCRIPT_GLOBAL;
  const preferredLetters = locale === "ar" ? ARABIC_LETTERS_GLOBAL : LATIN_LETTERS_GLOBAL;

  const cleaned = text.replace(/\S+/gu, (token) => {
    if (!disallowed.test(token)) return token;

    const stripped = token.replace(strip, "");
    const preferredCount = stripped.match(preferredLetters)?.length ?? 0;

    // Mixed-script fragments like "والработодатель" leave only a prefix after
    // stripping. Drop those short remnants instead of displaying broken words.
    if (preferredCount <= 3) return "";
    return stripped;
  });

  return normalizeAiWhitespace(cleaned);
}

export function sanitizeLanguageOutput<T>(value: T, locale: AiLocale): T {
  if (typeof value === "string") return sanitizeLanguageText(value, locale) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeLanguageOutput(item, locale)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        sanitizeLanguageOutput(nested, locale),
      ]),
    ) as T;
  }
  return value;
}

/**
 * Strict language directive to prevent the model from leaking foreign-language
 * tokens (e.g. Russian/Cyrillic, Chinese, Hindi) into Arabic or English output.
 * Prepend to every system prompt.
 */
export function strictLanguageDirective(locale: "ar" | "en"): string {
  if (locale === "ar") {
    return `LANGUAGE LOCK — ABSOLUTE RULE:
- Reply EXCLUSIVELY in Modern Standard Arabic (اللغة العربية الفصحى).
- Every single word, character and token in your output MUST use the Arabic script (U+0600–U+06FF) or standard punctuation/digits.
- DO NOT emit any Cyrillic (Russian), Latin (English/French/German), Chinese, Hindi/Devanagari, Hebrew, or any other non-Arabic script anywhere in the response — not even a single word, name or phrase.
- The ONLY allowed non-Arabic content is: internationally recognized proper nouns already written in Arabic transliteration, digits 0-9, and standard punctuation (. , ; : ! ? " ' - ( ) [ ]).
- If you feel tempted to use an English or foreign word, translate it into Arabic instead.
- If any source, uploaded file, or retrieved legal context contains English or another language, translate it fully into Arabic; never quote foreign-script text verbatim.
- Names of laws, articles, and case citations MUST be written in Arabic (e.g. "المادة 25 من قانون العمل" — never "Article 25 of Labour Law" or any transliteration in Latin/Cyrillic letters).
- Before returning, silently re-read your output and replace any non-Arabic word with its Arabic equivalent.`;
  }
  return `LANGUAGE LOCK — ABSOLUTE RULE:
- Reply EXCLUSIVELY in English.
- Every single word, character and token in your output MUST use the Latin alphabet (A-Z, a-z) with standard punctuation and digits.
- DO NOT emit any Arabic, Cyrillic (Russian), Chinese, Hindi/Devanagari, Hebrew, or any other non-Latin script anywhere in the response — not even a single word, name or phrase.
- If a legal term or law name is originally in Arabic, either translate it to English or transliterate it in Latin letters (e.g. "Jordanian Civil Code (al-Qanun al-Madani)"), never in the original script.
- If any source, uploaded file, or retrieved legal context contains Arabic or another non-Latin script, translate or transliterate it fully into English; never quote non-Latin-script text verbatim.
- Before returning, silently re-read your output and replace any non-Latin-script word with its English equivalent or Latin transliteration.`;
}

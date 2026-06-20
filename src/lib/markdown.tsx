import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownView({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground/90 leading-relaxed",
        "[&_h1]:font-serif [&_h1]:text-2xl [&_h1]:mt-4 [&_h1]:mb-2",
        "[&_h2]:font-serif [&_h2]:text-xl [&_h2]:mt-4 [&_h2]:mb-2",
        "[&_h3]:font-serif [&_h3]:text-lg [&_h3]:mt-3 [&_h3]:mb-1.5",
        "[&_p]:my-2",
        "[&_ul]:list-disc [&_ul]:ps-6 [&_ul]:my-2 [&_ul>li]:my-0.5",
        "[&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:my-2 [&_ol>li]:my-0.5",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        "[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:rounded-md [&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:overflow-x-auto",
        "[&_blockquote]:border-s-2 [&_blockquote]:border-gold [&_blockquote]:ps-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
        "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:p-2 [&_th]:bg-secondary/60 [&_td]:border [&_td]:p-2",
        "[&_a]:text-gold [&_a]:underline",
        "[&_hr]:my-4 [&_hr]:border-border",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

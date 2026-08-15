import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders trusted, committed Markdown (FAQ bodies, corpus notes) — never user input.
 * Sticker-album prose: Archivo headings on ink, 17px body, red-ink underlined links,
 * red list markers. Kept plain and roomy (plain-language posture).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-plain space-y-3.5 text-[17px] leading-relaxed text-ink-soft">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-7 font-display text-[21px] font-black leading-tight text-ink">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 font-display text-[18px] font-extrabold leading-snug text-ink">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1.5 pl-5 marker:text-red">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1.5 pl-5 marker:font-display marker:font-black marker:text-red">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-ink bg-cream-deep px-4 py-3 text-[15.5px]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-t-2 border-line" />,
          code: ({ children }) => (
            <code className="mono rounded-sticker bg-cream-deep px-1.5 py-0.5 text-[15px] text-ink">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a href={href} className="link" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

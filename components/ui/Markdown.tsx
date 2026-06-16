import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders trusted, committed Markdown (FAQ bodies, corpus notes) — never user input.
 * Styling kept plain and readable (plain-language posture).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-plain space-y-3 text-ink-soft">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-6 font-display text-xl font-bold text-ink">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">{children}</h3>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
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

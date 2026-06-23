import { useMemo } from "react";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface RichContentProps {
  /** Raw HTML string (or plain text) to render */
  html: string | null | undefined;
  /** Additional CSS classes on the container */
  className?: string;
  /** Inline display (span instead of div) */
  inline?: boolean;
}

/* ─── LaTeX processing ──────────────────────────────────────────────────────── */

/**
 * Replaces $...$ (inline) and $$...$$ (block) LaTeX patterns with rendered KaTeX HTML.
 * Processes block math first to avoid conflicts.
 */
function processLatex(html: string): string {
  // Process block math $$...$$ → <div class="katex-block">...</div>
  let result = html.replace(/\$\$([^$]+?)\$\$/g, (_match, tex) => {
    try {
      return `<div class="rte-katex-block">${katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
        output: "html",
      })}</div>`;
    } catch {
      return `<div class="rte-katex-block rte-katex-error" title="LaTeX error">$$${tex}$$</div>`;
    }
  });

  // Process inline math $...$ → <span>...</span>
  // Negative lookbehind for $ to avoid matching $$
  result = result.replace(/(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: false,
        throwOnError: false,
        output: "html",
      });
    } catch {
      return `<span class="rte-katex-error" title="LaTeX error">$${tex}$</span>`;
    }
  });

  return result;
}

/* ─── Sanitisation config ───────────────────────────────────────────────────── */

const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    "b", "strong", "i", "em", "u", "s", "sub", "sup",
    "ul", "ol", "li", "br", "p", "div", "span", "img",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "th", "td",
    "blockquote", "pre", "code", "hr",
    // KaTeX generates these
    "math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub",
    "mfrac", "msqrt", "mover", "munder", "mtable", "mtr", "mtd",
    "annotation", "svg", "path", "line", "rect",
  ],
  ALLOWED_ATTR: [
    "class", "style", "src", "alt", "title", "href", "target",
    "width", "height", "colspan", "rowspan",
    // KaTeX attributes
    "xmlns", "encoding", "mathvariant", "displaystyle", "scriptlevel",
    "d", "viewBox", "fill", "stroke", "stroke-width",
    "aria-hidden", "role",
  ],
  ALLOW_DATA_ATTR: false,
};

/* ─── Component ─────────────────────────────────────────────────────────────── */

export const RichContent = ({ html, className = "", inline = false }: RichContentProps) => {
  const rendered = useMemo(() => {
    if (!html) return "";

    // If it's plain text (no HTML tags), just return escaped text
    const hasHtml = /<[a-z][\s\S]*>/i.test(html);
    let content = hasHtml ? html : escapeHtml(html);

    // Process LaTeX before sanitising (KaTeX output is whitelisted)
    content = processLatex(content);

    // Sanitise
    content = DOMPurify.sanitize(content, PURIFY_CONFIG);

    return content;
  }, [html]);

  if (!rendered) return null;

  const baseClasses = `
    rich-content
    [&_b]:font-bold [&_strong]:font-bold
    [&_i]:italic [&_em]:italic
    [&_u]:underline
    [&_sup]:text-[0.7em] [&_sup]:align-super
    [&_sub]:text-[0.7em] [&_sub]:align-sub
    [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-1
    [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-1
    [&_li]:my-0.5
    [&_img]:inline-block [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1
    [&_.rte-katex-block]:my-2 [&_.rte-katex-block]:text-center
    [&_.rte-katex-error]:text-red-500 [&_.rte-katex-error]:font-mono [&_.rte-katex-error]:text-xs
    ${className}
  `.trim();

  if (inline) {
    return <span className={baseClasses} dangerouslySetInnerHTML={{ __html: rendered }} />;
  }

  return <div className={baseClasses} dangerouslySetInnerHTML={{ __html: rendered }} />;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br />");
}

export default RichContent;

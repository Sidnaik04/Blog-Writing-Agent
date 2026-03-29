import { useState, useRef, useEffect } from "react";
import {
  Button,
  Spinner,
  IconDownload,
  IconFileText,
  IconFilePdf,
} from "./ui";

/**
 * Generates a safe filename from a title or topic string.
 */
function safeFilename(title) {
  return title
    .slice(0, 50)
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Download markdown content as a .md file.
 */
function downloadMarkdown(content, title) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Simple markdown → HTML converter for PDF rendering.
 * Handles headings, bold, italic, links, images, lists, code blocks,
 * inline code, blockquotes, horizontal rules, and tables.
 */
function markdownToHtml(md) {
  let html = md;

  // Code blocks (fenced) — must come before inline transforms
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre><code class="lang-${lang || "text"}">${escaped}</code></pre>`;
  });

  // Blockquotes
  html = html.replace(/^>\s?(.*)$/gm, "<blockquote>$1</blockquote>");
  // Merge adjacent blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, "\n");

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr/>");
  html = html.replace(/^\*\*\*+$/gm, "<hr/>");

  // Images (before links to avoid conflict)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1"/>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code (after code blocks)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Tables
  html = html.replace(
    /(?:^\|.+\|$\n?)+/gm,
    (tableBlock) => {
      const rows = tableBlock.trim().split("\n");
      if (rows.length < 2) return tableBlock;

      let tableHtml = "<table>";
      rows.forEach((row, i) => {
        // Skip separator row (|---|---|)
        if (/^\|[\s-:|]+\|$/.test(row)) return;
        const cells = row
          .split("|")
          .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => c.trim());
        const tag = i === 0 ? "th" : "td";
        const rowTag = i === 0 ? "thead" : "";
        const rowTagClose = i === 0 ? "</thead><tbody>" : "";
        tableHtml += `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>${rowTagClose}`;
      });
      tableHtml += "</tbody></table>";
      return tableHtml;
    }
  );

  // Unordered lists
  html = html.replace(
    /(?:^[\t ]*[-*]\s+.+$\n?)+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^[\t ]*[-*]\s+/, "")}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
  );

  // Ordered lists
  html = html.replace(
    /(?:^\d+\.\s+.+$\n?)+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^\d+\.\s+/, "")}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }
  );

  // Paragraphs: wrap remaining loose text lines
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Don't wrap blocks that are already HTML elements
      if (/^<(h[1-6]|p|ul|ol|li|pre|blockquote|table|thead|tbody|tr|th|td|hr|img|div)[\s>]/i.test(trimmed)) {
        return trimmed;
      }
      // Wrap plain text lines in <p>
      return trimmed
        .split("\n")
        .map((line) => {
          const l = line.trim();
          if (!l) return "";
          if (/^<(h[1-6]|p|ul|ol|li|pre|blockquote|table|thead|tbody|tr|th|td|hr|img|div)[\s>]/i.test(l)) return l;
          return `<p>${l}</p>`;
        })
        .join("\n");
    })
    .join("\n");

  return html;
}

/**
 * Download markdown content as a styled PDF.
 * Converts markdown to HTML, then uses html2pdf.js to generate the PDF.
 *
 * Strategy: We create a wrapper div with overflow:hidden and height:0
 * so the content is in the DOM (for html2canvas) but not visible to the user.
 * In html2canvas's `onclone` callback we restore the clone's dimensions
 * so the cloned DOM renders fully for the canvas capture.
 */
async function downloadPdf(content, title) {
  const html2pdf = (await import("html2pdf.js")).default;

  const htmlContent = markdownToHtml(content);

  // Outer wrapper — hides from user via overflow:hidden + height:0
  const wrapper = document.createElement("div");
  wrapper.id = "__pdf_wrapper__";
  Object.assign(wrapper.style, {
    overflow: "hidden",
    height: "0",
    position: "absolute",
    top: "0",
    left: "0",
    width: "0",
  });

  // Inner container — has the actual styled content
  const container = document.createElement("div");
  container.id = "__pdf_content__";
  Object.assign(container.style, {
    width: "750px",
    padding: "40px",
    fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#1a1a2e",
    background: "#ffffff",
  });

  container.innerHTML = `
    <style>
      #__pdf_content__ h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin: 0 0 16px 0; padding-bottom: 10px; border-bottom: 2px solid #e8e6e1; }
      #__pdf_content__ h2 { font-size: 20px; font-weight: 600; color: #2d5a27; margin: 28px 0 12px 0; }
      #__pdf_content__ h3 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 20px 0 8px 0; }
      #__pdf_content__ h4, #__pdf_content__ h5, #__pdf_content__ h6 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 16px 0 8px 0; }
      #__pdf_content__ p { margin: 0 0 12px 0; color: #333; }
      #__pdf_content__ ul, #__pdf_content__ ol { margin: 0 0 12px 0; padding-left: 24px; }
      #__pdf_content__ ul { list-style-type: disc; }
      #__pdf_content__ ol { list-style-type: decimal; }
      #__pdf_content__ li { margin-bottom: 4px; color: #333; }
      #__pdf_content__ code { background: #f4f3ee; padding: 2px 6px; border-radius: 4px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; }
      #__pdf_content__ pre { background: #1a1a2e; color: #e8e6e1; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0 0 16px 0; white-space: pre-wrap; word-wrap: break-word; }
      #__pdf_content__ pre code { background: none; padding: 0; color: inherit; }
      #__pdf_content__ blockquote { border-left: 3px solid #2d5a27; padding: 8px 16px; margin: 0 0 16px 0; background: #f8f7f4; color: #555; }
      #__pdf_content__ table { width: 100%; border-collapse: collapse; margin: 0 0 16px 0; }
      #__pdf_content__ th, #__pdf_content__ td { border: 1px solid #e8e6e1; padding: 8px 12px; text-align: left; font-size: 13px; }
      #__pdf_content__ th { background: #f4f3ee; font-weight: 600; }
      #__pdf_content__ img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
      #__pdf_content__ a { color: #2d5a27; text-decoration: underline; }
      #__pdf_content__ hr { border: none; border-top: 1px solid #e8e6e1; margin: 24px 0; }
      #__pdf_content__ strong { font-weight: 600; color: #1a1a2e; }
      #__pdf_content__ em { font-style: italic; }
    </style>
    ${htmlContent}
  `;

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  const filename = `${safeFilename(title)}.pdf`;

  await html2pdf()
    .set({
      margin: [15, 15, 15, 15],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        windowWidth: 830,
        // The key: onclone makes the wrapper visible in the CLONED document
        // so html2canvas can capture it, while the original stays hidden.
        onclone: (clonedDoc) => {
          const clonedWrapper = clonedDoc.getElementById("__pdf_wrapper__");
          if (clonedWrapper) {
            clonedWrapper.style.overflow = "visible";
            clonedWrapper.style.height = "auto";
            clonedWrapper.style.width = "auto";
            clonedWrapper.style.position = "static";
          }
        },
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    })
    .from(container)
    .save();

  // Cleanup
  document.body.removeChild(wrapper);
}

/**
 * DownloadDropdown – A styled dropdown button offering .md and .pdf downloads.
 *
 * Props:
 *  - content: string (markdown content)
 *  - title: string (used for filename)
 *  - variant: "button" | "icon" – button shows text, icon is compact
 *  - size: "sm" | "md"
 *  - stopPropagation: boolean – call e.stopPropagation() on click
 */
export default function DownloadDropdown({
  content,
  title,
  variant = "button",
  size = "sm",
  stopPropagation = false,
}) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = (e) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen((prev) => !prev);
  };

  const handleDownloadMd = (e) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    downloadMarkdown(content, title);
    setOpen(false);
  };

  const handleDownloadPdf = async (e) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    setGenerating(true);
    try {
      await downloadPdf(content, title);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
      setOpen(false);
    }
  };

  return (
    <div className="download-dropdown" ref={dropdownRef}>
      {variant === "button" ? (
        <Button variant="ghost" size={size} onClick={handleToggle}>
          <IconDownload size={13} />
          Download
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
      ) : (
        <button
          onClick={handleToggle}
          className="p-1.5 rounded-md text-ink-4 hover:text-accent hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
          title="Download"
        >
          <IconDownload size={13} />
        </button>
      )}

      {open && (
        <div className="download-dropdown-menu">
          <button
            className="download-dropdown-item"
            onClick={handleDownloadMd}
          >
            <IconFileText size={15} className="text-ink-3" />
            <div className="download-dropdown-item-text">
              <span className="download-dropdown-item-label">Markdown</span>
              <span className="download-dropdown-item-desc">.md file</span>
            </div>
          </button>
          <button
            className="download-dropdown-item"
            onClick={handleDownloadPdf}
            disabled={generating}
          >
            {generating ? (
              <Spinner size={15} className="text-accent" />
            ) : (
              <IconFilePdf size={15} className="text-red-500" />
            )}
            <div className="download-dropdown-item-text">
              <span className="download-dropdown-item-label">
                {generating ? "Generating…" : "PDF"}
              </span>
              <span className="download-dropdown-item-desc">
                {generating ? "Please wait" : ".pdf file"}
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

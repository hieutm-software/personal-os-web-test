"use client";

import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import { Bold, Code, Edit3, Eye, Italic, List } from "lucide-react";
import { marked } from "marked";
import markedFootnote from "marked-footnote";
import markedKatex from "marked-katex-extension";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  activeTab?: "write" | "preview";
  onTabChange?: (tab: "write" | "preview") => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  className,
  activeTab: propActiveTab,
  onTabChange,
}: MarkdownEditorProps) {
  const [internalTab, setInternalTab] = useState<"write" | "preview">("write");
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;
  
  const [html, setHtml] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollPercentRef = useRef<number>(0);

  useEffect(() => {
    if (activeTab === "preview") {
      const parseAndSanitize = async () => {
        try {
          let checkboxIndex = 0;
          // Configure highlight.js for marked
          marked.setOptions({
            breaks: true,
            gfm: true,
          });

          // Add KaTeX support for math formulas
          marked.use(markedKatex({ throwOnError: false, output: "htmlAndMathml" }));

          // Add Footnotes support
          marked.use(markedFootnote());

          // Add highlight.js integration
          const renderer = new marked.Renderer();
          renderer.code = ({ text, lang }) => {
            const language: string = (lang && hljs.getLanguage(lang)) ? lang : "plaintext";
            const highlighted = hljs.highlight(text, { language }).value;
            const encodedText = encodeURIComponent(text);
            return `
              <div class="relative group mt-4 mb-6">
                <div class="absolute top-2 right-2 flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  <span class="select-none capitalize">${language}</span>
                  <button class="copy-code-btn opacity-0 group-hover:opacity-100 hover:text-foreground transition-all flex items-center gap-1" data-code="${encodedText}" title="Copy Code">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
                <pre class="!bg-[#0d1117] text-[#c9d1d9] p-4 pt-10 rounded-lg overflow-x-auto border border-border m-0"><code class="hljs language-${language}">${highlighted}</code></pre>
              </div>
            `;
          };
          renderer.checkbox = ({ checked }) => {
            const index = checkboxIndex++;
            return `<input type="checkbox" class="task-list-checkbox w-4 h-4 rounded border-border accent-primary align-middle mr-2 cursor-pointer" ${checked ? "checked" : ""} data-index="${index}" />`;
          };

          // Parse markdown to raw HTML
          const rawHtml = await marked.parse(value, { renderer });

          // CRITICAL: Block XSS via DOMPurify before injecting into the DOM
          const sanitizedHtml = DOMPurify.sanitize(rawHtml as string, {
            ALLOWED_TAGS: [
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
              "blockquote",
              "p",
              "a",
              "ul",
              "ol",
              "nl",
              "li",
              "b",
              "i",
              "strong",
              "em",
              "strike",
              "code",
              "hr",
              "br",
              "div",
              "table",
              "thead",
              "caption",
              "tbody",
              "tr",
              "th",
              "td",
              "pre",
              "img",
              "input",
              "span",
              "kbd",
              "u",
              "sup",
              "sub",
              "details",
              "summary",
              "section",
              "button",
            ],
            ALLOWED_ATTR: ["href", "name", "target", "src", "alt", "class", "type", "checked", "disabled", "style", "id", "data-code", "data-index", "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "d", "x", "y", "width", "height", "rx", "ry", "title"],
            ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn", "ms", "mspace", "munderover", "mpadded", "mfrac", "mroot", "msqrt", "mtable", "mtr", "mtd", "maligngroup", "malignmark", "annotation", "svg", "path", "rect"],
          });

          setHtml(sanitizedHtml);
        } catch (error) {
          console.error("Markdown parsing failed:", error);
          setHtml(
            '<p class="text-destructive font-medium">Error rendering preview.</p>',
          );
        }
      };

      parseAndSanitize();
    }
  }, [value, activeTab]);

  useEffect(() => {
    const handleCopy = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".copy-code-btn") as HTMLButtonElement;
      if (btn) {
        const code = btn.getAttribute("data-code");
        if (code) {
          navigator.clipboard.writeText(decodeURIComponent(code));
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `<span class="text-xs">Copied!</span>`;
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 2000);
        }
      }
    };
    
    // Only attach if in preview mode
    if (activeTab === "preview") {
      document.addEventListener("click", handleCopy);
    }
    return () => document.removeEventListener("click", handleCopy);
  }, [activeTab]);

  useEffect(() => {
    const handleCheckboxChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.classList && target.classList.contains("task-list-checkbox")) {
        const indexStr = target.getAttribute("data-index");
        if (indexStr) {
          const index = parseInt(indexStr, 10);
          const isChecked = target.checked;
          
          let currentIdx = 0;
          const newMarkdown = value.replace(/((?:```|~~~)[\s\S]*?(?:```|~~~|$))|(^([\s>]*(?:[-*+]|\d+\.)\s+)\[([ xX])\])/gm, (match, codeBlock, listMatch, prefix) => {
            if (codeBlock) {
              return codeBlock;
            }
            if (listMatch) {
              if (currentIdx === index) {
                currentIdx++;
                return `${prefix}[${isChecked ? "x" : " "}]`;
              }
              currentIdx++;
              return listMatch;
            }
            return match;
          });
          
          if (newMarkdown !== value) {
            onChange(newMarkdown);
          }
        }
      }
    };

    if (activeTab === "preview") {
      document.addEventListener("change", handleCheckboxChange);
    }
    return () => document.removeEventListener("change", handleCheckboxChange);
  }, [value, activeTab, onChange]);

  const handleTabSwitch = useCallback((newTab: "write" | "preview") => {
    if (newTab === activeTab) return;

    // Save scroll percentage before switching
    if (activeTab === "write" && textareaRef.current) {
      const el = textareaRef.current;
      scrollPercentRef.current = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0;
    } else if (activeTab === "preview" && previewRef.current) {
      const el = previewRef.current;
      scrollPercentRef.current = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0;
    }

    if (propActiveTab === undefined) setInternalTab(newTab);
    onTabChange?.(newTab);
  }, [activeTab, propActiveTab, onTabChange]);

  // Restore scroll percentage after tab switch
  useEffect(() => {
    const applyScroll = () => {
      const pct = scrollPercentRef.current;
      if (isNaN(pct) || pct < 0) return;
      if (activeTab === "write" && textareaRef.current) {
        const el = textareaRef.current;
        el.scrollTop = pct * (el.scrollHeight - el.clientHeight);
      } else if (activeTab === "preview" && previewRef.current) {
        const el = previewRef.current;
        el.scrollTop = pct * (el.scrollHeight - el.clientHeight);
      }
    };
    const timer = setTimeout(applyScroll, 10);
    return () => clearTimeout(timer);
  }, [activeTab, html]);

  // Global Ctrl+E to toggle tabs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleTabSwitch(activeTab === "write" ? "preview" : "write");
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeTab, propActiveTab, onTabChange, handleTabSwitch]);

  // Store onChange in a ref so we can use a stable callback without stale closures
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync external value changes into the uncontrolled textarea
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current.value = value;
      }
    }
  }, [value]);

  const insertText = useCallback((before: string, after: string = "") => {
    const textarea = document.getElementById("md-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = before + selectedText + after;

    textarea.focus();

    let success = false;
    try {
      success = document.execCommand("insertText", false, replacement);
    } catch {}

    if (!success) {
      const newValue = text.substring(0, start) + replacement + text.substring(end);
      onChangeRef.current(newValue);
    }

    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }, []);

  const toggleBulletList = useCallback(() => {
    const textarea = document.getElementById("md-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== "\n") lineStart--;
    
    let lineEnd = end;
    while (lineEnd < text.length && text[lineEnd] !== "\n") lineEnd++;

    const selectedLinesText = text.substring(lineStart, lineEnd);
    const lines = selectedLinesText.split("\n");

    const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
    const allHaveBullets = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => line.startsWith("- "));
    
    const newLines = lines.map((line) => {
      if (line.trim().length === 0) return line;
      if (allHaveBullets) {
        return line.startsWith("- ") ? line.substring(2) : line;
      } else {
        return line.startsWith("- ") ? line : "- " + line;
      }
    });

    const replacement = newLines.join("\n");

    textarea.setSelectionRange(lineStart, lineEnd);
    textarea.focus();

    let success = false;
    try {
      success = document.execCommand("insertText", false, replacement);
    } catch {}

    if (!success) {
      const newValue = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
      onChangeRef.current(newValue);
    }

    setTimeout(() => {
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }, 0);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const text = textarea.value;

    // Obsidian-style code block auto-completion
    if (e.key === "`") {
      if (start >= 2 && text.substring(start - 2, start) === "``") {
        e.preventDefault();
        const replacement = "`\n\n```";
        
        let success = false;
        try {
          success = document.execCommand("insertText", false, replacement);
        } catch {}

        if (!success) {
          const newValue = text.substring(0, start) + replacement + text.substring(textarea.selectionEnd);
          onChangeRef.current(newValue);
        }

        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          insertText("**", "**");
          break;
        case "i":
          e.preventDefault();
          insertText("*", "*");
          break;
        case "e":
          e.preventDefault();
          insertText("`", "`");
          break;
      }
    }
  }, [insertText]);

  // Attach purely native event listeners to completely bypass React's SyntheticEvent system
  // which is known to severely interfere with Vietnamese IME composition and native undo stacks.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const handleNativeInput = (e: Event) => {
      onChangeRef.current((e.target as HTMLTextAreaElement).value);
    };

    const handleNativeKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
    };

    el.addEventListener("input", handleNativeInput);
    el.addEventListener("keydown", handleNativeKeyDown);

    return () => {
      el.removeEventListener("input", handleNativeInput);
      el.removeEventListener("keydown", handleNativeKeyDown);
    };
  }, [handleKeyDown, activeTab]);

  return (
    <div
      className={cn(
        "flex flex-col border border-border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {/* Editor Toolbar / Tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-2 py-1.5">
        <button
          type="button"
          onClick={() => handleTabSwitch("write")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            activeTab === "write"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent",
          )}
        >
          <Edit3 className="w-4 h-4" />
          Write
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch("preview")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            activeTab === "preview"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent",
          )}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      {activeTab === "write" && (
        <div className="flex items-center gap-1 border-b border-border bg-card px-2 py-1.5">
          <button
            type="button"
            onClick={() => insertText("**", "**")}
            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText("*", "*")}
            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            type="button"
            onClick={toggleBulletList}
            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText("`", "`")}
            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText("\n```\n", "\n```\n")}
            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
            title="Code Block"
          >
            <span className="text-xs font-mono font-bold">```</span>
          </button>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 relative min-h-[400px]">
        {activeTab === "write" ? (
          <textarea
            id="md-textarea"
            ref={textareaRef}
            defaultValue={value}
            placeholder={placeholder}
            className="absolute inset-0 w-full h-full p-4 bg-transparent resize-none focus:outline-none focus:ring-0 text-sm sm:text-base"
          />
        ) : (
          <div
            ref={previewRef}
            className={cn(
              "absolute inset-0 w-full h-full p-4 sm:p-6 overflow-y-auto max-w-none break-words text-[15px] leading-relaxed text-foreground/90 font-sans tracking-wide select-text",
              /* Obsidian-like typography rules */
              "[&_h1]:text-[1.75em] [&_h2]:text-[1.5em] [&_h3]:text-[1.25em] [&_h4]:text-[1.1em] [&_h5]:text-[1em] [&_h6]:text-[0.9em]",
              "[&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h4]:font-bold [&_h5]:font-bold [&_h6]:font-bold",
              "[&_h1]:mt-6 [&_h2]:mt-6 [&_h3]:mt-6 [&_h4]:mt-6 [&_h5]:mt-6 [&_h6]:mt-6",
              "[&_h1]:mb-4 [&_h2]:mb-4 [&_h3]:mb-4 [&_h4]:mb-4 [&_h5]:mb-4 [&_h6]:mb-4",
              "[&_p]:mb-4 [&_p]:mt-0",
              "[&_a]:text-primary [&_a]:hover:underline",
              "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ul]:mt-0 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_ol]:mt-0",
              "[&_li]:my-1",
              "[&_blockquote]:border-l-[3px] [&_blockquote]:border-primary/80 [&_blockquote]:pl-4 [&_blockquote]:py-0.5 [&_blockquote]:text-foreground/90 [&_blockquote]:mb-4 [&_blockquote]:bg-transparent",
              "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[14px] [&_code]:font-mono [&_code]:text-[#eb5757] dark:[&_code]:text-[#ff7b72]",
              "[&_pre_code]:!bg-transparent [&_pre_code]:!p-0 [&_pre_code]:!text-inherit [&_pre_code]:!font-mono",
              "[&_hr]:border-border [&_hr]:my-8",
              "[&_table]:w-full [&_table]:mb-4 [&_table]:text-left [&_th]:border-b [&_th]:border-border [&_th]:p-2 [&_th]:font-semibold [&_td]:border-b [&_td]:border-border/50 [&_td]:p-2",
              "[&_kbd]:bg-muted [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:rounded-md [&_kbd]:border [&_kbd]:border-b-2 [&_kbd]:border-border [&_kbd]:text-sm [&_kbd]:font-mono [&_kbd]:shadow-sm",
              "[&_details]:bg-muted/30 [&_details]:p-3 [&_details]:rounded-lg [&_details]:mb-4 [&_details]:border [&_details]:border-border/50 [&_summary]:cursor-pointer [&_summary]:font-semibold [&_summary]:select-none",
              "[&_section.footnotes]:mt-8 [&_section.footnotes]:pt-4 [&_section.footnotes]:border-t [&_section.footnotes]:border-border [&_section.footnotes]:text-sm [&_section.footnotes]:text-muted-foreground",
              "[&_.footnote-ref]:text-primary [&_.footnote-ref]:no-underline [&_.footnote-ref]:ml-0.5"
            )}
            dangerouslySetInnerHTML={{
              __html:
                html ||
                '<p class="text-muted-foreground italic">Nothing to preview...</p>',
            }}
          />
        )}
      </div>
    </div>
  );
}

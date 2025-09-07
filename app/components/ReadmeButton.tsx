"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  src?: string;   // 기본 /README.md
  label?: string; // 기본 Guide
};

export default function ReadmeButton({ src = "/README.md", label = "Guide" }: Props) {
  const [open, setOpen] = useState(false);
  const [md, setMd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || md || loading) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setMd(await res.text());
      } catch (e: any) {
        setErr(e?.message || "읽기 오류");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, md, loading, src]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0;
      setProgress(p);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  const title = md.match(/^#\s+(.+)$/m)?.[1] || "README";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 shadow-sm hover:bg-zinc-800"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H7c-1.657 0-3 1.343-3 3V6.5Z" />
          <path d="M7 20V6.5C7 5.672 7.672 5 8.5 5H20" />
        </svg>
        {label}
      </button>

      <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          className={`absolute right-0 top-0 h-full w-full max-w-3xl transform border-l border-zinc-800 bg-zinc-950 text-zinc-200 shadow-2xl shadow-black/50 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-5 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="truncate text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 active:scale-95"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="mt-2 h-[2px] w-full overflow-hidden rounded bg-zinc-800">
              <div className="h-full bg-zinc-600 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div ref={scrollRef} className="h-[calc(100%-58px)] overflow-y-auto px-6 py-6">
            {loading && (
              <div className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                불러오는 중…
              </div>
            )}
            {err && <div className="text-sm text-red-400">에러 {err}</div>}

            {!loading && !err && (
              <article
                className="prose prose-invert prose-zinc max-w-none
                           prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:tracking-tight
                           prose-p:text-zinc-300 prose-strong:text-zinc-100
                           prose-a:text-zinc-300 prose-a:underline-offset-4 prose-a:decoration-zinc-600 hover:prose-a:text-zinc-100
                           prose-code:rounded-md prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5
                           prose-pre:bg-[#0b0b0d] prose-pre:text-zinc-200 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: (props) => <img {...props} className="my-2 rounded-lg border border-zinc-800" />,
                    table: ({ children }) => (
                      <div className="my-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
                        <table className="min-w-full">{children}</table>
                      </div>
                    ),
                  }}
                >
                  {md}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

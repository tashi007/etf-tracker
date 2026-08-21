import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  className?: string;
}

export function InfoPopover({ text, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="About this card"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-600 dark:text-slate-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
      >
        i
      </button>
      {open && (
        <div
          role="note"
          className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {text}
        </div>
      )}
    </div>
  );
}

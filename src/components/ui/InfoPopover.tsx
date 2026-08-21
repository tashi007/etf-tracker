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
        className="flex h-5 w-5 items-center justify-center rounded-full border border-sky-300 text-[10px] font-bold leading-none text-sky-500 hover:border-sky-400 hover:text-sky-600 dark:border-sky-700 dark:text-sky-400 dark:hover:border-sky-500 dark:hover:text-sky-300"
      >
        i
      </button>
      {open && (
        <div
          role="note"
          className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900 shadow-lg dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
        >
          {text}
        </div>
      )}
    </div>
  );
}

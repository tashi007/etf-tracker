import { ReactNode } from "react";

interface Props {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, actions, children, className = "" }: Props) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 pt-4">
          {title && (
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
          )}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

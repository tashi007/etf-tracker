import { ReactNode } from "react";
import { InfoPopover } from "./InfoPopover";

interface Props {
  title?: string;
  actions?: ReactNode;
  info?: string;
  children: ReactNode;
  className?: string;
}

export function Card({
  title,
  actions,
  info,
  children,
  className = "",
}: Props) {
  return (
    <section
      className={`relative rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 pt-4">
          {title && (
            <h3 className="flex items-center gap-1.5 text-lg font-semibold text-slate-800 dark:text-slate-100">
              {title}
              {info && <InfoPopover text={info} />}
            </h3>
          )}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

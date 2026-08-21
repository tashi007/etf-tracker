import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const baseControl =
  "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  startAdornment?: string;
}

export function Input({ startAdornment, className = "", ...rest }: InputProps) {
  if (!startAdornment) {
    return <input className={`${baseControl} ${className}`} {...rest} />;
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        {startAdornment}
      </span>
      <input className={`${baseControl} pl-7 ${className}`} {...rest} />
    </div>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <select className={`${baseControl} ${className}`} {...rest}>
      {children}
    </select>
  );
}

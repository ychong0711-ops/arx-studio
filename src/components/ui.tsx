"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* ── Spinner ─────────────────────────────────────── */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

/* ── Button ──────────────────────────────────────── */
type BtnVariant = "primary" | "ghost" | "danger" | "outline";

const btnStyles: Record<BtnVariant, string> = {
  primary:
    "bg-accent text-ink-950 font-semibold hover:bg-[#63dbff] hover:shadow-glow border border-accent",
  ghost:
    "bg-transparent text-fog hover:text-snow hover:bg-ink-700/60 border border-transparent",
  outline:
    "bg-ink-800/70 text-mist border border-line-bright hover:border-accent/60 hover:text-snow",
  danger:
    "bg-transparent text-rose border border-rose/40 hover:bg-rose/10 hover:border-rose",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${btnStyles[variant]} ${className}`}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function IconButton({
  className = "",
  children,
  title,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      title={title}
      className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-fog transition-colors hover:bg-ink-700 hover:text-snow disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Form Fields ─────────────────────────────────── */
const fieldCls =
  "w-full rounded-lg border border-line bg-ink-900/80 px-3 py-2 text-sm text-snow placeholder:text-fog/40 outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-accent/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${fieldCls} min-h-[76px] resize-y ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${fieldCls} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8 ${props.className ?? ""}`}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[11px] font-semibold tracking-[0.14em] text-fog uppercase">
        {label}
        {hint && (
          <em className="font-mono text-[10px] font-normal normal-case text-fog/60 not-italic">
            {hint}
          </em>
        )}
      </span>
      {children}
    </label>
  );
}

/* ── Chip ────────────────────────────────────────── */
const chipColors: Record<string, string> = {
  cyan: "border-accent/40 bg-accent/10 text-accent",
  mint: "border-mint/40 bg-mint/10 text-mint",
  amber: "border-amberx/40 bg-amberx/10 text-amberx",
  violet: "border-violet/40 bg-violet/10 text-violet",
  rose: "border-rose/40 bg-rose/10 text-rose",
  gray: "border-line-bright bg-ink-700/60 text-fog",
};

export function Chip({
  color = "gray",
  children,
  className = "",
}: {
  color?: keyof typeof chipColors;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`chip inline-flex items-center gap-1 font-medium whitespace-nowrap uppercase ${chipColors[color]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ── Segmented control ───────────────────────────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-ink-900/80 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-md font-medium transition-all ${
            size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          } ${
            value === o.value
              ? "bg-ink-600 text-snow shadow-sm"
              : "text-fog hover:text-mist"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  sub,
  width = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  width?: "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  const widths = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            className={`panel relative w-full ${widths[width]} flex max-h-[88vh] flex-col overflow-hidden shadow-panel`}
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-snow">
                  {title}
                </h3>
                {sub && (
                  <div className="mt-0.5 text-xs text-fog">{sub}</div>
                )}
              </div>
              <IconButton onClick={onClose} title="닫기">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-line bg-ink-900/60 px-6 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Confirm Modal ───────────────────────────────── */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="md"
      title={
        <span className="flex items-center gap-2 text-rose">
          <AlertTriangle className="h-5 w-5" /> {title}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                onClose();
              }
            }}
          >
            삭제
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-mist">{message}</div>
    </Modal>
  );
}

/* ── Toast ───────────────────────────────────────── */
interface Toast {
  id: number;
  message: string;
  kind: "ok" | "error";
}
const ToastCtx = createContext<(message: string, kind?: "ok" | "error") => void>(
  () => {},
);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((message: string, kind: "ok" | "error" = "ok") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className={`panel pointer-events-auto px-4 py-2.5 text-sm font-medium shadow-panel ${
                t.kind === "error"
                  ? "border-rose/50 text-rose"
                  : "border-accent/40 text-accent"
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Empty State ─────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-bright px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink-800 text-fog">
        {icon}
      </div>
      <div className="font-display text-base font-semibold text-mist">
        {title}
      </div>
      {desc && <p className="max-w-sm text-xs leading-relaxed text-fog">{desc}</p>}
      {action}
    </div>
  );
}

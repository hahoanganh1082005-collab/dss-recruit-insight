import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Trash2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-md w-[calc(100vw-2.5rem)] pointer-events-none no-print"
      >
        {toasts.map((t) => {
          const styles = {
            success: {
              border: 'border-emerald-500/40 bg-white dark:bg-slate-900',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
            },
            error: {
              border: 'border-red-500/40 bg-white dark:bg-slate-900',
              icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />,
            },
            warning: {
              border: 'border-amber-500/40 bg-white dark:bg-slate-900',
              icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />,
            },
            info: {
              border: 'border-blue-500/40 bg-white dark:bg-slate-900',
              icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />,
            },
          }[t.type];

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg ${styles.border} transition-all duration-200`}
            >
              <div className="mt-0.5">{styles.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Đóng thông báo"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận xóa',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="ds-card max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={onCancel} disabled={loading} className="ds-btn-secondary">
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const LeadTierBadge: React.FC<{ tier: string; score?: number }> = ({ tier, score }) => {
  const map: Record<string, string> = {
    Hot: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
    Warm: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    Cold: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  const cls = map[tier] || map.Warm;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${cls}`}>
      <span>{tier}</span>
      {score !== undefined && <span className="font-mono font-bold">({score})</span>}
    </span>
  );
};

export const ChurnRiskBadge: React.FC<{ level: string; score?: number }> = ({ level, score }) => {
  const map: Record<string, { cls: string; label: string }> = {
    Cao: {
      cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
      label: 'Nguy cơ Cao',
    },
    TrungBinh: {
      cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
      label: 'Cảnh báo',
    },
    Thap: {
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      label: 'An toàn',
    },
  };
  const item = map[level] || map.Thap;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${item.cls}`}>
      <span>{item.label}</span>
      {score !== undefined && <span className="font-mono font-bold">{score}%</span>}
    </span>
  );
};


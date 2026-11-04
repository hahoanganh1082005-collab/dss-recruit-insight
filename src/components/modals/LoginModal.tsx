import React, { useState } from 'react';
import { ShieldCheck, X, Lock, Mail, AlertCircle, Check } from 'lucide-react';
import { UserSession } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession) => void;
  currentUser: UserSession | null;
}

const DEMO_ACCOUNTS = [
  {
    label: 'Ban Giám Đốc (CCO / Executive)',
    desc: 'Toàn quyền xem báo cáo chiến lược, duyệt chiết khấu > 12% & quản trị toàn diện',
    email: 'cco@recruitinsight.vn',
    roleTag: 'Executive',
  },
  {
    label: 'Đỗ Minh Tuấn (Sales Manager)',
    desc: 'Quản lý đội ngũ Sales, phê duyệt hợp đồng chiết khấu vượt trần 12%',
    email: 'tuan.do@recruitinsight.vn',
    roleTag: 'SalesManager',
  },
  {
    label: 'Vũ Hoàng Yến (Key Account Sales)',
    desc: 'Khai thác Lead đa sàn, tư vấn gói dịch vụ & khởi tạo hợp đồng tiêu chuẩn',
    email: 'yen.vu@recruitinsight.vn',
    roleTag: 'Sales',
  },
  {
    label: 'Phạm Thu Thảo (Customer Success)',
    desc: 'Theo dõi sử dụng hạn mức, ghi nhận CSAT & xử lý cảnh báo Churn sớm',
    email: 'thao.pham@recruitinsight.vn',
    roleTag: 'CustomerSuccess',
  },
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [email, setEmail] = useState('cco@recruitinsight.vn');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const loginWithCredentials = async (targetEmail: string, targetPassword: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại');
      } else {
        onLoginSuccess(data.user);
        onClose();
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rbac-modal-title"
    >
      <div className="ds-card w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-800 dark:bg-blue-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="rbac-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Phân quyền Truy cập Hệ thống (RBAC)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chọn nhanh tài khoản vai trò để kiểm thử quy tắc nghiệp vụ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ đăng nhập"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Role Switcher */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chuyển đổi nhanh 4 Vai trò Nghiệp vụ (1-Click)
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const isCurrent = currentUser?.email === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onClick={() => loginWithCredentials(acc.email, 'password123')}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isCurrent
                        ? 'bg-blue-50/90 dark:bg-blue-500/15 border-blue-600 dark:border-blue-500'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {acc.label}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {acc.roleTag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{acc.desc}</p>
                    </div>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-700 text-white text-[11px] font-semibold shrink-0">
                        <Check className="w-3 h-3" aria-hidden="true" /> Đang dùng
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Login Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loginWithCredentials(email, password);
            }}
            className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hoặc đăng nhập bằng Tài khoản Nội bộ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email nhân sự
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ds-input pl-9!"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu (Mặc định: password123)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ds-input pl-9!"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="ds-btn-secondary">
                Đóng
              </button>
              <button type="submit" disabled={loading} className="ds-btn-primary">
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

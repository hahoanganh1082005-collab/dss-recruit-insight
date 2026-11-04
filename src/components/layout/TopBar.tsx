import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Sparkles,
  Building2,
  ArrowUpRight,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { EnterpriseItem, UserSession } from '../../types';
import { NavTab } from './Sidebar';

interface TopBarProps {
  activeTab: NavTab;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
  onOpenCopilot: (tab?: 'chat' | 'settings') => void;
  onSelectEnterprise360: (maDN: string) => void;
  onOpenLogin: () => void;
  user: UserSession | null;
  enterprises: EnterpriseItem[];
}

const TAB_META: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Bảng Điều Hành Chiến Lược (Executive Dashboard)',
    subtitle: 'Giám sát thời gian thực North Star KPIs, Phễu B2B, Cảnh báo Rời bỏ & Thị trường',
  },
  crm: {
    title: 'Quản Trị Khách Hàng B2B & Hợp Đồng 360° (Full CRUD)',
    subtitle: 'Thêm, sửa, xóa Doanh nghiệp, Hợp đồng, Nhu cầu Tuyển dụng, CSKH & Gói Dịch vụ',
  },
  market: {
    title: 'Khai Phá Dữ Liệu Thị Trường (job_market.bak)',
    subtitle: 'Phân tích trực tiếp 21.827 tin tuyển dụng đa sàn & săn khách hàng doanh nghiệp B2B',
  },
  dss: {
    title: 'Trung Tâm Mô Hình Định Lượng DSS',
    subtitle: 'Chấm điểm AHP Lead Scoring, Khuyến nghị Gói, Dự báo Churn & Mô phỏng Độ co giãn Giá',
  },
  reports: {
    title: 'Hệ Thống Báo Cáo Quản Trị Định Kỳ (RP-01 — RP-05)',
    subtitle: 'Tổng hợp số liệu trực tiếp từ CSDL, hỗ trợ xuất CSV chuẩn UTF-8 & in ấn PDF',
  },
  sql: {
    title: 'Trình Thực Thi SQL OLAP & AI Text-to-SQL',
    subtitle: '18 mẫu truy vấn phân tích chuyên sâu trên 10 bảng CSDL thực nghiệm',
  },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
  onOpenCopilot,
  onSelectEnterprise360,
  onOpenLogin,
  user,
  enterprises,
}) => {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matches = query.trim()
    ? enterprises
        .filter((e) => {
          const q = query.toLowerCase();
          return (
            e.TenDoanhNghiep.toLowerCase().includes(q) ||
            e.MaDN.toLowerCase().includes(q) ||
            e.DiaBan.toLowerCase().includes(q) ||
            e.TenNganh.toLowerCase().includes(q)
          );
        })
        .slice(0, 7)
    : [];

  const meta = TAB_META[activeTab];

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-7 flex items-center justify-between gap-3 no-print">
      {/* Left: Mobile Menu + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Mở menu điều hướng"
          className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {meta.title}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick 360 Search + AI Copilot + Theme + Role */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Global Quick Enterprise Lookup */}
        <div ref={searchRef} className="relative hidden sm:block w-52 xl:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onFocus={() => setDropdownOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            placeholder="Tra cứu nhanh Hồ sơ 360° DN..."
            aria-label="Tra cứu nhanh doanh nghiệp"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />

          {dropdownOpen && query.trim().length > 0 && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Kết quả tra cứu Hồ sơ Doanh nghiệp 360° ({matches.length})
              </div>
              {matches.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  Không tìm thấy doanh nghiệp khớp với "{query}"
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {matches.map((m) => (
                    <button
                      key={m.MaDN}
                      type="button"
                      onClick={() => {
                        onSelectEnterprise360(m.MaDN);
                        setDropdownOpen(false);
                        setQuery('');
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/70 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {m.TenDoanhNghiep}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <span className="font-mono">{m.MaDN}</span> • {m.TenNganh} • {m.DiaBan}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400">
                          {m.DiemTiemNang_LeadScore}đ
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Copilot Trigger */}
        <button
          type="button"
          onClick={() => onOpenCopilot('chat')}
          className="ds-btn-accent py-1.5! px-3! text-xs!"
          title="Mở Trợ lý Chiến lược Gemini AI"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span className="hidden md:inline">AI Copilot</span>
        </button>

        {/* AI Settings Shortcut */}
        <button
          type="button"
          onClick={() => onOpenCopilot('settings')}
          aria-label="Cấu hình Gemini API Key"
          title="Cấu hình Gemini API Key & Model"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Light / Dark Mode Switcher */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Role Quick Chip */}
        <button
          type="button"
          onClick={onOpenLogin}
          title="Chuyển đổi quyền truy cập RBAC"
          className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <span>{user ? user.vaiTro : 'Khách'}</span>
        </button>
      </div>
    </header>
  );
};


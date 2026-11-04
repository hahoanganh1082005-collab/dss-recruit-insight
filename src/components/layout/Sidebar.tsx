import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Cpu,
  Globe2,
  FileBarChart2,
  Database,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
} from 'lucide-react';
import { UserSession } from '../../types';

export type NavTab = 'dashboard' | 'crm' | 'market' | 'dss' | 'reports' | 'sql';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  user: UserSession | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenCopilot: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  marketCount: number;
  enterpriseCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenLogin,
  onLogout,
  onOpenCopilot,
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
  marketCount,
  enterpriseCount,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    shortDesc: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Tổng quan Điều hành',
      shortDesc: 'North Star KPIs & Phễu',
      icon: LayoutDashboard,
    },
    {
      id: 'crm',
      label: 'Quản trị CRM 360°',
      shortDesc: 'DN, Hợp đồng, Nhu cầu, CSKH',
      icon: Building2,
      badge: enterpriseCount > 0 ? String(enterpriseCount) : undefined,
    },
    {
      id: 'market',
      label: 'Khai phá Thị trường',
      shortDesc: 'CSDL job_market.bak thực tế',
      icon: Globe2,
      badge: marketCount > 0 ? `${(marketCount / 1000).toFixed(1)}k` : '21.8k',
    },
    {
      id: 'dss',
      label: 'Mô hình Định lượng DSS',
      shortDesc: 'AHP, Định giá, Churn, What-If',
      icon: Cpu,
      badge: '4 Core',
    },
    {
      id: 'reports',
      label: 'Báo cáo Quản trị',
      shortDesc: 'Chuẩn RP-01 đến RP-05',
      icon: FileBarChart2,
    },
    {
      id: 'sql',
      label: 'Truy vấn SQL & AI',
      shortDesc: '18 mẫu OLAP & Text-to-SQL',
      icon: Database,
      badge: '18',
    },
  ];

  const roleLabels: Record<string, string> = {
    Executive: 'Ban Giám đốc',
    SalesManager: 'Trưởng phòng Sales',
    Sales: 'Chuyên viên B2B Sales',
    CustomerSuccess: 'Chuyên viên CSKH',
  };

  const handleSelect = (id: NavTab) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-800 dark:bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                DSS Recruit-Insight
              </div>
              <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400 truncate">
                B2B Intelligence Suite
              </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!collapsed && (
          <div className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Phân hệ Chức năng
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              title={collapsed ? `${item.label} — ${item.shortDesc}` : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                active
                  ? 'bg-blue-800 text-white dark:bg-blue-600 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  active
                    ? 'text-white'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400'
                }`}
                aria-hidden="true"
              />
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{item.label}</div>
                    <div
                      className={`text-[11px] truncate ${
                        active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.shortDesc}
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold shrink-0 ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {/* Gemini AI Copilot CTA inside Sidebar */}
        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenCopilot();
            }}
            title="Trợ lý Chiến lược Gemini AI"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-300/80 dark:border-amber-500/30 text-amber-950 dark:text-amber-200 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <div className="min-w-0 text-left flex-1">
                <div className="text-xs font-bold">Gemini AI Copilot</div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300/80 truncate">
                  Cố vấn chiến lược & SQL
                </div>
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Database Sync Badge & User Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 truncate">
                CSDL Đồng bộ Trực tiếp
              </div>
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
                {marketCount.toLocaleString('vi-VN')} tin job_market.bak
              </div>
            </div>
          </div>
        )}

        {user ? (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenLogin}
                title="Đổi vai trò tài khoản"
                className="w-8 h-8 rounded-full bg-blue-800 dark:bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0"
              >
                {user.hoTen.charAt(0)}
              </button>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.hoTen}</div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium truncate">
                    {roleLabels[user.vaiTro] || user.vaiTro}
                  </div>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-colors"
                >
                  Đổi vai trò
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" aria-hidden="true" /> Thoát
                </button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={onOpenLogin} className="ds-btn-primary w-full text-xs py-2">
            <LogIn className="w-4 h-4" aria-hidden="true" />
            {!collapsed && <span>Đăng nhập RBAC</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 z-30 transition-[width] duration-200 no-print ${
          collapsed ? 'w-20' : 'w-68'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
};

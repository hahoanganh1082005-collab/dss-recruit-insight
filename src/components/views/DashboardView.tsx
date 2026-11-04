import React, { useEffect, useState } from 'react';
import {
  Building2,
  FileCheck2,
  TrendingUp,
  Flame,
  AlertTriangle,
  Star,
  Globe2,
  ArrowRight,
  Sparkles,
  Award,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { DashboardKPIs } from '../../types';
import { LeadTierBadge, ChurnRiskBadge } from '../ui/UIPrimitives';
import { NavTab } from '../layout/Sidebar';

interface DashboardViewProps {
  refreshKey: number;
  onSelectEnterprise360: (maDN: string) => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenCopilot: () => void;
}

const FUNNEL_COLORS = ['#1e40af', '#2563eb', '#3b82f6', '#0284c7', '#059669', '#d97706'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  refreshKey,
  onSelectEnterprise360,
  onNavigateTab,
  onOpenCopilot,
}) => {
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetch('/api/dashboard/kpis')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="ds-card h-28 animate-pulse bg-slate-100 dark:bg-slate-800/60"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ds-card h-80 animate-pulse bg-slate-100 dark:bg-slate-800/60" />
          <div className="ds-card h-80 animate-pulse bg-slate-100 dark:bg-slate-800/60" />
        </div>
      </div>
    );
  }

  const { kpis, funnel, revenueIndustry, salesLeaderboard, urgentChurnList, topHotLeads } = data;

  const kpiCards = [
    {
      label: 'Tổng Doanh nghiệp CRM',
      value: kpis.tongKhachHang.toLocaleString('vi-VN'),
      sub: 'Khách hàng B2B định danh',
      icon: Building2,
      tone: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30',
      onClick: () => onNavigateTab('crm'),
    },
    {
      label: 'Hợp đồng Hiệu lực',
      value: kpis.hopDongHieuLuc.toLocaleString('vi-VN'),
      sub: 'Đang khai thác dịch vụ',
      icon: FileCheck2,
      tone: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30',
      onClick: () => onNavigateTab('crm'),
    },
    {
      label: 'Doanh thu Thực thu',
      value: `${kpis.tongDoanhThu.toLocaleString('vi-VN')} Tr`,
      sub: 'Lũy kế VNĐ đã ký',
      icon: TrendingUp,
      tone: 'text-blue-800 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30',
      onClick: () => onNavigateTab('reports'),
    },
    {
      label: 'Hot Leads (≥ 70 điểm)',
      value: kpis.hotLeads.toLocaleString('vi-VN'),
      sub: 'Ưu tiên liên hệ trong 2h',
      icon: Flame,
      tone: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30',
      onClick: () => onNavigateTab('crm'),
    },
    {
      label: 'Báo động Rời bỏ (Churn)',
      value: kpis.churnAlerts.toLocaleString('vi-VN'),
      sub: 'Nguy cơ ≥ 65% cần cứu vãn',
      icon: AlertTriangle,
      tone: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30',
      onClick: () => onNavigateTab('dss'),
    },
    {
      label: 'Chỉ số Hài lòng CSAT',
      value: `${kpis.csatTrungBinh} / 5.0`,
      sub: ' Trung bình toàn hệ thống',
      icon: Star,
      tone: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30',
      onClick: () => onNavigateTab('crm'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live Market Intelligence Banner (job_market.bak) */}
      <div className="ds-card p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white border-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Globe2 className="w-6 h-6 text-amber-300" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400 text-slate-950">
                LIVE DATA • job_market.bak
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Kho Dữ Liệu Thị Trường: {kpis.tongTinThiTruong.toLocaleString('vi-VN')} Tin Tuyển Dụng Thực Tế
              </h2>
            </div>
            <p className="text-xs text-blue-100 mt-1">
              Phát hiện <strong className="text-amber-300 font-mono">{kpis.doanhNghiepDaSan.toLocaleString('vi-VN')}</strong> doanh nghiệp đang chi ngân sách đăng tin trên ≥ 2 sàn đối thủ (TopCV, VietnamWorks, CareerViet, JobsGO, Vieclam24h, CareerLink).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('market')}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Săn Lead Đa Sàn</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenCopilot}
            className="px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-xs inline-flex items-center gap-1.5 border border-white/20 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
            <span>Hỏi AI Chiến lược</span>
          </button>
        </div>
      </div>

      {/* 6 North Star KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={c.onClick}
              className="ds-card-interactive p-4 text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-snug">
                  {c.label}
                </span>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${c.tone}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {c.value}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{c.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Recharts Row: Pipeline Funnel & Industry Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Funnel Chart */}
        <div className="lg:col-span-6 ds-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Phễu Chuyển Đổi Bán Hàng B2B (Conversion Pipeline)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Số lượng doanh nghiệp & tổng ngân sách dự kiến ở từng giai đoạn
              </p>
            </div>
            <button
              type="button"
              onClick={loadData}
              aria-label="Làm mới biểu đồ"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  dataKey="GiaiDoanPhanPhieu"
                  type="category"
                  width={95}
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                />
                <Tooltip
                  formatter={(value: any, name: string) =>
                    name === 'count' ? [`${value} Doanh nghiệp`, 'Số lượng'] : [`${value} Tr VNĐ`, 'Ngân sách']
                  }
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {funnel.map((_, index) => (
                    <Cell key={index} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Industry Revenue Chart */}
        <div className="lg:col-span-6 ds-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cơ Cấu Doanh Thu Thực Thu Theo Ngành Nghề
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đơn vị: Triệu VNĐ — Đối chiếu độ khó tuyển dụng từng ngành
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Xem báo cáo chi tiết
            </button>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueIndustry} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                <XAxis
                  dataKey="TenNganh"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-16}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} Triệu VNĐ`, 'Doanh thu']}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="doanhThu" fill="#1e40af" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actionable Operational Row: Hot Leads + Churn Early Warning + Leaderboard */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Top Hot Leads Action Table */}
        <div className="xl:col-span-5 ds-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Hot Leads Cần Chốt Ngay (AHP ≥ 70)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhấp vào doanh nghiệp để mở Hồ sơ 360° & soạn Email bằng AI
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('crm')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Mở CRM
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
            {topHotLeads?.map((lead) => (
              <button
                key={lead.MaDN}
                type="button"
                onClick={() => onSelectEnterprise360(lead.MaDN)}
                className="w-full py-3 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {lead.TenDoanhNghiep}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {lead.TenNganh} • Ngân sách: <strong className="text-slate-800 dark:text-slate-200">{lead.NganSachDuKien} Tr</strong> • Đề xuất: {lead.GoiDichVuKhuyenNghi}
                  </div>
                </div>
                <div className="shrink-0">
                  <LeadTierBadge tier={lead.PhanHangLead} score={lead.DiemTiemNang_LeadScore} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Churn Early Warning List */}
        <div className="xl:col-span-4 ds-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cảnh Báo Sớm Rủi Ro Rời Bỏ (Churn Alert)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Khách hàng có hạn mức tồn đọng hoặc CSAT suy giảm
              </p>
            </div>
          </div>

          <div className="space-y-2.5 flex-1">
            {urgentChurnList.map((item) => (
              <button
                key={item.MaDN}
                type="button"
                onClick={() => onSelectEnterprise360(item.MaDN)}
                className="w-full p-3 rounded-xl border border-red-200/80 dark:border-red-500/25 bg-red-50/40 dark:bg-red-500/5 hover:bg-red-50 dark:hover:bg-red-500/10 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {item.TenDoanhNghiep}
                  </span>
                  <ChurnRiskBadge level={item.MucDoNguyCoChurn} score={item.DiemNguyCoRoiBo_ChurnScore} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-mono">
                  <span>CSAT: {item.csatTB}/5</span>
                  <span>•</span>
                  <span>Khiếu nại: {item.soKhieuNai}</span>
                  <span>•</span>
                  <span>Hạn mức: {item.tyLeSuDung}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sales Leaderboard */}
        <div className="xl:col-span-3 ds-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3.5">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bảng Xếp Hạng KPI Sales
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ hoàn thành chỉ tiêu</p>
            </div>
          </div>

          <div className="space-y-3.5 flex-1">
            {salesLeaderboard.slice(0, 5).map((nv, i) => (
              <div key={nv.MaNV} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    #{i + 1} {nv.HoTen}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {nv.doanhThu} / {nv.ChiTieuDoanhSo} Tr ({nv.kpiPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      nv.kpiPct >= 100
                        ? 'bg-emerald-600'
                        : nv.kpiPct >= 60
                        ? 'bg-blue-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, nv.kpiPct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

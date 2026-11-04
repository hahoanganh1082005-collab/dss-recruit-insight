import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe2,
  Building2,
  FileSearch,
  Search,
  UserPlus,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Briefcase,
  Coins,
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
import {
  MarketOverviewData,
  MultiPlatformEnterprise,
  MarketPostingItem,
  UserSession,
} from '../../types';
import { ConfirmDialog, useToast } from '../ui/UIPrimitives';
import { exportToCsv } from '../../utils/exportCsv';

interface MarketMiningViewProps {
  user: UserSession | null;
  onLeadConverted: () => void;
  onSelectEnterprise360: (maDN: string) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  TopCV: '#059669',
  JobsGO: '#2563eb',
  Vieclam24h: '#7c3aed',
  CareerViet: '#0284c7',
  VietnamWorks: '#d97706',
  CareerLink: '#dc2626',
};

const PLATFORMS = ['TopCV', 'JobsGO', 'Vieclam24h', 'CareerViet', 'VietnamWorks', 'CareerLink'];

export const MarketMiningView: React.FC<MarketMiningViewProps> = ({
  user,
  onLeadConverted,
  onSelectEnterprise360,
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'hunting' | 'postings'>('hunting');
  const [overview, setOverview] = useState<MarketOverviewData | null>(null);

  // Hunting state
  const [hirers, setHirers] = useState<MultiPlatformEnterprise[]>([]);
  const [loadingHirers, setLoadingHirers] = useState(true);
  const [minPlatforms, setMinPlatforms] = useState<number>(2);
  const [huntPlatform, setHuntPlatform] = useState<string>('');
  const [huntSearch, setHuntSearch] = useState<string>('');
  const [convertingKey, setConvertingKey] = useState<string | null>(null);

  // Postings Explorer state
  const [postingsData, setPostingsData] = useState<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    rows: MarketPostingItem[];
  }>({ total: 0, page: 1, pageSize: 20, totalPages: 1, rows: [] });
  const [loadingPostings, setLoadingPostings] = useState(false);
  const [postSearch, setPostSearch] = useState('');
  const [postPlatform, setPostPlatform] = useState('');
  const [postProvince, setPostProvince] = useState('');
  const [page, setPage] = useState(1);

  // Modals for Job Postings (Detail, Create/Edit, Delete, Reimport)
  const [detailJob, setDetailJob] = useState<MarketPostingItem | null>(null);
  const [jobModal, setJobModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: any;
  }>({ open: false, mode: 'create', data: {} });
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [reimporting, setReimporting] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/market/overview');
      if (res.ok) setOverview(await res.json());
    } catch {
      // ignore
    }
  }, []);

  const loadHirers = useCallback(async () => {
    setLoadingHirers(true);
    try {
      const params = new URLSearchParams({
        minPlatforms: String(minPlatforms),
        limit: '80',
      });
      if (huntPlatform) params.set('platform', huntPlatform);
      if (huntSearch.trim()) params.set('search', huntSearch.trim());
      const res = await fetch(`/api/market/top-hirers?${params.toString()}`);
      if (res.ok) setHirers(await res.json());
    } finally {
      setLoadingHirers(false);
    }
  }, [minPlatforms, huntPlatform, huntSearch]);

  const loadPostings = useCallback(async () => {
    setLoadingPostings(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (postSearch.trim()) params.set('search', postSearch.trim());
      if (postPlatform) params.set('nguon', postPlatform);
      if (postProvince) params.set('tinh', postProvince);
      const res = await fetch(`/api/market/postings?${params.toString()}`);
      if (res.ok) setPostingsData(await res.json());
    } finally {
      setLoadingPostings(false);
    }
  }, [page, postSearch, postPlatform, postProvince]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (mode === 'hunting') loadHirers();
  }, [mode, loadHirers]);

  useEffect(() => {
    if (mode === 'postings') loadPostings();
  }, [mode, loadPostings]);

  const handleConvertToLead = async (ent: MultiPlatformEnterprise) => {
    setConvertingKey(ent.ten_dn_chuan_hoa);
    try {
      const res = await fetch('/api/market/convert-to-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nha_tuyen_dung: ent.nha_tuyen_dung,
          ten_dn_chuan_hoa: ent.ten_dn_chuan_hoa,
          linh_vuc: ent.linh_vuc,
          dia_ban: ent.dia_ban,
          tong_so_tin: ent.tong_so_tin,
          maNV: user?.maNV || 'NV01',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Đã chuyển đổi thành Lead CRM!', data.message);
        loadHirers();
        onLeadConverted();
      } else if (res.status === 409 && data.existing?.MaDN) {
        showToast('info', 'Doanh nghiệp đã có trong CRM', `Mã hồ sơ: ${data.existing.MaDN}`);
        onSelectEnterprise360(data.existing.MaDN);
      } else {
        showToast('error', 'Lỗi chuyển đổi Lead', data.error);
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    } finally {
      setConvertingKey(null);
    }
  };

  const openJobDetail = async (id: string) => {
    const res = await fetch(`/api/market/postings/${id}`);
    if (res.ok) setDetailJob(await res.json());
  };

  const openEditJob = async (id: string) => {
    const res = await fetch(`/api/market/postings/${id}`);
    if (res.ok) {
      const full = await res.json();
      setJobModal({ open: true, mode: 'edit', data: full });
    }
  };

  const saveJobPosting = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mode: m, data } = jobModal;
    const url = m === 'create' ? '/api/market/postings' : `/api/market/postings/${data.id}`;
    const method = m === 'create' ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('error', 'Không thể lưu tin tuyển dụng', json.error);
      return;
    }
    showToast('success', m === 'create' ? 'Đã thêm tin tuyển dụng mới' : 'Đã cập nhật tin tuyển dụng', json.message);
    setJobModal({ open: false, mode: 'create', data: {} });
    loadPostings();
    loadOverview();
    onLeadConverted();
  };

  const confirmDeleteJob = async () => {
    if (!deleteJobId) return;
    const res = await fetch(`/api/market/postings/${deleteJobId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('success', 'Đã xóa tin tuyển dụng khỏi kho thị trường');
      setDeleteJobId(null);
      loadPostings();
      loadOverview();
      onLeadConverted();
    }
  };

  const handleReimportBak = async () => {
    setReimporting(true);
    try {
      const res = await fetch('/api/market/reimport-bak', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Đồng bộ job_market.bak hoàn tất', data.message);
        loadOverview();
        loadHirers();
        loadPostings();
        onLeadConverted();
      } else {
        showToast('error', 'Đồng bộ thất bại', data.error);
      }
    } catch {
      showToast('error', 'Lỗi khi gọi bộ nạp job_market.bak');
    } finally {
      setReimporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview KPIs + Sync Banner */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Stats & Controls */}
          <div className="lg:col-span-5 ds-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                  <Globe2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {overview.mode}
                </span>
                <button
                  type="button"
                  onClick={handleReimportBak}
                  disabled={reimporting}
                  title="Đọc lại tệp nhị phân job_market.bak gốc"
                  className="ds-btn-secondary py-1! px-2.5! text-xs!"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reimporting ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>{reimporting ? 'Đang nạp...' : 'Đồng bộ job_market.bak'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500">Tổng tin thực tế</div>
                  <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    {overview.stats.tongTin.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500">Doanh nghiệp chuẩn hóa</div>
                  <div className="text-2xl font-mono font-bold text-blue-800 dark:text-blue-400 mt-0.5 tabular-nums">
                    {overview.stats.tongDN.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25">
                  <div className="text-xs text-amber-900 dark:text-amber-300">DN đăng ≥ 2 sàn</div>
                  <div className="text-xl font-mono font-bold text-amber-800 dark:text-amber-300 mt-0.5 tabular-nums">
                    {overview.stats.doanhNghiepDaSan.toLocaleString('vi-VN')} DN
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
                  <div className="text-xs text-emerald-900 dark:text-emerald-300">Lương TB công bố</div>
                  <div className="text-xl font-mono font-bold text-emerald-800 dark:text-emerald-300 mt-0.5 tabular-nums">
                    {overview.stats.luongTrungBinhThiTruong} Tr
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6-Platform Share Chart */}
          <div className="lg:col-span-7 ds-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thị Phần 6 Sàn Tuyển Dụng Trích Xuất Từ `job_market.bak`
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  So sánh quy mô tin đăng & mức lương trung bình từng nền tảng
                </p>
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.platforms} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="nguon" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any, _name: string, props: any) => [
                      `${Number(val).toLocaleString('vi-VN')} tin (${props.payload.pct}%) — Lương TB: ${
                        props.payload.avgSalary || 'N/A'
                      } Tr`,
                      props.payload.nguon,
                    ]}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                    {overview.platforms.map((entry) => (
                      <Cell key={entry.nguon} fill={PLATFORM_COLORS[entry.nguon] || '#1e40af'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Mode Switcher Bar */}
      <div className="ds-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('hunting')}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors ${
              mode === 'hunting'
                ? 'bg-blue-800 text-white dark:bg-blue-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" aria-hidden="true" />
            <span>Săn Khách Hàng Đa Sàn (B2B Lead Hunting)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('postings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors ${
              mode === 'postings'
                ? 'bg-blue-800 text-white dark:bg-blue-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <FileSearch className="w-4 h-4" aria-hidden="true" />
            <span>Quản lý Kho {overview?.stats.tongTin.toLocaleString('vi-VN') || '21.827'} Tin Tuyển Dụng (CRUD)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'hunting' ? (
            <button
              type="button"
              onClick={() => exportToCsv('Market_MultiPlatform_Leads.csv', hirers)}
              className="ds-btn-secondary text-xs!"
            >
              <Download className="w-4 h-4" aria-hidden="true" /> Xuất danh sách Lead
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => exportToCsv('JobMarket_Postings_Page.csv', postingsData.rows)}
                className="ds-btn-secondary text-xs!"
              >
                <Download className="w-4 h-4" aria-hidden="true" /> Xuất CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  setJobModal({
                    open: true,
                    mode: 'create',
                    data: {
                      nguon: 'TopCV',
                      tinh_thanh: 'Hà Nội',
                      linh_vuc_nganh_nghe: 'CNTT & Phần mềm',
                      nha_tuyen_dung: '',
                      cong_viec: '',
                      chuc_vu: 'Nhân viên',
                      so_luong: '3',
                      muc_luong: '20 - 30 triệu',
                      muc_luong_tb_trieu: 25,
                      kinh_nghiem: '2 năm',
                      han_nop_ho_so: '31/12/2026',
                      ky_nang: '',
                      mo_ta_cong_viec: '',
                      quyen_loi: '',
                    },
                  })
                }
                className="ds-btn-primary text-xs!"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> Thêm Tin Tuyển Dụng
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODE 1: MULTI-PLATFORM LEAD HUNTING */}
      {mode === 'hunting' && (
        <div className="space-y-4">
          {/* Hunting Filters */}
          <div className="ds-card p-3.5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={huntSearch}
                onChange={(e) => setHuntSearch(e.target.value)}
                placeholder="Tìm tên tập đoàn, ngân hàng, công ty, ngành nghề hoặc địa bàn..."
                className="ds-input pl-9!"
              />
            </div>

            <select
              value={minPlatforms}
              onChange={(e) => setMinPlatforms(Number(e.target.value))}
              aria-label="Số sàn tối thiểu"
              className="ds-input w-auto!"
            >
              <option value={3}>Đăng từ ≥ 3 sàn trở lên (VIP)</option>
              <option value={2}>Đăng từ ≥ 2 sàn trở lên (Đa kênh)</option>
              <option value={1}>Tất cả nhà tuyển dụng (≥ 1 sàn)</option>
            </select>

            <select
              value={huntPlatform}
              onChange={(e) => setHuntPlatform(e.target.value)}
              aria-label="Sàn xuất hiện"
              className="ds-input w-auto!"
            >
              <option value="">Tất cả 6 sàn tuyển dụng</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  Có mặt trên {p}
                </option>
              ))}
            </select>
          </div>

          {loadingHirers ? (
            <div className="ds-card p-12 text-center text-sm text-slate-500">
              Đang tổng hợp các nhà tuyển dụng đa sàn từ `job_market.bak`...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {hirers.map((ent) => {
                const isConverting = convertingKey === ent.ten_dn_chuan_hoa;
                return (
                  <div key={ent.ten_dn_chuan_hoa} className="ds-card p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {ent.nha_tuyen_dung}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> {ent.linh_vuc}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {ent.dia_ban}
                            </span>
                            {ent.luong_tb_trieu && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                                <Coins className="w-3.5 h-3.5" aria-hidden="true" /> TB {ent.luong_tb_trieu} Tr
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-mono font-extrabold text-blue-800 dark:text-blue-400 tabular-nums">
                            {ent.tong_so_tin} tin
                          </div>
                          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            Phủ sóng {ent.so_san} sàn
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {ent.cac_san.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded text-[11px] font-bold text-white"
                            style={{ backgroundColor: PLATFORM_COLORS[s] || '#334155' }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        <strong>Vị trí tiêu biểu:</strong> {ent.top_vi_tri}
                      </p>

                      <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/70 dark:border-blue-500/20 text-xs text-slate-700 dark:text-slate-200">
                        <strong className="text-blue-800 dark:text-blue-300">Kịch bản DSS đề xuất:</strong>{' '}
                        {ent.de_xuat_tiep_can}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setPostSearch(ent.nha_tuyen_dung.slice(0, 28));
                          setPage(1);
                          setMode('postings');
                        }}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400"
                      >
                        Xem {ent.tong_so_tin} tin đăng gốc →
                      </button>

                      {ent.inCrmMaDN ? (
                        <button
                          type="button"
                          onClick={() => onSelectEnterprise360(ent.inCrmMaDN!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>Đã trong CRM ({ent.inCrmMaDN}) • Mở 360°</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isConverting}
                          onClick={() => handleConvertToLead(ent)}
                          className="ds-btn-primary py-1.5! px-3! text-xs!"
                        >
                          <UserPlus className="w-4 h-4" aria-hidden="true" />
                          <span>{isConverting ? 'Đang nạp...' : 'Chuyển thành Lead CRM'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: 21,827 REAL JOB POSTINGS CRUD EXPLORER */}
      {mode === 'postings' && (
        <div className="space-y-4">
          {/* Postings Search & Filter Bar */}
          <div className="ds-card p-3.5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={postSearch}
                onChange={(e) => {
                  setPostSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo chức danh công việc, kỹ năng, công ty tuyển dụng..."
                className="ds-input pl-9!"
              />
            </div>

            <select
              value={postPlatform}
              onChange={(e) => {
                setPostPlatform(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo sàn tuyển dụng"
              className="ds-input w-auto!"
            >
              <option value="">Tất cả 6 sàn ({overview?.stats.tongTin.toLocaleString('vi-VN')} tin)</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={postProvince}
              onChange={(e) => {
                setPostProvince(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo tỉnh thành"
              className="ds-input w-auto!"
            >
              <option value="">Mọi tỉnh / thành phố</option>
              {['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Bình Dương', 'Đồng Nai', 'Hải Phòng', 'Bắc Ninh', 'Cần Thơ'].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="ds-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/50 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Tìm thấy <strong className="font-mono text-blue-800 dark:text-blue-400">{postingsData.total.toLocaleString('vi-VN')}</strong> tin tuyển dụng khớp điều kiện
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="font-mono font-semibold">
                  Trang {postingsData.page} / {postingsData.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= postingsData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {loadingPostings ? (
              <div className="p-12 text-center text-sm text-slate-500">Đang truy vấn dữ liệu tin đăng...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Nguồn sàn</th>
                      <th className="py-3 px-4">Chức danh & Nhà tuyển dụng</th>
                      <th className="py-3 px-4">Tỉnh/Thành</th>
                      <th className="py-3 px-4">Mức lương</th>
                      <th className="py-3 px-4">Kinh nghiệm</th>
                      <th className="py-3 px-4 text-right">Thao tác CRUD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {postingsData.rows.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="px-2.5 py-0.5 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: PLATFORM_COLORS[job.nguon] || '#334155' }}
                          >
                            {job.nguon}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <button
                            type="button"
                            onClick={() => openJobDetail(job.id)}
                            className="font-semibold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 text-left line-clamp-1"
                          >
                            {job.cong_viec}
                          </button>
                          <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {job.nha_tuyen_dung} • {job.linh_vuc_nganh_nghe}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                          {job.tinh_thanh}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {job.muc_luong}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {job.kinh_nghiem}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openJobDetail(job.id)}
                              title="Xem chi tiết JD"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditJob(job.id)}
                              title="Chỉnh sửa tin đăng"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteJobId(job.id)}
                              title="Xóa tin đăng"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JOB DETAIL 22-ATTRIBUTE MODAL */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="ds-card w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50 dark:bg-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: PLATFORM_COLORS[detailJob.nguon] || '#1e40af' }}
                  >
                    {detailJob.nguon}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{detailJob.id}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {detailJob.cong_viec}
                </h3>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
                  {detailJob.nha_tuyen_dung}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailJob(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                  <div className="text-slate-500">Mức lương</div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{detailJob.muc_luong}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                  <div className="text-slate-500">Địa bàn</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{detailJob.tinh_thanh}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                  <div className="text-slate-500">Kinh nghiệm</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{detailJob.kinh_nghiem}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                  <div className="text-slate-500">Hạn nộp</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{detailJob.han_nop_ho_so}</div>
                </div>
              </div>

              {detailJob.ky_nang && detailJob.ky_nang !== 'Không đề cập' && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">Kỹ năng & Chuyên môn</h4>
                  <p className="text-xs bg-blue-50/60 dark:bg-slate-800 p-3 rounded-lg">{detailJob.ky_nang}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">Mô tả công việc</h4>
                <div className="text-xs leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  {detailJob.mo_ta_cong_viec || 'Không có mô tả chi tiết.'}
                </div>
              </div>

              {detailJob.quyen_loi && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">Quyền lợi ứng viên</h4>
                  <div className="text-xs leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    {detailJob.quyen_loi}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              {detailJob.url && detailJob.url.startsWith('http') ? (
                <a
                  href={detailJob.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" /> Mở liên kết tin gốc trên {detailJob.nguon}
                </a>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => setDetailJob(null)} className="ds-btn-secondary text-xs!">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT JOB POSTING MODAL */}
      {jobModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={saveJobPosting} className="ds-card w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {jobModal.mode === 'create'
                  ? 'Thêm Tin Tuyển Dụng Thị Trường Mới'
                  : `Chỉnh Sửa Tin Tuyển Dụng (${jobModal.data.id})`}
              </h3>
              <button
                type="button"
                onClick={() => setJobModal({ open: false, mode: 'create', data: {} })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chức danh công việc *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobModal.data.cong_viec || ''}
                    onChange={(e) =>
                      setJobModal({ ...jobModal, data: { ...jobModal.data, cong_viec: e.target.value } })
                    }
                    className="ds-input"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Nhà tuyển dụng *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobModal.data.nha_tuyen_dung || ''}
                    onChange={(e) =>
                      setJobModal({ ...jobModal, data: { ...jobModal.data, nha_tuyen_dung: e.target.value } })
                    }
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nguồn sàn tuyển dụng
                  </label>
                  <select
                    value={jobModal.data.nguon || 'TopCV'}
                    onChange={(e) => setJobModal({ ...jobModal, data: { ...jobModal.data, nguon: e.target.value } })}
                    className="ds-input"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <input
                    type="text"
                    value={jobModal.data.tinh_thanh || ''}
                    onChange={(e) =>
                      setJobModal({ ...jobModal, data: { ...jobModal.data, tinh_thanh: e.target.value } })
                    }
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chuỗi mức lương hiển thị
                  </label>
                  <input
                    type="text"
                    value={jobModal.data.muc_luong || ''}
                    onChange={(e) =>
                      setJobModal({ ...jobModal, data: { ...jobModal.data, muc_luong: e.target.value } })
                    }
                    placeholder="VD: 20 - 30 triệu"
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lương quy đổi TB (Triệu VNĐ)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={jobModal.data.muc_luong_tb_trieu ?? ''}
                    onChange={(e) =>
                      setJobModal({ ...jobModal, data: { ...jobModal.data, muc_luong_tb_trieu: e.target.value } })
                    }
                    className="ds-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lĩnh vực ngành nghề
                  </label>
                  <input
                    type="text"
                    value={jobModal.data.linh_vuc_nganh_nghe || ''}
                    onChange={(e) =>
                      setJobModal({ ...jobModal, data: { ...jobModal.data, linh_vuc_nganh_nghe: e.target.value } })
                    }
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kinh nghiệm yêu cầu
                  </label>
                  <input
                    type="text"
                    value={jobModal.data.kinh_nghiem || ''}
                    onChange={(e) =>
                      setJobModal({ ...jobModal, data: { ...jobModal.data, kinh_nghiem: e.target.value } })
                    }
                    className="ds-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả công việc
                </label>
                <textarea
                  rows={3}
                  value={jobModal.data.mo_ta_cong_viec || ''}
                  onChange={(e) =>
                    setJobModal({ ...jobModal, data: { ...jobModal.data, mo_ta_cong_viec: e.target.value } })
                  }
                  className="ds-input"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setJobModal({ open: false, mode: 'create', data: {} })}
                className="ds-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="ds-btn-primary">
                Lưu Tin Tuyển Dụng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Job Confirm */}
      <ConfirmDialog
        open={Boolean(deleteJobId)}
        title="Xóa tin tuyển dụng này?"
        description="Tin đăng sẽ bị xóa khỏi bảng TinTuyenDungThiTruong. Bạn luôn có thể đồng bộ lại từ tệp job_market.bak bất cứ lúc nào."
        onConfirm={confirmDeleteJob}
        onCancel={() => setDeleteJobId(null)}
      />
    </div>
  );
};

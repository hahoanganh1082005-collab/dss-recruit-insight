import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Building2,
  Briefcase,
  FileText,
  MessageSquareHeart,
  Globe2,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Users,
  Wallet,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { DemandItem, InteractionItem, UserSession } from '../../types';
import { LeadTierBadge, ChurnRiskBadge, useToast } from '../ui/UIPrimitives';

interface Enterprise360ModalProps {
  maDN: string | null;
  onClose: () => void;
  user: UserSession | null;
  onDataMutated: () => void;
}

export const Enterprise360Modal: React.FC<Enterprise360ModalProps> = ({
  maDN,
  onClose,
  user,
  onDataMutated,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'demands' | 'contracts' | 'cskh' | 'market'>('overview');

  // AI Insight state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ answer: string; model: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick Add Demand state
  const [newDemand, setNewDemand] = useState({
    ViTriCanTuyen: '',
    SoLuongCanTuyen: 3,
    MucLuongTrungBinh: 22,
    DoCapBach: 'Gap',
  });

  // Quick Add Interaction state
  const [newInteraction, setNewInteraction] = useState({
    KenhTuongTac: 'Điện thoại',
    DiemHaiLongCSAT: 5,
    CoKhieuNai: false,
    NoiDung: '',
    PhanHoiKhachHang: '',
  });

  const fetchDetail = useCallback(async () => {
    if (!maDN) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/enterprises/${maDN}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch {
      showToast('error', 'Không tải được hồ sơ 360°');
    } finally {
      setLoading(false);
    }
  }, [maDN, showToast]);

  useEffect(() => {
    if (maDN) {
      setAiResult(null);
      setActiveSubTab('overview');
      fetchDetail();
    } else {
      setDetail(null);
    }
  }, [maDN, fetchDetail]);

  if (!maDN) return null;

  const generateAIStrategy = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/enterprise-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maDN }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi gọi Gemini AI');
      setAiResult(data);
      showToast('success', 'Gemini AI đã hoàn tất phân tích 360°');
    } catch (err: any) {
      showToast('error', 'Không thể tạo phân tích AI', err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDemand.ViTriCanTuyen.trim()) return;
    try {
      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          MaDN: maDN,
          ...newDemand,
          actorMaNV: user?.maNV || 'NV01',
        }),
      });
      if (res.ok) {
        setNewDemand({ ViTriCanTuyen: '', SoLuongCanTuyen: 3, MucLuongTrungBinh: 22, DoCapBach: 'Gap' });
        showToast('success', 'Đã thêm nhu cầu tuyển dụng & tính lại điểm Lead Score');
        fetchDetail();
        onDataMutated();
      }
    } catch {
      showToast('error', 'Lỗi khi thêm nhu cầu tuyển dụng');
    }
  };

  const handleDeleteDemand = async (id: string) => {
    const res = await fetch(`/api/demands/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('info', 'Đã xóa vị trí tuyển dụng');
      fetchDetail();
      onDataMutated();
    }
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInteraction.NoiDung.trim()) return;
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        MaDN: maDN,
        MaNV: user?.maNV || 'NV05',
        ...newInteraction,
      }),
    });
    if (res.ok) {
      setNewInteraction({
        KenhTuongTac: 'Điện thoại',
        DiemHaiLongCSAT: 5,
        CoKhieuNai: false,
        NoiDung: '',
        PhanHoiKhachHang: '',
      });
      showToast('success', 'Đã ghi nhận CSKH & cập nhật chỉ số Churn Score');
      fetchDetail();
      onDataMutated();
    }
  };

  const dn = detail?.enterprise;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 no-print"
      role="dialog"
      aria-modal="true"
    >
      <div className="ds-card w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex items-start justify-between gap-4 shrink-0">
          {loading && !dn ? (
            <div className="flex items-center gap-2.5 py-2 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" aria-hidden="true" />
              <span>Đang tải Hồ sơ Doanh nghiệp 360° ({maDN})...</span>
            </div>
          ) : dn ? (
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-800 dark:bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Building2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                    {dn.MaDN}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {dn.TenDoanhNghiep}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    {dn.TenNganh} (Hệ số khó: {dn.HeSoKhoTuyen})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    {dn.DiaBan}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    {Number(dn.QuyMoNhanSu).toLocaleString('vi-VN')} nhân sự
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    Ngân sách: <strong className="text-slate-900 dark:text-white">{dn.NganSachDuKien} Tr</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-600">Không tìm thấy thông tin doanh nghiệp.</div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hồ sơ 360"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Sub Navigation Tabs */}
        {dn && (
          <>
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1 overflow-x-auto shrink-0">
              {[
                { id: 'overview', label: 'Tổng quan & AI Chiến lược', icon: Sparkles },
                { id: 'demands', label: `Nhu cầu Tuyển dụng (${detail.demands?.length || 0})`, icon: Briefcase },
                { id: 'contracts', label: `Hợp đồng (${detail.contracts?.length || 0})`, icon: FileText },
                { id: 'cskh', label: `Lịch sử CSKH (${detail.interactions?.length || 0})`, icon: MessageSquareHeart },
                { id: 'market', label: `Tin job_market.bak (${detail.marketPostings?.length || 0})`, icon: Globe2 },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeSubTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveSubTab(t.id as any)}
                    className={`px-3.5 py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      active
                        ? 'border-blue-700 text-blue-800 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {activeSubTab === 'overview' && (
                <>
                  {/* DSS Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Điểm Tiềm năng AHP
                      </div>
                      <div className="mt-1.5">
                        <LeadTierBadge
                          tier={dn.PhanHangLead || 'Warm'}
                          score={dn.DiemTiemNang_LeadScore}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Dự báo Rời bỏ (Churn)
                      </div>
                      <div className="mt-1.5">
                        <ChurnRiskBadge
                          level={dn.MucDoNguyCoChurn || 'Thap'}
                          score={dn.DiemNguyCoRoiBo_ChurnScore}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        CLV Dự báo (3 năm)
                      </div>
                      <div className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">
                        {dn.DuBaoGiaTriVongDoi_CLV || 0} Tr
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Giai đoạn & Phụ trách
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                        {dn.GiaiDoanPhanPhieu}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{dn.SalesPhuTrach}</div>
                    </div>
                  </div>

                  {/* Algorithmic Recommendation Box */}
                  <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                        Khuyến nghị Hệ thống DSS (Độ tin cậy: {Math.round((dn.DoTinCay_Confidence || 0.88) * 100)}%)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-800 text-white text-xs font-semibold">
                        Gói đề xuất: {dn.GoiDichVuKhuyenNghi}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {dn.ChienLuocHanhDong || 'Tiếp cận tư vấn giải pháp tuyển dụng theo nhu cầu mở mới.'}
                    </p>
                  </div>

                  {/* Gemini AI Deep Strategy & Cold Email Pitch */}
                  <div className="p-5 rounded-xl border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Cố vấn Chiến lược & Email Chào hàng Cá nhân hóa (Gemini AI)
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Tổng hợp toàn bộ nhu cầu tuyển dụng, lịch sử CSAT và điểm DSS để soạn kịch bản B2B
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={generateAIStrategy}
                        disabled={aiLoading}
                        className="ds-btn-accent text-xs!"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span>Đang phân tích...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                            <span>{aiResult ? 'Tạo lại kịch bản AI' : 'Sinh kịch bản & Email Pitch'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {aiResult && (
                      <div className="mt-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="font-mono">Model: {aiResult.model}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(aiResult.answer);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold hover:underline"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Đã sao chép
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Sao chép nội dung
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {aiResult.answer}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeSubTab === 'demands' && (
                <div className="space-y-4">
                  {/* Inline Quick Add Demand */}
                  <form
                    onSubmit={handleAddDemand}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Vị trí cần tuyển mới
                      </label>
                      <input
                        type="text"
                        required
                        value={newDemand.ViTriCanTuyen}
                        onChange={(e) => setNewDemand({ ...newDemand, ViTriCanTuyen: e.target.value })}
                        placeholder="VD: Senior Backend Engineer..."
                        className="ds-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Số lượng
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newDemand.SoLuongCanTuyen}
                        onChange={(e) => setNewDemand({ ...newDemand, SoLuongCanTuyen: Number(e.target.value) })}
                        className="ds-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Lương (Tr)
                      </label>
                      <input
                        type="number"
                        min={5}
                        step="0.5"
                        value={newDemand.MucLuongTrungBinh}
                        onChange={(e) => setNewDemand({ ...newDemand, MucLuongTrungBinh: Number(e.target.value) })}
                        className="ds-input"
                      />
                    </div>
                    <div className="sm:col-span-3 flex gap-2">
                      <select
                        value={newDemand.DoCapBach}
                        onChange={(e) => setNewDemand({ ...newDemand, DoCapBach: e.target.value })}
                        aria-label="Độ cấp bách"
                        className="ds-input"
                      >
                        <option value="RatGap">Rất gấp</option>
                        <option value="Gap">Gấp</option>
                        <option value="BinhThuong">Bình thường</option>
                        <option value="DaiHan">Dài hạn</option>
                      </select>
                      <button type="submit" className="ds-btn-primary shrink-0 px-3!" title="Thêm nhu cầu">
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </form>

                  {/* Demands Table */}
                  {detail.demands?.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Chưa có yêu cầu tuyển dụng nào được ghi nhận cho doanh nghiệp này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3.5">Mã</th>
                            <th className="py-2.5 px-3.5">Vị trí tuyển dụng</th>
                            <th className="py-2.5 px-3.5 text-center">SL</th>
                            <th className="py-2.5 px-3.5 text-right">Lương TB</th>
                            <th className="py-2.5 px-3.5">Độ cấp bách</th>
                            <th className="py-2.5 px-3.5">Hạn chót</th>
                            <th className="py-2.5 px-3.5 text-right">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {detail.demands.map((d: DemandItem) => (
                            <tr key={d.MaNhuCau} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3.5 font-mono text-xs text-slate-500">{d.MaNhuCau}</td>
                              <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">
                                {d.ViTriCanTuyen}
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-mono">{d.SoLuongCanTuyen}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                {d.MucLuongTrungBinh} Tr
                              </td>
                              <td className="py-2.5 px-3.5 text-xs">{d.DoCapBach}</td>
                              <td className="py-2.5 px-3.5 font-mono text-xs text-slate-500">{d.HanChotTuyen}</td>
                              <td className="py-2.5 px-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDemand(d.MaNhuCau)}
                                  aria-label={`Xóa nhu cầu ${d.ViTriCanTuyen}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'contracts' && (
                <div className="space-y-3">
                  {detail.contracts?.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Doanh nghiệp chưa ký hợp đồng dịch vụ nào (Đang trong phễu bán hàng).
                    </div>
                  ) : (
                    detail.contracts.map((c: any) => {
                      const utilPct = Math.round((Number(c.TyLeSuDungHanMuc) || 0) * 100);
                      return (
                        <div
                          key={c.MaHopDong}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 mr-2">
                                {c.MaHopDong}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">{c.TenGoi}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                {c.SoTienThanhToan} Tr VNĐ
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                                {c.TrangThaiHopDong}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <div>Ngày ký: <span className="font-mono">{c.NgayKy}</span></div>
                            <div>Hết hạn: <span className="font-mono">{c.NgayHetHan}</span></div>
                            <div>Tin đã đăng: <span className="font-mono font-semibold">{c.SoTinDaDang ?? 0}/{c.HanMucTin}</span></div>
                            <div>CV đã mở: <span className="font-mono font-semibold">{c.SoCVDaMo ?? 0}/{c.HanMucCV}</span></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-600 dark:text-slate-400">Tỷ lệ tiêu hao hạn mức dịch vụ</span>
                              <span className="font-mono font-bold">{utilPct}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  utilPct >= 85
                                    ? 'bg-emerald-600'
                                    : utilPct <= 30
                                    ? 'bg-red-500'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, utilPct)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeSubTab === 'cskh' && (
                <div className="space-y-4">
                  <form
                    onSubmit={handleAddInteraction}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Kênh chăm sóc
                        </label>
                        <select
                          value={newInteraction.KenhTuongTac}
                          onChange={(e) => setNewInteraction({ ...newInteraction, KenhTuongTac: e.target.value })}
                          className="ds-input"
                        >
                          <option value="Điện thoại">Điện thoại</option>
                          <option value="Email">Email</option>
                          <option value="Họp trực tuyến">Họp trực tuyến</option>
                          <option value="Gặp trực tiếp">Gặp trực tiếp</option>
                          <option value="Zalo B2B">Zalo B2B</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Điểm hài lòng CSAT (1 - 5)
                        </label>
                        <select
                          value={newInteraction.DiemHaiLongCSAT}
                          onChange={(e) =>
                            setNewInteraction({ ...newInteraction, DiemHaiLongCSAT: Number(e.target.value) })
                          }
                          className="ds-input"
                        >
                          {[5, 4, 3, 2, 1].map((s) => (
                            <option key={s} value={s}>
                              {s} sao
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newInteraction.CoKhieuNai}
                            onChange={(e) =>
                              setNewInteraction({ ...newInteraction, CoKhieuNai: e.target.checked })
                            }
                            className="w-4 h-4 rounded accent-red-600"
                          />
                          <span>Khách hàng có khiếu nại</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newInteraction.NoiDung}
                        onChange={(e) => setNewInteraction({ ...newInteraction, NoiDung: e.target.value })}
                        placeholder="Nhập nội dung trao đổi chăm sóc khách hàng..."
                        className="ds-input flex-1"
                      />
                      <button type="submit" className="ds-btn-primary shrink-0">
                        <Plus className="w-4 h-4" aria-hidden="true" /> Lưu CSKH
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {detail.interactions?.map((it: InteractionItem) => (
                      <div
                        key={it.MaTuongTac}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-slate-500">{it.NgayTuongTac}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                              {it.KenhTuongTac}
                            </span>
                            <span className="text-slate-500">bởi {it.NhanVienChamSoc}</span>
                            {Number(it.CoKhieuNai) === 1 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-semibold">
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Khiếu nại
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{it.NoiDung}</p>
                        </div>
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                          {it.DiemHaiLongCSAT}/5
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubTab === 'market' && (
                <div className="space-y-3">
                  {detail.marketPostings?.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Không phát hiện tin đăng trùng khớp tên doanh nghiệp trong kho 21.827 tin `job_market.bak`.
                    </div>
                  ) : (
                    detail.marketPostings.map((mp: any) => (
                      <div
                        key={mp.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-400 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                              {mp.nguon}
                            </span>
                            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {mp.cong_viec}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {mp.tinh_thanh} • Lương: <strong className="text-emerald-700 dark:text-emerald-400">{mp.muc_luong}</strong> • Hạn: {mp.han_nop_ho_so}
                          </div>
                        </div>
                        {mp.url && mp.url.startsWith('http') && (
                          <a
                            href={mp.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 shrink-0"
                            title="Mở tin gốc"
                          >
                            <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  calculateLeadScore,
  recommendPackage,
  calculateChurnScore,
  simulateWhatIf,
} from '../../services/dssAlgorithms';
import { EnterpriseItem } from '../../types';
import { LeadTierBadge, ChurnRiskBadge } from '../ui/UIPrimitives';

interface DSSEngineViewProps {
  enterprises?: EnterpriseItem[];
}

export const DSSEngineView: React.FC<DSSEngineViewProps> = ({ enterprises = [] }) => {
  const [activeModel, setActiveModel] = useState<'dss01' | 'dss02' | 'dss03' | 'dss04'>('dss01');

  // DSS-01 Inputs
  const [selectedEntId, setSelectedEntId] = useState('');
  const [qm, setQm] = useState(2500);
  const [ns, setNs] = useState(210);
  const [sl, setSl] = useState(18);
  const [luong, setLuong] = useState(32);
  const [kho, setKho] = useState(1.9);
  const [cb, setCb] = useState(4);

  // DSS-02 Inputs
  const [recNganh, setRecNganh] = useState('NN01');
  const [recBudget, setRecBudget] = useState(52);
  const [recPositions, setRecPositions] = useState(14);
  const [recUrgency, setRecUrgency] = useState(4);
  const [recKho, setRecKho] = useState(1.9);

  // DSS-03 Inputs
  const [util, setUtil] = useState(0.22);
  const [csat, setCsat] = useState(2.4);
  const [khieuNai, setKhieuNai] = useState(2);
  const [daysLeft, setDaysLeft] = useState(18);
  const [interactions, setInteractions] = useState(2);

  // DSS-04 Inputs
  const [discountPct, setDiscountPct] = useState(10.0);
  const [mktChangePct, setMktChangePct] = useState(15);
  const [demandShiftPct, setDemandShiftPct] = useState(5);

  useEffect(() => {
    if (!selectedEntId) return;
    const ent = enterprises.find((e) => e.MaDN === selectedEntId);
    if (ent) {
      setQm(ent.QuyMoNhanSu || 500);
      setNs(ent.NganSachDuKien || 60);
      setRecNganh(ent.MaNganh || 'NN01');
      setRecBudget(ent.NganSachDuKien || 60);
    }
  }, [selectedEntId, enterprises]);

  const leadRes = calculateLeadScore({ qm, ns, sl, luong, kho, cb });
  const recRes = recommendPackage({
    maNganh: recNganh,
    nganSach: recBudget,
    soLuongTuyen: recPositions,
    doCapBach: recUrgency,
    heSoKho: recKho,
  });
  const churnRes = calculateChurnScore({
    util,
    csat,
    khieu_nai: khieuNai,
    days_left: daysLeft,
    interactions,
  });
  const whatIfRes = simulateWhatIf({
    discountPct,
    marketingBudgetChangePct: mktChangePct,
    marketDemandShiftPct: demandShiftPct,
  });
  const baseSim = simulateWhatIf({
    discountPct: 8.0,
    marketingBudgetChangePct: 0,
    marketDemandShiftPct: 0,
  });

  const radarData = [
    { subject: 'Ngân sách (30%)', pct: Math.round((leadRes.breakdown.budgetScore / 30) * 100) },
    { subject: 'Quy mô NS (25%)', pct: Math.round((leadRes.breakdown.scaleScore / 25) * 100) },
    { subject: 'Cấp bách (20%)', pct: Math.round((leadRes.breakdown.urgencyScore / 20) * 100) },
    { subject: 'Số vị trí (10%)', pct: Math.round((leadRes.breakdown.positionsScore / 10) * 100) },
    { subject: 'Mức lương (8%)', pct: Math.round((leadRes.breakdown.salaryScore / 8) * 100) },
    { subject: 'Độ khó (7%)', pct: Math.round((leadRes.breakdown.difficultyScore / 7) * 100) },
  ];

  const churnChartData = [
    { factor: 'Tồn hạn mức', diem: churnRes.factors.utilPenalty },
    { factor: 'CSAT thấp', diem: churnRes.factors.csatPenalty },
    { factor: 'Khiếu nại', diem: churnRes.factors.complaintPenalty },
    { factor: 'Sắp hết hạn', diem: churnRes.factors.expiryPenalty },
    { factor: 'Thưởng CSKH', diem: -churnRes.factors.interactionBonus },
  ];

  const whatIfChartData = [
    {
      chiTieu: 'Doanh thu Gộp',
      HienTai: baseSim.grossRevenue,
      MoPhong: whatIfRes.grossRevenue,
    },
    {
      chiTieu: 'Doanh thu Thuần',
      HienTai: baseSim.netRevenue,
      MoPhong: whatIfRes.netRevenue,
    },
    {
      chiTieu: 'Tổng Chi phí',
      HienTai: baseSim.estimatedCost,
      MoPhong: whatIfRes.estimatedCost,
    },
    {
      chiTieu: 'Lợi nhuận Ròng',
      HienTai: baseSim.netProfit,
      MoPhong: whatIfRes.netProfit,
    },
  ];

  const models = [
    { id: 'dss01', code: 'DSS-01', title: 'Chấm điểm AHP Lead Scoring', icon: Target },
    { id: 'dss02', code: 'DSS-02', title: 'Khuyến nghị Gói & Định giá', icon: Sparkles },
    { id: 'dss03', code: 'DSS-03', title: 'Dự báo Rủi ro Rời bỏ (Churn)', icon: ShieldAlert },
    { id: 'dss04', code: 'DSS-04', title: 'Mô phỏng Chiến lược What-If', icon: TrendingUp },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Model Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {models.map((m) => {
          const Icon = m.icon;
          const active = activeModel === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModel(m.id)}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                active
                  ? 'bg-blue-800 text-white border-blue-800 dark:bg-blue-600 dark:border-blue-500 shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-50 text-blue-800 dark:bg-slate-800 dark:text-blue-400'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div
                  className={`text-[11px] font-mono font-bold ${
                    active ? 'text-blue-200' : 'text-blue-700 dark:text-blue-400'
                  }`}
                >
                  {m.code}
                </div>
                <div className={`text-sm font-bold mt-0.5 ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {m.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          DSS-01: AHP MULTI-CRITERIA LEAD SCORING
      ========================================================= */}
      {activeModel === 'dss01' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 ds-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tham số Đầu vào 6 Trọng số AHP
                </h3>
                <p className="text-xs text-slate-500">Điều chỉnh trực tiếp hoặc nạp từ hồ sơ CRM</p>
              </div>
            </div>

            {enterprises.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                  Nạp nhanh tham số từ Doanh nghiệp CRM:
                </label>
                <select
                  value={selectedEntId}
                  onChange={(e) => setSelectedEntId(e.target.value)}
                  className="ds-input text-xs"
                >
                  <option value="">-- Tự thiết lập tham số giả lập --</option>
                  {enterprises.slice(0, 30).map((e) => (
                    <option key={e.MaDN} value={e.MaDN}>
                      {e.MaDN} — {e.TenDoanhNghiep} (NS: {e.NganSachDuKien} Tr)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {[
              {
                label: 'Ngân sách tuyển dụng năm (W = 30%)',
                val: `${ns} Triệu`,
                min: 5,
                max: 350,
                step: 5,
                cur: ns,
                set: setNs,
              },
              {
                label: 'Quy mô nhân sự doanh nghiệp (W = 25%)',
                val: `${qm.toLocaleString('vi-VN')} người`,
                min: 20,
                max: 20000,
                step: 50,
                cur: qm,
                set: setQm,
              },
              {
                label: 'Số lượng vị trí mở tuyển (W = 10%)',
                val: `${sl} vị trí`,
                min: 1,
                max: 50,
                step: 1,
                cur: sl,
                set: setSl,
              },
              {
                label: 'Mức lương bình quân vị trí (W = 8%)',
                val: `${luong} Triệu`,
                min: 7,
                max: 80,
                step: 1,
                cur: luong,
                set: setLuong,
              },
              {
                label: 'Hệ số độ khó tuyển ngành (W = 7%)',
                val: `${kho.toFixed(1)}`,
                min: 1.0,
                max: 2.5,
                step: 0.1,
                cur: kho,
                set: setKho,
              },
            ].map((s, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-400">{s.val}</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.cur}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Mức độ cấp bách tuyển dụng (W = 20%)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: 1, l: 'Dài hạn' },
                  { v: 2, l: 'Thường' },
                  { v: 3, l: 'Gấp' },
                  { v: 4, l: 'Rất gấp' },
                ].map((u) => (
                  <button
                    key={u.v}
                    type="button"
                    onClick={() => setCb(u.v)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      cb === u.v
                        ? 'bg-blue-800 text-white border-blue-800 dark:bg-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {u.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 ds-card p-6 flex flex-col justify-between space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Kết quả Chấm điểm Đa tiêu chí AHP
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-mono font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {leadRes.score}
                  </span>
                  <span className="text-sm text-slate-500">/ 100 điểm</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                <LeadTierBadge tier={leadRes.tier} score={leadRes.score} />
                <div className="text-xs text-slate-500 font-mono">
                  Độ tin cậy: {Math.round(leadRes.confidence * 100)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(148,163,184,0.35)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="% Đạt chuẩn"
                      dataKey="pct"
                      stroke="#1e40af"
                      fill="#3b82f6"
                      fillOpacity={0.45}
                    />
                    <Tooltip formatter={(v: any) => [`${v}% tối đa`, 'Mức đáp ứng']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Ngân sách (Tối đa 30đ)', val: leadRes.breakdown.budgetScore, max: 30 },
                  { label: 'Quy mô Logarit (Tối đa 25đ)', val: leadRes.breakdown.scaleScore, max: 25 },
                  { label: 'Độ cấp bách (Tối đa 20đ)', val: leadRes.breakdown.urgencyScore, max: 20 },
                  { label: 'Số vị trí tuyển (Tối đa 10đ)', val: leadRes.breakdown.positionsScore, max: 10 },
                  { label: 'Mức lương (Tối đa 8đ)', val: leadRes.breakdown.salaryScore, max: 8 },
                  { label: 'Độ khó ngành (Tối đa 7đ)', val: leadRes.breakdown.difficultyScore, max: 7 },
                ].map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{b.label}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {b.val} / {b.max}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-700 dark:bg-blue-500 rounded-full"
                        style={{ width: `${(b.val / b.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25">
              <div className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">
                Khuyến nghị Hành động Phân bổ Sales:
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200">{leadRes.recommendation}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DSS-02: PACKAGE RECOMMENDER & PRICING
      ========================================================= */}
      {activeModel === 'dss02' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 ds-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
              Hồ sơ Nhu cầu & Ngân sách Khách hàng
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngành nghề tuyển dụng
              </label>
              <select
                value={recNganh}
                onChange={(e) => {
                  const v = e.target.value;
                  setRecNganh(v);
                  const khoMap: Record<string, number> = {
                    NN01: 1.9,
                    NN02: 1.5,
                    NN03: 1.1,
                    NN04: 1.4,
                    NN05: 1.2,
                  };
                  setRecKho(khoMap[v] || 1.3);
                }}
                className="ds-input"
              >
                <option value="NN01">CNTT & Phần mềm (Hệ số khó: 1.9)</option>
                <option value="NN02">Ngân hàng & Tài chính (Hệ số khó: 1.5)</option>
                <option value="NN04">Bất động sản & Sản xuất (Hệ số khó: 1.4)</option>
                <option value="NN05">Nhà hàng - Khách sạn (Hệ số khó: 1.2)</option>
                <option value="NN03">Bán lẻ & Thương mại (Hệ số khó: 1.1)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Ngân sách chi trả dự kiến</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{recBudget} Triệu</span>
              </div>
              <input
                type="range"
                min={5}
                max={220}
                step={5}
                value={recBudget}
                onChange={(e) => setRecBudget(Number(e.target.value))}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Tổng chỉ tiêu vị trí cần tuyển</span>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{recPositions} nhân sự</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={recPositions}
                onChange={(e) => setRecPositions(Number(e.target.value))}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Độ cấp bách chiến dịch
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 2, l: 'Tiêu chuẩn' },
                  { v: 4, l: 'Tuyển Gấp / Headhunt' },
                ].map((u) => (
                  <button
                    key={u.v}
                    type="button"
                    onClick={() => setRecUrgency(u.v)}
                    className={`py-2 rounded-lg text-xs font-semibold border ${
                      recUrgency === u.v
                        ? 'bg-blue-800 text-white border-blue-800 dark:bg-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {u.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="ds-card p-6 border-2 border-blue-700 dark:border-blue-500">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Gói Tối Ưu Nhất — Độ Tương Thích {recRes.fitScore}%
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                    {recRes.bestPackage.tenGoi} ({recRes.bestPackage.maGoi})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{recRes.bestPackage.moTa}</p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 line-through font-mono">
                    Niêm yết: {recRes.bestPackage.giaNiemYet} Tr
                  </div>
                  <div className="text-3xl font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                    {recRes.finalPrice} Tr
                  </div>
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Đề xuất chiết khấu: -{recRes.suggestedDiscount}%
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-sm text-slate-700 dark:text-slate-200">
                {recRes.reason}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recRes.allPackages.slice(1, 4).map((pkg) => (
                <div key={pkg.maGoi} className="ds-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="font-mono font-bold text-slate-500">{pkg.maGoi}</span>
                      <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                        Fit {pkg.fitScore}%
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white mt-1">{pkg.tenGoi}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">CK -{pkg.suggestedDiscount}%</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{pkg.finalPrice} Tr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DSS-03: CHURN RISK EARLY WARNING
      ========================================================= */}
      {activeModel === 'dss03' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 ds-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
              Chỉ số Sức khỏe Khách hàng (Customer Health)
            </h3>

            {[
              {
                label: 'Tỷ lệ sử dụng hạn mức gói',
                val: `${Math.round(util * 100)}%`,
                min: 0,
                max: 1,
                step: 0.05,
                cur: util,
                set: setUtil,
              },
              {
                label: 'Điểm hài lòng CSAT trung bình',
                val: `${csat.toFixed(1)} / 5.0`,
                min: 1,
                max: 5,
                step: 0.2,
                cur: csat,
                set: setCsat,
              },
              {
                label: 'Số lần phát sinh khiếu nại',
                val: `${khieuNai} lần`,
                min: 0,
                max: 5,
                step: 1,
                cur: khieuNai,
                set: setKhieuNai,
              },
              {
                label: 'Số ngày còn lại trước khi hết hạn HĐ',
                val: `${daysLeft} ngày`,
                min: 0,
                max: 180,
                step: 5,
                cur: daysLeft,
                set: setDaysLeft,
              },
              {
                label: 'Số lượt CSKH chủ động hỗ trợ',
                val: `${interactions} lượt`,
                min: 0,
                max: 15,
                step: 1,
                cur: interactions,
                set: setInteractions,
              },
            ].map((s, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-400">{s.val}</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.cur}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 ds-card p-6 flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Xác suất Rời bỏ Dịch vụ Dự báo
                </div>
                <div className="text-4xl font-mono font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                  {churnRes.score}%
                </div>
              </div>
              <ChurnRiskBadge level={churnRes.level} score={churnRes.score} />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="factor" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(v: any) => [`${v} điểm rủi ro`, 'Tác động']} />
                  <Bar dataKey="diem" fill="#dc2626" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                churnRes.level === 'Cao'
                  ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
                  : churnRes.level === 'TrungBinh'
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
                  : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
              }`}
            >
              <div className="text-xs font-bold mb-1 text-slate-900 dark:text-white">
                Quy trình Can thiệp Giữ chân Khách hàng (Retention Playbook):
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200">{churnRes.recommendation}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DSS-04: WHAT-IF STRATEGIC ELASTICITY SIMULATOR
      ========================================================= */}
      {activeModel === 'dss04' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 ds-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Biến số Điều hành Vĩ mô (E = 1.3, M = 0.7)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn kịch bản mẫu hoặc kéo thanh trượt để đo độ nhạy lợi nhuận
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountPct(12);
                  setMktChangePct(25);
                  setDemandShiftPct(10);
                }}
                className="ds-btn-secondary py-1! px-2.5! text-xs!"
              >
                Tăng trưởng Q4
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountPct(6);
                  setMktChangePct(5);
                  setDemandShiftPct(0);
                }}
                className="ds-btn-secondary py-1! px-2.5! text-xs!"
              >
                Tối ưu Biên lợi nhuận
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountPct(18);
                  setMktChangePct(40);
                  setDemandShiftPct(-10);
                }}
                className="ds-btn-secondary py-1! px-2.5! text-xs!"
              >
                Cắt máu giá (Rủi ro)
              </button>
            </div>

            {[
              {
                label: 'Chính sách Chiết khấu Thương mại TB (Gốc: 8%)',
                val: `${discountPct.toFixed(1)}%`,
                min: 0,
                max: 25,
                step: 0.5,
                cur: discountPct,
                set: setDiscountPct,
              },
              {
                label: 'Thay đổi Ngân sách Marketing B2B',
                val: `${mktChangePct >= 0 ? '+' : ''}${mktChangePct}%`,
                min: -50,
                max: 100,
                step: 5,
                cur: mktChangePct,
                set: setMktChangePct,
              },
              {
                label: 'Biến động Nhu cầu Tuyển dụng Thị trường',
                val: `${demandShiftPct >= 0 ? '+' : ''}${demandShiftPct}%`,
                min: -30,
                max: 40,
                step: 5,
                cur: demandShiftPct,
                set: setDemandShiftPct,
              },
            ].map((s, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-400">{s.val}</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.cur}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 ds-card p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                <div className="text-[11px] text-slate-500">Số Deal Dự kiến</div>
                <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {whatIfRes.expectedDeals} HĐ
                </div>
                <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400">
                  {whatIfRes.dealGrowthPct >= 0 ? '+' : ''}
                  {whatIfRes.dealGrowthPct}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                <div className="text-[11px] text-slate-500">Doanh thu Thuần</div>
                <div className="text-xl font-mono font-bold text-blue-800 dark:text-blue-400 mt-0.5">
                  {whatIfRes.netRevenue} Tr
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {whatIfRes.netRevenueChangePct >= 0 ? '+' : ''}
                  {whatIfRes.netRevenueChangePct}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                <div className="text-[11px] text-slate-500">Chi phí Vận hành</div>
                <div className="text-xl font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  {whatIfRes.estimatedCost} Tr
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300">Lợi nhuận Ròng</div>
                <div className="text-xl font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {whatIfRes.netProfit} Tr
                </div>
                <div className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  Biên: {whatIfRes.netMarginPct}%
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={whatIfChartData} margin={{ top: 8, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="chiTieu" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(v: any) => [`${v} Triệu VNĐ`]} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="HienTai" name="Kịch bản Gốc (8% CK)" fill="#94a3b8" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="MoPhong" name="Kịch bản Mô phỏng" fill="#1e40af" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {whatIfRes.warning && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-300 dark:border-red-500/30 flex items-start gap-2.5 text-xs font-semibold text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{whatIfRes.warning}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{whatIfRes.insight}</p>
          </div>
        </div>
      )}
    </div>
  );
};

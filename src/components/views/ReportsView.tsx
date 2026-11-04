import React, { useState, useEffect, useCallback } from 'react';
import {
  FileBarChart2,
  Printer,
  Download,
  RefreshCw,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { MarketOverviewData } from '../../types';
import { exportToCsv } from '../../utils/exportCsv';
import { useToast } from '../ui/UIPrimitives';

interface ReportsViewProps {
  refreshKey: number;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ refreshKey }) => {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState<'RP01' | 'RP02' | 'RP03' | 'RP04' | 'RP05'>('RP01');
  const [reportsData, setReportsData] = useState<any | null>(null);
  const [marketData, setMarketData] = useState<MarketOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, mktRes] = await Promise.all([
        fetch('/api/reports/all').then((r) => r.json()),
        fetch('/api/market/overview').then((r) => r.json()),
      ]);
      setReportsData(repRes);
      setMarketData(mktRes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports, refreshKey]);

  const reportTabs = [
    { id: 'RP01', code: 'RP-01', title: 'Phễu Chuyển đổi & Hot Leads', target: 'Trưởng phòng Sales' },
    { id: 'RP02', code: 'RP-02', title: 'Sức khỏe Khách hàng & Churn', target: 'Trưởng bộ phận CSKH' },
    { id: 'RP03', code: 'RP-03', title: 'Xếp hạng KPI Đội ngũ Sales', target: 'Giám đốc Kinh doanh' },
    { id: 'RP04', code: 'RP-04', title: 'Toàn cảnh Thị trường job_market.bak', target: 'Ban Giám đốc & R&D' },
    { id: 'RP05', code: 'RP-05', title: 'Hiệu quả Danh mục Gói Dịch vụ', target: 'Giám đốc Sản phẩm' },
  ] as const;

  const handleExportCsv = () => {
    if (!reportsData) return;
    if (selectedReport === 'RP01') exportToCsv('RP01_Funnel_Pipeline.csv', reportsData.rp01.funnel);
    else if (selectedReport === 'RP02') exportToCsv('RP02_Churn_Alert_List.csv', reportsData.rp02.churnList);
    else if (selectedReport === 'RP03') exportToCsv('RP03_Sales_Leaderboard.csv', reportsData.rp03.salesRanking);
    else if (selectedReport === 'RP04' && marketData)
      exportToCsv('RP04_JobMarket_Platforms.csv', marketData.platforms);
    else if (selectedReport === 'RP05')
      exportToCsv('RP05_Package_Performance.csv', reportsData.rp05.packagePerformance);
    showToast('success', `Đã xuất báo cáo ${selectedReport} ra tệp CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Report Selector Tabs & Export Toolbar */}
      <div className="ds-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {reportTabs.map((r) => {
            const active = selectedReport === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReport(r.id)}
                className={`px-3.5 py-2 rounded-xl text-left transition-all whitespace-nowrap ${
                  active
                    ? 'bg-blue-800 text-white dark:bg-blue-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70'
                }`}
              >
                <div className="text-[10px] font-mono font-bold opacity-80">{r.code}</div>
                <div className="text-xs font-bold">{r.title}</div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={loadReports} className="ds-btn-secondary text-xs!">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Làm mới
          </button>
          <button type="button" onClick={handleExportCsv} className="ds-btn-secondary text-xs!">
            <Download className="w-4 h-4" aria-hidden="true" /> Xuất CSV
          </button>
          <button type="button" onClick={() => window.print()} className="ds-btn-primary text-xs!">
            <Printer className="w-4 h-4" aria-hidden="true" /> In / Xuất PDF
          </button>
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div className="ds-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800 text-white flex items-center justify-center shrink-0">
              <FileBarChart2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">
                BÁO CÁO QUẢN TRỊ ĐỊNH KỲ • DỮ LIỆU THỜI GIAN THỰC TỪ CSDL
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {reportTabs.find((x) => x.id === selectedReport)?.code}:{' '}
                {reportTabs.find((x) => x.id === selectedReport)?.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Đối tượng nhận: {reportTabs.find((x) => x.id === selectedReport)?.target} • Ngày kết xuất:{' '}
                {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Đồng bộ SQLite Live
          </span>
        </div>

        {loading || !reportsData ? (
          <div className="py-12 text-center text-sm text-slate-500">Đang tổng hợp báo cáo từ CSDL...</div>
        ) : (
          <>
            {/* RP-01 */}
            {selectedReport === 'RP01' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                    1. Phân Tích Tỷ Lệ Chuyển Đổi Qua Các Giai Đoạn Phễu B2B
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-2.5 px-4">Giai đoạn Phễu</th>
                          <th className="py-2.5 px-4 text-center">Số lượng DN</th>
                          <th className="py-2.5 px-4 text-right">Tỷ trọng (%)</th>
                          <th className="py-2.5 px-4 text-right">Tổng Ngân sách Dự kiến</th>
                          <th className="py-2.5 px-4 text-right">Ngân sách TB / DN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {reportsData.rp01.funnel.map((row: any, i: number) => (
                          <tr key={i}>
                            <td className="py-2.5 px-4 font-semibold">{row.GiaiDoanPhanPhieu}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold">{row.SoLuongDN}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{row.TyLePhanTram}%</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-800 dark:text-blue-400">
                              {row.TongNganSachDuKien} Tr
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">{row.NganSachTrungBinh} Tr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                    2. Danh Sách Hot Leads Cần Ưu Tiên Chốt Hợp Đồng ({reportsData.rp01.hotLeads.length} DN)
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-2.5 px-4">Mã DN</th>
                          <th className="py-2.5 px-4">Doanh nghiệp</th>
                          <th className="py-2.5 px-4">Ngành</th>
                          <th className="py-2.5 px-4 text-right">Ngân sách</th>
                          <th className="py-2.5 px-4 text-center">Điểm AHP</th>
                          <th className="py-2.5 px-4">Gói Đề xuất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {reportsData.rp01.hotLeads.slice(0, 10).map((dn: any) => (
                          <tr key={dn.MaDN}>
                            <td className="py-2.5 px-4 font-mono text-xs font-bold text-blue-700">{dn.MaDN}</td>
                            <td className="py-2.5 px-4 font-semibold">{dn.TenDoanhNghiep}</td>
                            <td className="py-2.5 px-4 text-xs">{dn.TenNganh}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                              {dn.NganSachDuKien} Tr
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-red-600">
                              {dn.DiemTiemNang_LeadScore}
                            </td>
                            <td className="py-2.5 px-4 text-xs font-medium">{dn.GoiDichVuKhuyenNghi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* RP-02 */}
            {selectedReport === 'RP02' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25">
                    <div className="text-xs text-red-800 dark:text-red-300">Báo động Đỏ (Churn ≥ 65%)</div>
                    <div className="text-2xl font-mono font-bold text-red-700 dark:text-red-400 mt-1">
                      {reportsData.rp02.churnList.length} Doanh nghiệp
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
                    <div className="text-xs text-emerald-800 dark:text-emerald-300">Nhóm An toàn (Churn Thấp)</div>
                    <div className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      {reportsData.rp02.safeCount} Doanh nghiệp
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500">Khách hàng Đã dừng dịch vụ</div>
                    <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                      {reportsData.rp02.lostCount} Doanh nghiệp
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2.5 px-4">Doanh nghiệp</th>
                        <th className="py-2.5 px-4">Gói Đang dùng</th>
                        <th className="py-2.5 px-4 text-center">Churn Risk</th>
                        <th className="py-2.5 px-4 text-center">Hạn mức dùng</th>
                        <th className="py-2.5 px-4 text-center">CSAT TB</th>
                        <th className="py-2.5 px-4">Chiến lược Cứu vãn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportsData.rp02.churnList.map((c: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-4 font-semibold">{c.TenDoanhNghiep}</td>
                          <td className="py-2.5 px-4 text-xs">{c.TenGoi || 'Chưa có HĐ'}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-red-600">
                            {c.ChurnScore_Pct}%
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono">{c.TyLeSuDung_Pct ?? 0}%</td>
                          <td className="py-2.5 px-4 text-center font-mono">{c.CSAT_TrungBinh}/5</td>
                          <td className="py-2.5 px-4 text-xs max-w-xs">{c.ChienLuocHanhDong}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* RP-03 */}
            {selectedReport === 'RP03' && (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-3 px-4">Hạng</th>
                      <th className="py-3 px-4">Nhân sự Kinh doanh</th>
                      <th className="py-3 px-4">Phòng ban</th>
                      <th className="py-3 px-4 text-center">Số HĐ Chốt</th>
                      <th className="py-3 px-4 text-right">Chỉ tiêu KPI</th>
                      <th className="py-3 px-4 text-right">Doanh số Thực tế</th>
                      <th className="py-3 px-4 text-right">% Hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportsData.rp03.salesRanking.map((nv: any) => (
                      <tr key={nv.MaNV}>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className="inline-flex items-center gap-1">
                            {nv.XepHangDoanhSo <= 3 && (
                              <Award className="w-4 h-4 text-amber-500" aria-hidden="true" />
                            )}
                            #{nv.XepHangDoanhSo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold">{nv.HoTen}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{nv.PhongBan}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{nv.SoDealChot}</td>
                        <td className="py-3 px-4 text-right font-mono">{nv.ChiTieuDoanhSo} Tr</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {nv.DoanhSoThucTe} Tr
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-800 dark:text-blue-400">
                          {nv.TyLeDatKPI}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* RP-04: JOB MARKET BENCHMARK */}
            {selectedReport === 'RP04' && marketData && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-xs text-slate-500">Tổng tin job_market.bak</div>
                    <div className="text-xl font-mono font-bold mt-1">
                      {marketData.stats.tongTin.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-xs text-slate-500">Tổng Nhà tuyển dụng</div>
                    <div className="text-xl font-mono font-bold text-blue-800 dark:text-blue-400 mt-1">
                      {marketData.stats.tongDN.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-xs text-slate-500">DN Đa sàn (≥ 2 sàn)</div>
                    <div className="text-xl font-mono font-bold text-amber-700 dark:text-amber-400 mt-1">
                      {marketData.stats.doanhNghiepDaSan.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-xs text-slate-500">Tin Lương thỏa thuận</div>
                    <div className="text-xl font-mono font-bold mt-1">
                      {marketData.stats.tinThoaThuanLuong.toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-3 px-4">Nền tảng Tuyển dụng</th>
                        <th className="py-3 px-4 text-right">Số lượng Tin đăng</th>
                        <th className="py-3 px-4 text-right">Thị phần (%)</th>
                        <th className="py-3 px-4 text-right">Số Doanh nghiệp</th>
                        <th className="py-3 px-4 text-right">Lương công bố TB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {marketData.platforms.map((p) => (
                        <tr key={p.nguon}>
                          <td className="py-3 px-4 font-bold">{p.nguon}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {p.count.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-700 dark:text-blue-400">
                            {p.pct}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {p.companies.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {p.avgSalary ? `${p.avgSalary} Tr` : 'Thỏa thuận'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* RP-05 */}
            {selectedReport === 'RP05' && (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-3 px-4">Mã Gói</th>
                      <th className="py-3 px-4">Tên Gói Dịch vụ</th>
                      <th className="py-3 px-4">Loại hình</th>
                      <th className="py-3 px-4 text-right">Giá niêm yết</th>
                      <th className="py-3 px-4 text-center">Số HĐ Đã ký</th>
                      <th className="py-3 px-4 text-right">Chiết khấu TB</th>
                      <th className="py-3 px-4 text-right">Tổng Doanh thu</th>
                      <th className="py-3 px-4 text-right">Tỷ trọng DT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportsData.rp05.packagePerformance.map((p: any) => (
                      <tr key={p.MaGoi}>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{p.MaGoi}</td>
                        <td className="py-3 px-4 font-semibold">{p.TenGoi}</td>
                        <td className="py-3 px-4 text-xs">{p.LoaiDichVu}</td>
                        <td className="py-3 px-4 text-right font-mono">{p.GiaNiemYet} Tr</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{p.SoHDBan}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700">-{p.ChietKhauTB_Pct}%</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {p.TongDoanhThu} Tr
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{p.TyTrongDoanhThu_Pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

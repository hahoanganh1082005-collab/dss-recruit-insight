import React, { useState, useEffect, useDeferredValue, useCallback } from 'react';
import {
  Building2,
  FileText,
  Briefcase,
  MessageSquareHeart,
  Package,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  ShieldAlert,
  Star,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  EnterpriseItem,
  ContractModel,
  DemandItem,
  InteractionItem,
  PackageModel,
  IndustryItem,
  UserSession,
} from '../../types';
import {
  LeadTierBadge,
  ChurnRiskBadge,
  ConfirmDialog,
  useToast,
} from '../ui/UIPrimitives';
import { exportToCsv } from '../../utils/exportCsv';

interface CRMViewProps {
  user: UserSession | null;
  refreshKey: number;
  onDataMutated: () => void;
  onSelectEnterprise360: (maDN: string) => void;
}

type CrmSubTab = 'enterprises' | 'contracts' | 'demands' | 'interactions' | 'packages';

export const CRMView: React.FC<CRMViewProps> = ({
  user,
  refreshKey,
  onDataMutated,
  onSelectEnterprise360,
}) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<CrmSubTab>('enterprises');

  // Master & Entity Lists
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [contracts, setContracts] = useState<ContractModel[]>([]);
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [packages, setPackages] = useState<PackageModel[]>([]);
  const [industries, setIndustries] = useState<IndustryItem[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterContractStatus, setFilterContractStatus] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterComplaintOnly, setFilterComplaintOnly] = useState(false);

  // Confirm Delete Dialog state
  const [deleteTarget, setDeleteTarget] = useState<{
    endpoint: string;
    title: string;
    desc: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal States for Create/Edit
  const [enterpriseModal, setEnterpriseModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: any;
  }>({ open: false, mode: 'create', data: {} });

  const [contractModal, setContractModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: any;
  }>({ open: false, mode: 'create', data: {} });

  const [demandModal, setDemandModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: any;
  }>({ open: false, mode: 'create', data: {} });

  const [interactionModal, setInteractionModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: any;
  }>({ open: false, mode: 'create', data: {} });

  const [packageModal, setPackageModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: any;
  }>({ open: false, mode: 'create', data: {} });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [entRes, hdRes, ncRes, ttRes, pkgRes, indRes, usrRes] = await Promise.all([
        fetch('/api/enterprises').then((r) => r.json()),
        fetch('/api/contracts').then((r) => r.json()),
        fetch('/api/demands').then((r) => r.json()),
        fetch('/api/interactions').then((r) => r.json()),
        fetch('/api/packages').then((r) => r.json()),
        fetch('/api/industries').then((r) => r.json()),
        fetch('/api/auth/users').then((r) => r.json()),
      ]);
      setEnterprises(entRes);
      setContracts(hdRes);
      setDemands(ncRes);
      setInteractions(ttRes);
      setPackages(pkgRes);
      setIndustries(indRes);
      setSalesUsers(usrRes);
    } catch {
      showToast('error', 'Không thể tải dữ liệu CRM');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  const isManagerOrExec = user?.vaiTro === 'SalesManager' || user?.vaiTro === 'Executive';

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(deleteTarget.endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'Không thể xóa bản ghi', data.error);
      } else {
        showToast('success', 'Đã xóa thành công', data.message);
        fetchAll();
        onDataMutated();
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ khi xóa');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Filtered Lists
  const q = deferredSearch.trim().toLowerCase();

  const filteredEnterprises = enterprises.filter((e) => {
    if (
      q &&
      !e.TenDoanhNghiep.toLowerCase().includes(q) &&
      !e.MaDN.toLowerCase().includes(q) &&
      !e.DiaBan.toLowerCase().includes(q) &&
      !e.SalesPhuTrach.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filterIndustry && e.MaNganh !== filterIndustry) return false;
    if (filterTier && e.PhanHangLead !== filterTier) return false;
    if (filterStage && e.GiaiDoanPhanPhieu !== filterStage) return false;
    return true;
  });

  const filteredContracts = contracts.filter((c) => {
    if (
      q &&
      !c.TenDoanhNghiep.toLowerCase().includes(q) &&
      !c.MaHopDong.toLowerCase().includes(q) &&
      !c.TenGoi.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filterContractStatus && c.TrangThaiHopDong !== filterContractStatus) return false;
    return true;
  });

  const filteredDemands = demands.filter((d) => {
    if (
      q &&
      !d.ViTriCanTuyen.toLowerCase().includes(q) &&
      !(d.TenDoanhNghiep || '').toLowerCase().includes(q) &&
      !d.MaNhuCau.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filterUrgency && d.DoCapBach !== filterUrgency) return false;
    return true;
  });

  const filteredInteractions = interactions.filter((it) => {
    if (
      q &&
      !(it.TenDoanhNghiep || '').toLowerCase().includes(q) &&
      !it.NoiDung.toLowerCase().includes(q) &&
      !(it.NhanVienCSKH || '').toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filterComplaintOnly && Number(it.CoKhieuNai) !== 1) return false;
    return true;
  });

  const filteredPackages = packages.filter((p) => {
    if (q && !p.TenGoi.toLowerCase().includes(q) && !p.MaGoi.toLowerCase().includes(q)) return false;
    return true;
  });

  // Save Handlers
  const saveEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mode, data } = enterpriseModal;
    const url = mode === 'create' ? '/api/enterprises' : `/api/enterprises/${data.MaDN}`;
    const method = mode === 'create' ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, actorMaNV: user?.maNV || 'NV01' }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('error', 'Lỗi lưu Doanh nghiệp', json.error);
      return;
    }
    showToast('success', mode === 'create' ? 'Đã thêm Doanh nghiệp mới' : 'Đã cập nhật Doanh nghiệp', json.message);
    setEnterpriseModal({ open: false, mode: 'create', data: {} });
    fetchAll();
    onDataMutated();
  };

  const saveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mode, data } = contractModal;
    const pkg = packages.find((p) => p.MaGoi === data.MaGoi);
    const giaNiemYet = pkg ? pkg.GiaNiemYet : Number(data.GiaTriHopDong) || 0;
    const ck = Number(data.ChietKhau) || 0;
    const soTien = Math.round(giaNiemYet * (1 - ck / 100) * 10) / 10;

    const payload = {
      ...data,
      GiaTriHopDong: giaNiemYet,
      SoTienThanhToan: soTien,
      MaNVSales: data.MaNVSales || user?.maNV || 'NV01',
      approvedByManager: isManagerOrExec,
    };

    const url = mode === 'create' ? '/api/contracts' : `/api/contracts/${data.MaHopDong}`;
    const method = mode === 'create' ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('error', 'Quy tắc phê duyệt Hợp đồng', json.error);
      return;
    }
    showToast('success', mode === 'create' ? 'Ký Hợp đồng mới thành công' : 'Đã cập nhật Hợp đồng', json.message);
    setContractModal({ open: false, mode: 'create', data: {} });
    fetchAll();
    onDataMutated();
  };

  const saveDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mode, data } = demandModal;
    const url = mode === 'create' ? '/api/demands' : `/api/demands/${data.MaNhuCau}`;
    const method = mode === 'create' ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, actorMaNV: user?.maNV || 'NV01' }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('error', 'Lỗi lưu Nhu cầu', json.error);
      return;
    }
    showToast('success', 'Đã lưu Nhu cầu Tuyển dụng', json.message);
    setDemandModal({ open: false, mode: 'create', data: {} });
    fetchAll();
    onDataMutated();
  };

  const saveInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mode, data } = interactionModal;
    const url = mode === 'create' ? '/api/interactions' : `/api/interactions/${data.MaTuongTac}`;
    const method = mode === 'create' ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, MaNV: data.MaNV || user?.maNV || 'NV05' }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('error', 'Lỗi lưu Tương tác CSKH', json.error);
      return;
    }
    showToast('success', 'Đã lưu lịch sử CSKH & cập nhật Churn Risk', json.message);
    setInteractionModal({ open: false, mode: 'create', data: {} });
    fetchAll();
    onDataMutated();
  };

  const savePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mode, data } = packageModal;
    const url = mode === 'create' ? '/api/packages' : `/api/packages/${data.MaGoi}`;
    const method = mode === 'create' ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('error', 'Lỗi lưu Gói dịch vụ', json.error);
      return;
    }
    showToast('success', 'Đã lưu danh mục Gói Dịch vụ', json.message);
    setPackageModal({ open: false, mode: 'create', data: {} });
    fetchAll();
    onDataMutated();
  };

  // Trigger Primary Create Action per Tab
  const openCreateForActiveTab = () => {
    const today = new Date().toISOString().split('T')[0];
    const next90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

    if (subTab === 'enterprises') {
      setEnterpriseModal({
        open: true,
        mode: 'create',
        data: {
          TenDoanhNghiep: '',
          MaNganh: industries[0]?.MaNganh || 'NN01',
          QuyMoNhanSu: 250,
          DiaBan: 'Hà Nội',
          NguonLead: 'Website',
          GiaiDoanPhanPhieu: '1.Tiếp cận',
          NganSachDuKien: 80,
          MaNVSales: user?.maNV || 'NV01',
          TrangThai: 'TiemNang',
        },
      });
    } else if (subTab === 'contracts') {
      setContractModal({
        open: true,
        mode: 'create',
        data: {
          MaDN: enterprises[0]?.MaDN || 'DN001',
          MaGoi: packages[2]?.MaGoi || packages[0]?.MaGoi || 'PKG03',
          ChietKhau: 8,
          NgayKy: today,
          NgayBatDau: today,
          NgayHetHan: next90,
          TrangThaiThanhToan: 'DaThanhToan',
          TrangThaiHopDong: 'HieuLuc',
        },
      });
    } else if (subTab === 'demands') {
      setDemandModal({
        open: true,
        mode: 'create',
        data: {
          MaDN: enterprises[0]?.MaDN || 'DN001',
          ViTriCanTuyen: '',
          SoLuongCanTuyen: 5,
          MucLuongTrungBinh: 25,
          DoCapBach: 'Gap',
          HanChotTuyen: next90,
          TrangThai: 'DangMo',
        },
      });
    } else if (subTab === 'interactions') {
      setInteractionModal({
        open: true,
        mode: 'create',
        data: {
          MaDN: enterprises[0]?.MaDN || 'DN001',
          NgayTuongTac: today,
          KenhTuongTac: 'Điện thoại',
          DiemHaiLongCSAT: 5,
          CoKhieuNai: false,
          NoiDung: '',
          PhanHoiKhachHang: '',
        },
      });
    } else if (subTab === 'packages') {
      setPackageModal({
        open: true,
        mode: 'create',
        data: {
          TenGoi: '',
          LoaiDichVu: 'Combo',
          GiaNiemYet: 35,
          SoTinDang: 20,
          SoLuotMoCV: 300,
          ThoiHanNgay: 90,
          MoTa: '',
        },
      });
    }
  };

  const handleExportCurrentTab = () => {
    if (subTab === 'enterprises') exportToCsv('CRM_DoanhNghiep_Leads.csv', filteredEnterprises);
    else if (subTab === 'contracts') exportToCsv('CRM_HopDongDichVu.csv', filteredContracts);
    else if (subTab === 'demands') exportToCsv('CRM_NhuCauTuyenDung.csv', filteredDemands);
    else if (subTab === 'interactions') exportToCsv('CRM_ChamSocCSKH.csv', filteredInteractions);
    else exportToCsv('CRM_GoiDichVu.csv', filteredPackages);
    showToast('info', 'Đã xuất tệp CSV (Chuẩn UTF-8 Excel)');
  };

  const tabItems: Array<{ id: CrmSubTab; label: string; count: number; icon: React.FC<{ className?: string }> }> = [
    { id: 'enterprises', label: 'Doanh nghiệp & Leads', count: enterprises.length, icon: Building2 },
    { id: 'contracts', label: 'Hợp đồng & Hạn mức', count: contracts.length, icon: FileText },
    { id: 'demands', label: 'Nhu cầu Tuyển dụng', count: demands.length, icon: Briefcase },
    { id: 'interactions', label: 'Chăm sóc CSKH', count: interactions.length, icon: MessageSquareHeart },
    { id: 'packages', label: 'Danh mục Gói Dịch vụ', count: packages.length, icon: Package },
  ];

  const createLabels: Record<CrmSubTab, string> = {
    enterprises: 'Thêm Doanh nghiệp',
    contracts: 'Tạo Hợp đồng mới',
    demands: 'Thêm Nhu cầu Tuyển',
    interactions: 'Ghi nhận CSKH',
    packages: 'Thêm Gói Dịch vụ',
  };

  return (
    <div className="space-y-5">
      {/* Top Sub-Navigation & Primary Actions */}
      <div className="ds-card p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
          {tabItems.map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all ${
                  active
                    ? 'bg-blue-800 text-white dark:bg-blue-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{t.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono ${
                    active ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={handleExportCurrentTab} className="ds-btn-secondary text-xs!">
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Xuất CSV</span>
          </button>
          <button type="button" onClick={openCreateForActiveTab} className="ds-btn-primary text-xs!">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{createLabels[subTab]}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ds-card p-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên doanh nghiệp, mã hồ sơ, địa bàn, vị trí hoặc nội dung..."
            className="ds-input pl-9!"
          />
        </div>

        {subTab === 'enterprises' && (
          <>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              aria-label="Lọc theo ngành nghề"
              className="ds-input w-auto!"
            >
              <option value="">Tất cả ngành nghề</option>
              {industries.map((ind) => (
                <option key={ind.MaNganh} value={ind.MaNganh}>
                  {ind.TenNganh}
                </option>
              ))}
            </select>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              aria-label="Lọc phân hạng Lead"
              className="ds-input w-auto!"
            >
              <option value="">Mọi phân hạng AHP</option>
              <option value="Hot">Hot Lead (≥ 70đ)</option>
              <option value="Warm">Warm Lead (45-69đ)</option>
              <option value="Cold">Cold Lead (&lt; 45đ)</option>
            </select>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              aria-label="Lọc giai đoạn phễu"
              className="ds-input w-auto!"
            >
              <option value="">Mọi giai đoạn phễu</option>
              {['1.Tiếp cận', '2.Nhu cầu', '3.Báo giá', '4.Đàm phán', '5.Ký HĐ', '6.Tái ký'].map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </>
        )}

        {subTab === 'contracts' && (
          <select
            value={filterContractStatus}
            onChange={(e) => setFilterContractStatus(e.target.value)}
            aria-label="Trạng thái hợp đồng"
            className="ds-input w-auto!"
          >
            <option value="">Tất cả trạng thái HĐ</option>
            <option value="HieuLuc">Đang hiệu lực</option>
            <option value="SapHetHan">Sắp hết hạn</option>
            <option value="HetHan">Đã hết hạn</option>
          </select>
        )}

        {subTab === 'demands' && (
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            aria-label="Độ cấp bách"
            className="ds-input w-auto!"
          >
            <option value="">Mọi mức độ cấp bách</option>
            <option value="RatGap">Rất gấp</option>
            <option value="Gap">Gấp</option>
            <option value="BinhThuong">Bình thường</option>
            <option value="DaiHan">Dài hạn</option>
          </select>
        )}

        {subTab === 'interactions' && (
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterComplaintOnly}
              onChange={(e) => setFilterComplaintOnly(e.target.checked)}
              className="w-4 h-4 rounded accent-red-600"
            />
            <span>Chỉ hiện các ca có Khiếu nại</span>
          </label>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="ds-card p-12 text-center text-sm text-slate-500">Đang đồng bộ dữ liệu CRM...</div>
      ) : (
        <>
          {/* 1. ENTERPRISES TABLE */}
          {subTab === 'enterprises' && (
            <div className="ds-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Mã</th>
                      <th className="py-3 px-4">Doanh nghiệp & Địa bàn</th>
                      <th className="py-3 px-4">Ngành nghề</th>
                      <th className="py-3 px-4 text-right">Ngân sách</th>
                      <th className="py-3 px-4">Giai đoạn Phễu</th>
                      <th className="py-3 px-4 text-center">Điểm AHP Lead</th>
                      <th className="py-3 px-4 text-center">Rủi ro Churn</th>
                      <th className="py-3 px-4 text-right">Thao tác CRUD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEnterprises.map((dn) => (
                      <tr
                        key={dn.MaDN}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                          {dn.MaDN}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onSelectEnterprise360(dn.MaDN)}
                            className="font-semibold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 text-left"
                          >
                            {dn.TenDoanhNghiep}
                          </button>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {dn.DiaBan} • {Number(dn.QuyMoNhanSu).toLocaleString('vi-VN')} NS • Sales: {dn.SalesPhuTrach}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {dn.TenNganh}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {dn.NganSachDuKien} Tr
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {dn.GiaiDoanPhanPhieu}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <LeadTierBadge tier={dn.PhanHangLead} score={dn.DiemTiemNang_LeadScore} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <ChurnRiskBadge level={dn.MucDoNguyCoChurn} score={dn.DiemNguyCoRoiBo_ChurnScore} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onSelectEnterprise360(dn.MaDN)}
                              title="Mở Hồ sơ 360° & AI"
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" /> 360°
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEnterpriseModal({ open: true, mode: 'edit', data: { ...dn } })
                              }
                              aria-label={`Chỉnh sửa ${dn.TenDoanhNghiep}`}
                              title="Chỉnh sửa"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  endpoint: `/api/enterprises/${dn.MaDN}?actor=${user?.maNV || 'NV01'}`,
                                  title: `Xóa doanh nghiệp ${dn.TenDoanhNghiep}?`,
                                  desc: `Hành động này sẽ xóa hồ sơ ${dn.MaDN} cùng các hợp đồng, nhu cầu tuyển dụng và lịch sử chăm sóc liên quan.`,
                                })
                              }
                              aria-label={`Xóa ${dn.TenDoanhNghiep}`}
                              title="Xóa"
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
            </div>
          )}

          {/* 2. CONTRACTS & QUOTA TABLE */}
          {subTab === 'contracts' && (
            <div className="ds-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Mã HĐ</th>
                      <th className="py-3 px-4">Doanh nghiệp</th>
                      <th className="py-3 px-4">Gói Dịch vụ</th>
                      <th className="py-3 px-4 text-right">CK %</th>
                      <th className="py-3 px-4 text-right">Thực thu</th>
                      <th className="py-3 px-4">Tiêu hao Hạn mức</th>
                      <th className="py-3 px-4">Hết hạn</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredContracts.map((hd) => {
                      const utilPct = Math.round((Number(hd.TyLeSuDungHanMuc) || 0) * 100);
                      return (
                        <tr key={hd.MaHopDong} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                            {hd.MaHopDong}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => onSelectEnterprise360(hd.MaDN)}
                              className="font-semibold text-slate-900 dark:text-white hover:text-blue-700 text-left"
                            >
                              {hd.TenDoanhNghiep}
                            </button>
                            <div className="text-xs text-slate-500">Sales: {hd.SalesPhuTrach}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {hd.TenGoi}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                            -{hd.ChietKhau}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {hd.SoTienThanhToan} Tr
                          </td>
                          <td className="py-3 px-4 w-44">
                            <div className="flex justify-between text-[11px] font-mono mb-1">
                              <span>{hd.SoCVDaMo ?? 0}/{hd.HanMucCV} CV</span>
                              <span className="font-bold">{utilPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
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
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{hd.NgayHetHan}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                hd.TrangThaiHopDong === 'HieuLuc'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : hd.TrangThaiHopDong === 'SapHetHan'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {hd.TrangThaiHopDong}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setContractModal({
                                    open: true,
                                    mode: 'edit',
                                    data: {
                                      ...hd,
                                      TyLeSuDungHanMuc: hd.TyLeSuDungHanMuc ?? 0.5,
                                      SoTinDaDang: hd.SoTinDaDang ?? 0,
                                      SoCVDaMo: hd.SoCVDaMo ?? 0,
                                    },
                                  })
                                }
                                title="Sửa Hợp đồng & Hạn mức"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Pencil className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    endpoint: `/api/contracts/${hd.MaHopDong}`,
                                    title: `Xóa hợp đồng ${hd.MaHopDong}?`,
                                    desc: `Xóa hợp đồng của ${hd.TenDoanhNghiep} và tự động tính toán lại chỉ số rủi ro rời bỏ.`,
                                  })
                                }
                                title="Xóa Hợp đồng"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. RECRUITMENT DEMANDS TABLE */}
          {subTab === 'demands' && (
            <div className="ds-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Mã NC</th>
                      <th className="py-3 px-4">Doanh nghiệp</th>
                      <th className="py-3 px-4">Vị trí cần tuyển</th>
                      <th className="py-3 px-4 text-center">Chỉ tiêu</th>
                      <th className="py-3 px-4 text-right">Lương TB</th>
                      <th className="py-3 px-4">Mức Cấp bách</th>
                      <th className="py-3 px-4">Hạn chót</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDemands.map((nc) => (
                      <tr key={nc.MaNhuCau} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{nc.MaNhuCau}</td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onSelectEnterprise360(nc.MaDN)}
                            className="font-semibold text-slate-900 dark:text-white hover:text-blue-700 text-left"
                          >
                            {nc.TenDoanhNghiep}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-medium text-blue-800 dark:text-blue-300">
                          {nc.ViTriCanTuyen}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{nc.SoLuongCanTuyen}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {nc.MucLuongTrungBinh} Tr
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              nc.DoCapBach === 'RatGap'
                                ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                : nc.DoCapBach === 'Gap'
                                ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {nc.DoCapBach}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{nc.HanChotTuyen}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDemandModal({ open: true, mode: 'edit', data: { ...nc } })}
                              title="Chỉnh sửa"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  endpoint: `/api/demands/${nc.MaNhuCau}`,
                                  title: `Xóa vị trí "${nc.ViTriCanTuyen}"?`,
                                  desc: 'Hệ thống sẽ tự động cập nhật lại điểm AHP Lead Score của doanh nghiệp.',
                                })
                              }
                              title="Xóa"
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
            </div>
          )}

          {/* 4. CSKH INTERACTIONS TABLE */}
          {subTab === 'interactions' && (
            <div className="ds-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Ngày</th>
                      <th className="py-3 px-4">Doanh nghiệp</th>
                      <th className="py-3 px-4">Kênh & Phụ trách</th>
                      <th className="py-3 px-4">Nội dung trao đổi</th>
                      <th className="py-3 px-4 text-center">CSAT</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInteractions.map((it) => (
                      <tr key={it.MaTuongTac} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {it.NgayTuongTac}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onSelectEnterprise360(it.MaDN)}
                            className="font-semibold text-slate-900 dark:text-white hover:text-blue-700 text-left"
                          >
                            {it.TenDoanhNghiep}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="font-semibold text-slate-700 dark:text-slate-200">{it.KenhTuongTac}</div>
                          <div className="text-slate-500">{it.NhanVienCSKH}</div>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2">{it.NoiDung}</p>
                          {Number(it.CoKhieuNai) === 1 && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                              <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Phát sinh Khiếu nại
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                            {it.DiemHaiLongCSAT}/5
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setInteractionModal({
                                  open: true,
                                  mode: 'edit',
                                  data: { ...it, CoKhieuNai: Number(it.CoKhieuNai) === 1 },
                                })
                              }
                              title="Chỉnh sửa"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  endpoint: `/api/interactions/${it.MaTuongTac}`,
                                  title: `Xóa bản ghi CSKH ${it.MaTuongTac}?`,
                                  desc: 'Điểm hài lòng CSAT và rủi ro rời bỏ của doanh nghiệp sẽ được tính lại.',
                                })
                              }
                              title="Xóa"
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
            </div>
          )}

          {/* 5. SERVICE PACKAGES CATALOG */}
          {subTab === 'packages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredPackages.map((pkg) => (
                <div key={pkg.MaGoi} className="ds-card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                          {pkg.MaGoi}
                        </span>
                        <span className="ml-2 text-xs font-semibold text-slate-500">{pkg.LoaiDichVu}</span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                          {pkg.TenGoi}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono font-extrabold text-blue-800 dark:text-blue-400">
                          {pkg.GiaNiemYet} Tr
                        </div>
                        <div className="text-[11px] text-slate-500">{pkg.ThoiHanNgay} ngày</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                      {pkg.MoTa}
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                        <div className="text-slate-500">Hạn mức tin đăng</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {pkg.SoTinDang} tin
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                        <div className="text-slate-500">Lượt mở hồ sơ CV</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {pkg.SoLuotMoCV.toLocaleString('vi-VN')} CV
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPackageModal({ open: true, mode: 'edit', data: { ...pkg } })}
                      className="ds-btn-secondary py-1.5! px-3! text-xs!"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          endpoint: `/api/packages/${pkg.MaGoi}`,
                          title: `Xóa gói dịch vụ ${pkg.TenGoi}?`,
                          desc: 'Chỉ xóa được gói dịch vụ chưa phát sinh hợp đồng thương mại.',
                        })
                      }
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Xóa gói dịch vụ"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* =======================================================
          MODAL 1: CREATE / EDIT ENTERPRISE
      ======================================================= */}
      {enterpriseModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={saveEnterprise} className="ds-card w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {enterpriseModal.mode === 'create'
                  ? 'Thêm Hồ sơ Doanh nghiệp B2B Mới'
                  : `Chỉnh sửa Doanh nghiệp (${enterpriseModal.data.MaDN})`}
              </h3>
              <button
                type="button"
                onClick={() => setEnterpriseModal({ open: false, mode: 'create', data: {} })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên pháp nhân Doanh nghiệp *
                </label>
                <input
                  type="text"
                  required
                  value={enterpriseModal.data.TenDoanhNghiep || ''}
                  onChange={(e) =>
                    setEnterpriseModal({
                      ...enterpriseModal,
                      data: { ...enterpriseModal.data, TenDoanhNghiep: e.target.value },
                    })
                  }
                  placeholder="VD: Công ty Cổ phần Công nghệ FPT..."
                  className="ds-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngành nghề hoạt động
                  </label>
                  <select
                    value={enterpriseModal.data.MaNganh || 'NN01'}
                    onChange={(e) =>
                      setEnterpriseModal({
                        ...enterpriseModal,
                        data: { ...enterpriseModal.data, MaNganh: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {industries.map((ind) => (
                      <option key={ind.MaNganh} value={ind.MaNganh}>
                        {ind.TenNganh} (Hệ số khó: {ind.HeSoKhoTuyen})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Địa bàn chính
                  </label>
                  <input
                    type="text"
                    value={enterpriseModal.data.DiaBan || ''}
                    onChange={(e) =>
                      setEnterpriseModal({
                        ...enterpriseModal,
                        data: { ...enterpriseModal.data, DiaBan: e.target.value },
                      })
                    }
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quy mô nhân sự (Người)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={enterpriseModal.data.QuyMoNhanSu || 100}
                    onChange={(e) =>
                      setEnterpriseModal({
                        ...enterpriseModal,
                        data: { ...enterpriseModal.data, QuyMoNhanSu: Number(e.target.value) },
                      })
                    }
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngân sách tuyển dụng dự kiến (Triệu VNĐ)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={enterpriseModal.data.NganSachDuKien || 50}
                    onChange={(e) =>
                      setEnterpriseModal({
                        ...enterpriseModal,
                        data: { ...enterpriseModal.data, NganSachDuKien: Number(e.target.value) },
                      })
                    }
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giai đoạn Phễu bán hàng
                  </label>
                  <select
                    value={enterpriseModal.data.GiaiDoanPhanPhieu || '1.Tiếp cận'}
                    onChange={(e) =>
                      setEnterpriseModal({
                        ...enterpriseModal,
                        data: { ...enterpriseModal.data, GiaiDoanPhanPhieu: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {['1.Tiếp cận', '2.Nhu cầu', '3.Báo giá', '4.Đàm phán', '5.Ký HĐ', '6.Tái ký'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nguồn tiếp cận Lead
                  </label>
                  <select
                    value={enterpriseModal.data.NguonLead || 'Website'}
                    onChange={(e) =>
                      setEnterpriseModal({
                        ...enterpriseModal,
                        data: { ...enterpriseModal.data, NguonLead: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {['Website', 'JobMarketHunting', 'LinkedIn', 'Hội thảo HR', 'Giới thiệu B2B', 'Telesales'].map(
                      (src) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhân sự Kinh doanh phụ trách
                  </label>
                  <select
                    value={enterpriseModal.data.MaNVSales || 'NV01'}
                    onChange={(e) =>
                      setEnterpriseModal({
                        ...enterpriseModal,
                        data: { ...enterpriseModal.data, MaNVSales: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {salesUsers.map((u) => (
                      <option key={u.MaNV} value={u.MaNV}>
                        {u.HoTen} ({u.PhongBan} — {u.VaiTro})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setEnterpriseModal({ open: false, mode: 'create', data: {} })}
                className="ds-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="ds-btn-primary">
                Lưu & Chấm điểm DSS
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =======================================================
          MODAL 2: CREATE / EDIT CONTRACT & QUOTA USAGE
      ======================================================= */}
      {contractModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={saveContract} className="ds-card w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {contractModal.mode === 'create'
                  ? 'Khởi tạo Hợp đồng Dịch vụ B2B'
                  : `Cập nhật Hợp đồng & Hạn mức (${contractModal.data.MaHopDong})`}
              </h3>
              <button
                type="button"
                onClick={() => setContractModal({ open: false, mode: 'create', data: {} })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {contractModal.mode === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Khách hàng Doanh nghiệp
                  </label>
                  <select
                    value={contractModal.data.MaDN}
                    onChange={(e) =>
                      setContractModal({
                        ...contractModal,
                        data: { ...contractModal.data, MaDN: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {enterprises.map((dn) => (
                      <option key={dn.MaDN} value={dn.MaDN}>
                        {dn.MaDN} — {dn.TenDoanhNghiep}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gói Dịch vụ Tuyển dụng
                  </label>
                  <select
                    value={contractModal.data.MaGoi}
                    onChange={(e) =>
                      setContractModal({
                        ...contractModal,
                        data: { ...contractModal.data, MaGoi: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {packages.map((p) => (
                      <option key={p.MaGoi} value={p.MaGoi}>
                        {p.TenGoi} — Niêm yết: {p.GiaNiemYet} Tr ({p.SoTinDang} tin, {p.SoLuotMoCV} CV)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mức Chiết khấu thương mại (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={35}
                    step="0.5"
                    value={contractModal.data.ChietKhau ?? 8}
                    onChange={(e) =>
                      setContractModal({
                        ...contractModal,
                        data: { ...contractModal.data, ChietKhau: Number(e.target.value) },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày hết hạn hợp đồng
                  </label>
                  <input
                    type="date"
                    value={contractModal.data.NgayHetHan || ''}
                    onChange={(e) =>
                      setContractModal({
                        ...contractModal,
                        data: { ...contractModal.data, NgayHetHan: e.target.value },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái Thanh toán
                  </label>
                  <select
                    value={contractModal.data.TrangThaiThanhToan || 'DaThanhToan'}
                    onChange={(e) =>
                      setContractModal({
                        ...contractModal,
                        data: { ...contractModal.data, TrangThaiThanhToan: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    <option value="DaThanhToan">Đã thanh toán</option>
                    <option value="ThanhToanMotPhan">Thanh toán một phần</option>
                    <option value="ChoThanhToan">Chờ thanh toán</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái Hiệu lực
                  </label>
                  <select
                    value={contractModal.data.TrangThaiHopDong || 'HieuLuc'}
                    onChange={(e) =>
                      setContractModal({
                        ...contractModal,
                        data: { ...contractModal.data, TrangThaiHopDong: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    <option value="HieuLuc">Đang hiệu lực</option>
                    <option value="SapHetHan">Sắp hết hạn</option>
                    <option value="HetHan">Đã hết hạn</option>
                  </select>
                </div>
              </div>

              {Number(contractModal.data.ChietKhau) > 12 && !isManagerOrExec && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>Cảnh báo phân quyền RBAC:</strong> Chiết khấu vượt trần <strong>12%</strong> yêu cầu tài khoản{' '}
                    <strong>SalesManager</strong> hoặc <strong>Executive</strong> phê duyệt. Hãy đổi vai trò ở thanh trên cùng nếu cần duyệt ngoại lệ.
                  </span>
                </div>
              )}

              {contractModal.mode === 'edit' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Cập nhật Tiêu hao Hạn mức Dịch vụ (Tác động trực tiếp Churn Risk)
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Số tin đã đăng</label>
                      <input
                        type="number"
                        min={0}
                        value={contractModal.data.SoTinDaDang ?? 0}
                        onChange={(e) =>
                          setContractModal({
                            ...contractModal,
                            data: { ...contractModal.data, SoTinDaDang: Number(e.target.value) },
                          })
                        }
                        className="ds-input font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Số CV đã mở</label>
                      <input
                        type="number"
                        min={0}
                        value={contractModal.data.SoCVDaMo ?? 0}
                        onChange={(e) =>
                          setContractModal({
                            ...contractModal,
                            data: { ...contractModal.data, SoCVDaMo: Number(e.target.value) },
                          })
                        }
                        className="ds-input font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Tỷ lệ dùng (0.0 - 1.0)</label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step="0.05"
                        value={contractModal.data.TyLeSuDungHanMuc ?? 0.5}
                        onChange={(e) =>
                          setContractModal({
                            ...contractModal,
                            data: { ...contractModal.data, TyLeSuDungHanMuc: Number(e.target.value) },
                          })
                        }
                        className="ds-input font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setContractModal({ open: false, mode: 'create', data: {} })}
                className="ds-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="ds-btn-primary">
                Lưu Hợp đồng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =======================================================
          MODAL 3: CREATE / EDIT DEMAND
      ======================================================= */}
      {demandModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={saveDemand} className="ds-card w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {demandModal.mode === 'create'
                  ? 'Thêm Nhu cầu Tuyển dụng Mới'
                  : `Chỉnh sửa Nhu cầu (${demandModal.data.MaNhuCau})`}
              </h3>
              <button
                type="button"
                onClick={() => setDemandModal({ open: false, mode: 'create', data: {} })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {demandModal.mode === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Doanh nghiệp yêu cầu
                  </label>
                  <select
                    value={demandModal.data.MaDN}
                    onChange={(e) =>
                      setDemandModal({ ...demandModal, data: { ...demandModal.data, MaDN: e.target.value } })
                    }
                    className="ds-input"
                  >
                    {enterprises.map((dn) => (
                      <option key={dn.MaDN} value={dn.MaDN}>
                        {dn.MaDN} — {dn.TenDoanhNghiep}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vị trí chức danh cần tuyển *
                </label>
                <input
                  type="text"
                  required
                  value={demandModal.data.ViTriCanTuyen || ''}
                  onChange={(e) =>
                    setDemandModal({ ...demandModal, data: { ...demandModal.data, ViTriCanTuyen: e.target.value } })
                  }
                  placeholder="VD: Trưởng phòng Kinh doanh B2B / DevOps..."
                  className="ds-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng cần tuyển
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={demandModal.data.SoLuongCanTuyen || 1}
                    onChange={(e) =>
                      setDemandModal({
                        ...demandModal,
                        data: { ...demandModal.data, SoLuongCanTuyen: Number(e.target.value) },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lương trung bình (Triệu VNĐ)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step="0.5"
                    value={demandModal.data.MucLuongTrungBinh || 20}
                    onChange={(e) =>
                      setDemandModal({
                        ...demandModal,
                        data: { ...demandModal.data, MucLuongTrungBinh: Number(e.target.value) },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mức độ cấp bách
                  </label>
                  <select
                    value={demandModal.data.DoCapBach || 'Gap'}
                    onChange={(e) =>
                      setDemandModal({ ...demandModal, data: { ...demandModal.data, DoCapBach: e.target.value } })
                    }
                    className="ds-input"
                  >
                    <option value="RatGap">Rất gấp</option>
                    <option value="Gap">Gấp</option>
                    <option value="BinhThuong">Bình thường</option>
                    <option value="DaiHan">Dài hạn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hạn chót tuyển
                  </label>
                  <input
                    type="date"
                    value={demandModal.data.HanChotTuyen || ''}
                    onChange={(e) =>
                      setDemandModal({ ...demandModal, data: { ...demandModal.data, HanChotTuyen: e.target.value } })
                    }
                    className="ds-input font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setDemandModal({ open: false, mode: 'create', data: {} })}
                className="ds-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="ds-btn-primary">
                Lưu Nhu cầu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =======================================================
          MODAL 4: CREATE / EDIT CSKH INTERACTION
      ======================================================= */}
      {interactionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={saveInteraction} className="ds-card w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {interactionModal.mode === 'create'
                  ? 'Ghi nhận Tương tác Chăm sóc Khách hàng'
                  : `Cập nhật Tương tác (${interactionModal.data.MaTuongTac})`}
              </h3>
              <button
                type="button"
                onClick={() => setInteractionModal({ open: false, mode: 'create', data: {} })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {interactionModal.mode === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Doanh nghiệp được chăm sóc
                  </label>
                  <select
                    value={interactionModal.data.MaDN}
                    onChange={(e) =>
                      setInteractionModal({
                        ...interactionModal,
                        data: { ...interactionModal.data, MaDN: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {enterprises.map((dn) => (
                      <option key={dn.MaDN} value={dn.MaDN}>
                        {dn.MaDN} — {dn.TenDoanhNghiep}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kênh tương tác
                  </label>
                  <select
                    value={interactionModal.data.KenhTuongTac || 'Điện thoại'}
                    onChange={(e) =>
                      setInteractionModal({
                        ...interactionModal,
                        data: { ...interactionModal.data, KenhTuongTac: e.target.value },
                      })
                    }
                    className="ds-input"
                  >
                    {['Điện thoại', 'Email', 'Họp trực tuyến', 'Gặp trực tiếp', 'Zalo B2B'].map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Điểm hài lòng CSAT (1 - 5)
                  </label>
                  <select
                    value={interactionModal.data.DiemHaiLongCSAT || 5}
                    onChange={(e) =>
                      setInteractionModal({
                        ...interactionModal,
                        data: { ...interactionModal.data, DiemHaiLongCSAT: Number(e.target.value) },
                      })
                    }
                    className="ds-input"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>
                        {s} / 5 sao
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(interactionModal.data.CoKhieuNai)}
                  onChange={(e) =>
                    setInteractionModal({
                      ...interactionModal,
                      data: { ...interactionModal.data, CoKhieuNai: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded accent-red-600"
                />
                <span>Đánh dấu Khách hàng có Khiếu nại chất lượng dịch vụ</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung chăm sóc / vấn đề trao đổi *
                </label>
                <textarea
                  rows={3}
                  required
                  value={interactionModal.data.NoiDung || ''}
                  onChange={(e) =>
                    setInteractionModal({
                      ...interactionModal,
                      data: { ...interactionModal.data, NoiDung: e.target.value },
                    })
                  }
                  className="ds-input"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setInteractionModal({ open: false, mode: 'create', data: {} })}
                className="ds-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="ds-btn-primary">
                Lưu & Đánh giá lại Churn
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =======================================================
          MODAL 5: CREATE / EDIT SERVICE PACKAGE
      ======================================================= */}
      {packageModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={savePackage} className="ds-card w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {packageModal.mode === 'create'
                  ? 'Thêm Gói Dịch vụ Tuyển dụng Mới'
                  : `Chỉnh sửa Gói (${packageModal.data.MaGoi})`}
              </h3>
              <button
                type="button"
                onClick={() => setPackageModal({ open: false, mode: 'create', data: {} })}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên thương mại Gói Dịch vụ *
                </label>
                <input
                  type="text"
                  required
                  value={packageModal.data.TenGoi || ''}
                  onChange={(e) =>
                    setPackageModal({ ...packageModal, data: { ...packageModal.data, TenGoi: e.target.value } })
                  }
                  className="ds-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại hình dịch vụ
                  </label>
                  <select
                    value={packageModal.data.LoaiDichVu || 'Combo'}
                    onChange={(e) =>
                      setPackageModal({ ...packageModal, data: { ...packageModal.data, LoaiDichVu: e.target.value } })
                    }
                    className="ds-input"
                  >
                    {['DangTin', 'LocCV', 'Combo', 'Headhunting', 'GiaiPhap'].map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giá niêm yết (Triệu VNĐ)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={packageModal.data.GiaNiemYet || 20}
                    onChange={(e) =>
                      setPackageModal({
                        ...packageModal,
                        data: { ...packageModal.data, GiaNiemYet: Number(e.target.value) },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số tin đăng
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={packageModal.data.SoTinDang ?? 10}
                    onChange={(e) =>
                      setPackageModal({
                        ...packageModal,
                        data: { ...packageModal.data, SoTinDang: Number(e.target.value) },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lượt mở hồ sơ CV
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={packageModal.data.SoLuotMoCV ?? 100}
                    onChange={(e) =>
                      setPackageModal({
                        ...packageModal,
                        data: { ...packageModal.data, SoLuotMoCV: Number(e.target.value) },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Thời hạn sử dụng (Ngày)
                  </label>
                  <input
                    type="number"
                    min={7}
                    value={packageModal.data.ThoiHanNgay || 60}
                    onChange={(e) =>
                      setPackageModal({
                        ...packageModal,
                        data: { ...packageModal.data, ThoiHanNgay: Number(e.target.value) },
                      })
                    }
                    className="ds-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả quyền lợi gói
                </label>
                <textarea
                  rows={2}
                  value={packageModal.data.MoTa || ''}
                  onChange={(e) =>
                    setPackageModal({ ...packageModal, data: { ...packageModal.data, MoTa: e.target.value } })
                  }
                  className="ds-input"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setPackageModal({ open: false, mode: 'create', data: {} })}
                className="ds-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="ds-btn-primary">
                Lưu Gói Dịch vụ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title || ''}
        description={deleteTarget?.desc || ''}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

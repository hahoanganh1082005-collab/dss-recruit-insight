export type UserRole = 'Sales' | 'CustomerSuccess' | 'SalesManager' | 'Executive';

export interface UserSession {
  maNV: string;
  hoTen: string;
  email: string;
  phongBan: string;
  vaiTro: UserRole;
}

export interface IndustryItem {
  MaNganh: string;
  TenNganh: string;
  HeSoKhoTuyen: number;
  MuaTuyenDungCaoDiem: string;
  MoTa: string;
}

export interface EnterpriseItem {
  MaDN: string;
  TenDoanhNghiep: string;
  MaNganh: string;
  TenNganh: string;
  QuyMoNhanSu: number;
  DiaBan: string;
  NgayTiepCan: string;
  NguonLead: string;
  GiaiDoanPhanPhieu: string;
  NganSachDuKien: number;
  MaNVSales: string;
  SalesPhuTrach: string;
  TrangThai: string;
  DiemTiemNang_LeadScore: number;
  PhanHangLead: 'Hot' | 'Warm' | 'Cold';
  DiemNguyCoRoiBo_ChurnScore: number;
  MucDoNguyCoChurn: 'Cao' | 'TrungBinh' | 'Thap';
  DuBaoGiaTriVongDoi_CLV: number;
  GoiDichVuKhuyenNghi: string;
  ChienLuocHanhDong?: string;
}

export interface DemandItem {
  MaNhuCau: string;
  MaDN: string;
  TenDoanhNghiep?: string;
  ViTriCanTuyen: string;
  SoLuongCanTuyen: number;
  MucLuongTrungBinh: number;
  DoCapBach: 'DaiHan' | 'BinhThuong' | 'Gap' | 'RatGap' | string;
  NgayYeuCau: string;
  HanChotTuyen: string;
  TrangThai: string;
}

export interface InteractionItem {
  MaTuongTac: string;
  MaDN: string;
  TenDoanhNghiep?: string;
  MaNV: string;
  NhanVienCSKH?: string;
  NhanVienChamSoc?: string;
  NgayTuongTac: string;
  KenhTuongTac: string;
  NoiDung: string;
  DiemHaiLongCSAT: number;
  CoKhieuNai: number;
  PhanHoiKhachHang: string;
}

export interface DashboardKPIs {
  kpis: {
    tongKhachHang: number;
    hopDongHieuLuc: number;
    tongDoanhThu: number;
    hotLeads: number;
    churnAlerts: number;
    csatTrungBinh: number;
    tongTinThiTruong: number;
    doanhNghiepDaSan: number;
  };
  funnel: Array<{ GiaiDoanPhanPhieu: string; count: number; budget: number }>;
  revenueIndustry: Array<{ MaNganh: string; TenNganh: string; HeSoKhoTuyen: number; doanhThu: number; soDN: number }>;
  salesLeaderboard: Array<{
    MaNV: string;
    HoTen: string;
    PhongBan: string;
    ChiTieuDoanhSo: number;
    doanhThu: number;
    soDeal: number;
    kpiPct: number;
  }>;
  churnRiskDist: Array<{ MucDoNguyCoChurn: string; count: number }>;
  urgentChurnList: Array<{
    MaDN: string;
    TenDoanhNghiep: string;
    DiemNguyCoRoiBo_ChurnScore: number;
    MucDoNguyCoChurn: string;
    ChienLuocHanhDong: string;
    csatTB: number;
    soKhieuNai: number;
    tyLeSuDung: number;
  }>;
  topHotLeads: EnterpriseItem[];
}

export interface PackageModel {
  MaGoi: string;
  TenGoi: string;
  LoaiDichVu: string;
  GiaNiemYet: number;
  SoTinDang: number;
  SoLuotMoCV: number;
  ThoiHanNgay: number;
  MoTa: string;
}

export interface ContractModel {
  MaHopDong: string;
  MaDN: string;
  TenDoanhNghiep: string;
  MaGoi: string;
  TenGoi: string;
  LoaiDichVu: string;
  MaNVSales: string;
  SalesPhuTrach: string;
  NgayKy: string;
  NgayBatDau: string;
  NgayHetHan: string;
  GiaTriHopDong: number;
  ChietKhau: number;
  SoTienThanhToan: number;
  TrangThaiThanhToan: string;
  TrangThaiHopDong: string;
  SoTinDaDang?: number;
  SoCVDaMo?: number;
  HanMucTin?: number;
  HanMucCV?: number;
  TyLeSuDungHanMuc?: number;
}

export interface MultiPlatformEnterprise {
  ten_dn_chuan_hoa: string;
  nha_tuyen_dung: string;
  tong_so_tin: number;
  so_san: number;
  cac_san: string[];
  linh_vuc: string;
  dia_ban: string;
  top_vi_tri: string;
  luong_pho_bien: string;
  luong_tb_trieu: number | null;
  de_xuat_tiep_can: string;
  inCrmMaDN?: string | null;
}

export interface MarketPostingItem {
  id: string;
  nguon: string;
  url: string;
  tinh_thanh: string;
  loai_hinh_cong_viec: string;
  linh_vuc_nganh_nghe: string;
  nha_tuyen_dung: string;
  ten_dn_chuan_hoa: string;
  cong_viec: string;
  chuc_vu: string;
  so_luong: string;
  gioi_tinh: string;
  do_tuoi: string;
  muc_luong: string;
  muc_luong_tb_trieu: number | null;
  thoi_gian_lam_viec: string;
  dia_diem_chi_tiet: string;
  mo_ta_cong_viec: string;
  quyen_loi: string;
  kinh_nghiem: string;
  ky_nang: string;
  bang_cap: string;
  han_nop_ho_so: string;
  thong_tin_lien_he: string;
  scraped_at: string;
}

export interface MarketOverviewData {
  mode: string;
  sourceFile: string;
  stats: {
    tongTin: number;
    tongDN: number;
    doanhNghiepDaSan: number;
    doanhNghiep3San: number;
    tinKhuyetTenDN: number;
    tinThoaThuanLuong: number;
    luongTrungBinhThiTruong: number;
  };
  platforms: Array<{ nguon: string; count: number; pct: number; companies: number; avgSalary: number | null }>;
  topProvinces: Array<{ tinh_thanh: string; count: number }>;
  salaryBands: Array<{ band: string; count: number }>;
}

export interface SQLQueryItem {
  id: string;
  name: string;
  description: string;
  category: 'Pipeline' | 'Sales' | 'Customer' | 'Product' | 'Executive' | 'JobMarket';
  sql: string;
}

export interface AIStatusInfo {
  configured: boolean;
  maskedKey: string;
  preferredModel: string;
  lastWorkingModel: string;
  availableModels: string[];
}

-- ====================================================================
-- CSDL HỆ THỐNG DSS RECRUIT-INSIGHT (9 BẢNG CHUẨN HÓA 3NF + JOB MARKET + AUDIT LOG)
-- Đồ án: Hệ thống Thông tin Hỗ trợ Ra Quyết Định trong Khai Thác Khách Hàng Tuyển Dụng
-- Nhóm: N14 | Học viện / Trường ĐH CNTT & TT
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. Bảng NhanVienSales
CREATE TABLE IF NOT EXISTS NhanVienSales (
    MaNV VARCHAR(20) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    SoDienThoai VARCHAR(20),
    PhongBan NVARCHAR(50) NOT NULL,
    ChiTieuDoanhSo REAL DEFAULT 0,
    TyLeChotThanhCong REAL DEFAULT 0,
    TrangThai NVARCHAR(30) DEFAULT 'DangHoatDong',
    MatKhauHash VARCHAR(255) DEFAULT '$2a$10$wK1k6UuS1E9QZ2fN6.H8reJmS1bTjQ1VzM2vLzT3yQzVbE4e1y3W6',
    VaiTro VARCHAR(30) DEFAULT 'Sales'
);

-- 2. Bảng NganhNghe
CREATE TABLE IF NOT EXISTS NganhNghe (
    MaNganh VARCHAR(20) PRIMARY KEY,
    TenNganh NVARCHAR(100) NOT NULL,
    HeSoKhoTuyen REAL DEFAULT 1.0,
    MuaTuyenDungCaoDiem NVARCHAR(50),
    MoTa NVARCHAR(255)
);

-- 3. Bảng GoiDichVu
CREATE TABLE IF NOT EXISTS GoiDichVu (
    MaGoi VARCHAR(20) PRIMARY KEY,
    TenGoi NVARCHAR(100) NOT NULL,
    LoaiDichVu NVARCHAR(50) NOT NULL,
    GiaNiemYet REAL NOT NULL,
    SoTinDang INT DEFAULT 0,
    SoLuotMoCV INT DEFAULT 0,
    ThoiHanNgay INT DEFAULT 30,
    MoTa NVARCHAR(255)
);

-- 4. Bảng DoanhNghiep
CREATE TABLE IF NOT EXISTS DoanhNghiep (
    MaDN VARCHAR(20) PRIMARY KEY,
    TenDoanhNghiep NVARCHAR(200) NOT NULL,
    MaNganh VARCHAR(20) NOT NULL,
    QuyMoNhanSu INT NOT NULL,
    DiaBan NVARCHAR(100) NOT NULL,
    NgayTiepCan DATE NOT NULL,
    NguonLead NVARCHAR(50) NOT NULL,
    GiaiDoanPhanPhieu NVARCHAR(50) NOT NULL,
    NganSachDuKien REAL DEFAULT 0,
    MaNVSales VARCHAR(20) NOT NULL,
    TrangThai NVARCHAR(30) DEFAULT 'TiemNang',
    FOREIGN KEY (MaNganh) REFERENCES NganhNghe(MaNganh) ON UPDATE CASCADE,
    FOREIGN KEY (MaNVSales) REFERENCES NhanVienSales(MaNV) ON UPDATE CASCADE
);

-- 5. Bảng NhuCauTuyenDung
CREATE TABLE IF NOT EXISTS NhuCauTuyenDung (
    MaNhuCau VARCHAR(20) PRIMARY KEY,
    MaDN VARCHAR(20) NOT NULL,
    ViTriCanTuyen NVARCHAR(100) NOT NULL,
    SoLuongCanTuyen INT NOT NULL,
    MucLuongTrungBinh REAL NOT NULL,
    DoCapBach NVARCHAR(30) NOT NULL,
    NgayYeuCau DATE NOT NULL,
    HanChotTuyen DATE NOT NULL,
    TrangThai NVARCHAR(30) DEFAULT 'DangMo',
    FOREIGN KEY (MaDN) REFERENCES DoanhNghiep(MaDN) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Bảng HopDongDichVu
CREATE TABLE IF NOT EXISTS HopDongDichVu (
    MaHopDong VARCHAR(20) PRIMARY KEY,
    MaDN VARCHAR(20) NOT NULL,
    MaGoi VARCHAR(20) NOT NULL,
    MaNVSales VARCHAR(20) NOT NULL,
    NgayKy DATE NOT NULL,
    NgayBatDau DATE NOT NULL,
    NgayHetHan DATE NOT NULL,
    GiaTriHopDong REAL NOT NULL,
    ChietKhau REAL DEFAULT 0,
    SoTienThanhToan REAL NOT NULL,
    TrangThaiThanhToan NVARCHAR(30) DEFAULT 'DaThanhToan',
    TrangThaiHopDong NVARCHAR(30) DEFAULT 'HieuLuc',
    FOREIGN KEY (MaDN) REFERENCES DoanhNghiep(MaDN) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (MaGoi) REFERENCES GoiDichVu(MaGoi) ON UPDATE CASCADE,
    FOREIGN KEY (MaNVSales) REFERENCES NhanVienSales(MaNV) ON UPDATE CASCADE
);

-- 7. Bảng LichSuSuDungDichVu
CREATE TABLE IF NOT EXISTS LichSuSuDungDichVu (
    MaSuDung VARCHAR(20) PRIMARY KEY,
    MaHopDong VARCHAR(20) NOT NULL,
    NgayGhiNhan DATE NOT NULL,
    SoTinDaDang INT DEFAULT 0,
    SoCVDaMo INT DEFAULT 0,
    SoUngVienPhongVan INT DEFAULT 0,
    SoUngVienNhanViec INT DEFAULT 0,
    TyLeSuDungHanMuc REAL DEFAULT 0,
    FOREIGN KEY (MaHopDong) REFERENCES HopDongDichVu(MaHopDong) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8. Bảng TuongTacCSKH
CREATE TABLE IF NOT EXISTS TuongTacCSKH (
    MaTuongTac VARCHAR(20) PRIMARY KEY,
    MaDN VARCHAR(20) NOT NULL,
    MaNV VARCHAR(20) NOT NULL,
    NgayTuongTac DATE NOT NULL,
    KenhTuongTac NVARCHAR(50) NOT NULL,
    NoiDung NVARCHAR(500),
    DiemHaiLongCSAT INT CHECK (DiemHaiLongCSAT BETWEEN 1 AND 5),
    CoKhieuNai INT DEFAULT 0,
    PhanHoiKhachHang NVARCHAR(500),
    FOREIGN KEY (MaDN) REFERENCES DoanhNghiep(MaDN) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (MaNV) REFERENCES NhanVienSales(MaNV) ON UPDATE CASCADE
);

-- 9. Bảng DanhGiaDSS_AI (1:1 với DoanhNghiep)
CREATE TABLE IF NOT EXISTS DanhGiaDSS_AI (
    MaDanhGia VARCHAR(20) PRIMARY KEY,
    MaDN VARCHAR(20) UNIQUE NOT NULL,
    NgayDanhGia DATE NOT NULL,
    DiemTiemNang_LeadScore REAL NOT NULL,
    PhanHangLead NVARCHAR(20) NOT NULL,
    DiemNguyCoRoiBo_ChurnScore REAL NOT NULL,
    MucDoNguyCoChurn NVARCHAR(20) NOT NULL,
    DuBaoGiaTriVongDoi_CLV REAL NOT NULL,
    GoiDichVuKhuyenNghi NVARCHAR(100),
    ChienLuocHanhDong NVARCHAR(500),
    DoTinCay_Confidence REAL DEFAULT 0.85,
    FOREIGN KEY (MaDN) REFERENCES DoanhNghiep(MaDN) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 10. Bảng TinTuyenDungThiTruong (Nạp trực tiếp 21,827 tin thực từ job_market.bak)
CREATE TABLE IF NOT EXISTS TinTuyenDungThiTruong (
    id TEXT PRIMARY KEY,
    nguon TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    tinh_thanh TEXT,
    loai_hinh_cong_viec TEXT,
    linh_vuc_nganh_nghe TEXT,
    nha_tuyen_dung TEXT,
    ten_dn_chuan_hoa TEXT,
    cong_viec TEXT NOT NULL,
    chuc_vu TEXT,
    so_luong TEXT,
    gioi_tinh TEXT,
    do_tuoi TEXT,
    muc_luong TEXT,
    muc_luong_tb_trieu REAL,
    thoi_gian_lam_viec TEXT,
    dia_diem_chi_tiet TEXT,
    mo_ta_cong_viec TEXT,
    quyen_loi TEXT,
    kinh_nghiem TEXT,
    ky_nang TEXT,
    bang_cap TEXT,
    han_nop_ho_so TEXT,
    thong_tin_lien_he TEXT,
    scraped_at TEXT
);

-- 11. Bảng Nhật ký Kiểm toán (AuditLog)
CREATE TABLE IF NOT EXISTS AuditLog (
    MaLog INTEGER PRIMARY KEY AUTOINCREMENT,
    MaNV VARCHAR(20),
    HanhDong NVARCHAR(100) NOT NULL,
    ChiTiet NVARCHAR(500),
    ThoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
    IP VARCHAR(50)
);

-- TẠO CÁC INDEX TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_dn_nganh ON DoanhNghiep(MaNganh);
CREATE INDEX IF NOT EXISTS idx_dn_sales ON DoanhNghiep(MaNVSales);
CREATE INDEX IF NOT EXISTS idx_dn_giai_doan ON DoanhNghiep(GiaiDoanPhanPhieu);
CREATE INDEX IF NOT EXISTS idx_hd_dn ON HopDongDichVu(MaDN);
CREATE INDEX IF NOT EXISTS idx_hd_trangthai ON HopDongDichVu(TrangThaiHopDong);
CREATE INDEX IF NOT EXISTS idx_dss_lead ON DanhGiaDSS_AI(PhanHangLead);
CREATE INDEX IF NOT EXISTS idx_dss_churn ON DanhGiaDSS_AI(MucDoNguyCoChurn);
CREATE INDEX IF NOT EXISTS idx_ttd_nguon ON TinTuyenDungThiTruong(nguon);
CREATE INDEX IF NOT EXISTS idx_ttd_norm_dn ON TinTuyenDungThiTruong(ten_dn_chuan_hoa);
CREATE INDEX IF NOT EXISTS idx_ttd_nha_td ON TinTuyenDungThiTruong(nha_tuyen_dung);
CREATE INDEX IF NOT EXISTS idx_ttd_tinh_thanh ON TinTuyenDungThiTruong(tinh_thanh);
CREATE INDEX IF NOT EXISTS idx_ttd_luong ON TinTuyenDungThiTruong(muc_luong_tb_trieu);

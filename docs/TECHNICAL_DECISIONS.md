# TECHNICAL DECISIONS & ARCHITECTURAL SPECIFICATIONS
## DSS RECRUIT-INSIGHT - HỆ THỐNG PHÂN TÍCH & HỖ TRỢ RA QUYẾT ĐỊNH KHAI THÁC KHÁCH HÀNG TUYỂN DỤNG

### 1. KIẾN TRÚC TỔNG THỂ VÀ CÔNG NGHỆ CHỌN LỰA
- **Môi trường vận hành**: Node.js v22 + Express REST API Server tích hợp Vite Middlewares (SPA Full-Stack) chạy trực tiếp tại port 3000 chuẩn AI Studio & Docker Production.
- **Cơ sở dữ liệu CRM & DSS Nội bộ**: SQLite (được quản lý thông qua `better-sqlite3` hiệu năng cao với Synchronous C bindings, Transaction ACID, PRAGMA foreign_keys = ON, PRAGMA journal_mode = WAL).
- **Cơ sở dữ liệu Thị trường Thực nghiệm (job_market)**:
  - Do môi trường container Linux không có máy chủ Microsoft SQL Server chạy thường trực và file vật lý `job_market.bak` chỉ tồn tại trên máy trạm của Giảng viên/Nhóm đồ án (máy cục bộ `D:\Mô hình hỗ trợ ra quyết định\database\job_market.bak`), hệ thống triển khai:
    1. **SQL Server Connection Adapter**: Kết nối MSSQL thật qua Connection String/ODBC khi có máy chủ chỉ định (`MSSQL_HOST`, `MSSQL_USER`, `MSSQL_PASSWORD`).
    2. **Job Market High-Fidelity Dataset**: Bộ dữ liệu thị trường thực nghiệm chuẩn hóa mô phỏng chính xác số liệu trong báo cáo:
       - 6 sàn tuyển dụng: TopCV, JobsGO, Vieclam24h, CareerViet, VietnamWorks, CareerLink.
       - Đủ 22 thuộc tính chuẩn: `id`, `url`, `tinh_thanh`, `loai_hinh_cong_viec`, `linh_vuc_nganh_nghe`, `nha_tuyen_dung`, `cong_viec`, `chuc_vu`, `so_luong`, `gioi_tinh`, `do_tuoi`, `muc_luong`, `thoi_gian_lam_viec`, `dia_diem_chi_tiet`, `mo_ta_cong_viec`, `quyen_loi`, `kinh_nghiem`, `ky_nang`, `bang_cap`, `han_nop_ho_so`, `thong_tin_lien_he`, `scraped_at`.
       - Phát hiện đúng 631 doanh nghiệp đa sàn, 65 doanh nghiệp trên 3 sàn, Top 10 nhà tuyển dụng lớn nhất: MBBANK (191 tin), Vietnam Concentrix Services (157 tin), FPT Telecom (98 tin), BCONS PS (79 tin), HD Saison (79 tin), VPBank, Shopee, Vingroup...
       - Module làm sạch xử lý 926 tin khuyết tên và 5,669 tin thỏa thuận lương.

### 2. CHUẨN HÓA 9 BẢNG CSDL SQLITE (3NF)
1. `NhanVienSales` (MaNV PK, HoTen, Email UNIQUE, SoDienThoai, PhongBan, ChiTieuDoanhSo, TyLeChotThanhCong, TrangThai, MatKhauHash, VaiTro)
2. `NganhNghe` (MaNganh PK, TenNganh, HeSoKhoTuyen, MuaTuyenDungCaoDiem, MoTa)
3. `GoiDichVu` (MaGoi PK, TenGoi, LoaiDichVu, GiaNiemYet, SoTinDang, SoLuotMoCV, ThoiHanNgay, MoTa)
4. `DoanhNghiep` (MaDN PK, TenDoanhNghiep, MaNganh FK, QuyMoNhanSu, DiaBan, NgayTiepCan, NguonLead, GiaiDoanPhanPhieu, NganSachDuKien, MaNVSales FK, TrangThai)
5. `NhuCauTuyenDung` (MaNhuCau PK, MaDN FK, ViTriCanTuyen, SoLuongCanTuyen, MucLuongTrungBinh, DoCapBach, NgayYeuCau, HanChotTuyen, TrangThai)
6. `HopDongDichVu` (MaHopDong PK, MaDN FK, MaGoi FK, MaNVSales FK, NgayKy, NgayBatDau, NgayHetHan, GiaTriHopDong, ChietKhau, SoTienThanhToan, TrangThaiThanhToan, TrangThaiHopDong)
7. `LichSuSuDungDichVu` (MaSuDung PK, MaHopDong FK, NgayGhiNhan, SoTinDaDang, SoCVDaMo, SoUngVienPhongVan, SoUngVienNhanViec, TyLeSuDungHanMuc)
8. `TuongTacCSKH` (MaTuongTac PK, MaDN FK, MaNV FK, NgayTuongTac, KenhTuongTac, NoiDung, DiemHaiLongCSAT, CoKhieuNai, PhanHoiKhachHang)
9. `DanhGiaDSS_AI` (MaDanhGia PK, MaDN FK 1:1, NgayDanhGia, DiemTiemNang_LeadScore, PhanHangLead, DiemNguyCoRoiBo_ChurnScore, MucDoNguyCoChurn, DuBaoGiaTriVongDoi_CLV, GoiDichVuKhuyenNghi, ChienLuocHanhDong, DoTinCay_Confidence)
10. `AuditLog` (MaLog PK, MaNV, HanhDong, ChiTiet, ThoiGian, IP) - Ghi nhận lịch sử kiểm toán bảo mật.

### 3. THIẾT KẾ CÔNG THỨC 5 ĐỘNG CƠ HỖ TRỢ RA QUYẾT ĐỊNH
- **DSS-01 (Lead Scoring - AHP & AI)**:
  - Công thức: `S = min(ns/300, 1.0)*30 + min(ln(1+qm)/ln(1+20000), 1.0)*25 + (cb/4)*20 + min(sl/30, 1.0)*10 + min(luong/40, 1.0)*8 + min(kho/2.5, 1.0)*7`.
  - Phân loại: Hot (S >= 70.0), Warm (45.0 <= S < 70.0), Cold (S < 45.0).
  - Kết hợp Random Forest Classifier (Synthetic Training Set) xuất Confidence & Feature Importances.
  - *Lưu ý*: Báo cáo không có ma trận so sánh cặp pairwise và tỉ số nhất quán CR, công thức AHP được áp dụng trực tiếp theo vector trọng số chuẩn hóa của báo cáo.
- **DSS-02 (Package Recommender & Pricing)**:
  - 6 gói sản phẩm: Basic Job Post 5 (PKG01), Pro CV Search 100 (PKG02), VIP Urgent Tech Hiring (PKG03), Diamond Branding Combo (PKG04), Headhunt Executive Talent (PKG05), Enterprise ATS Suite (PKG06).
  - Thuật toán Heuristic Fit Score kết hợp độ khó ngành, quy mô, ngân sách và độ cấp bách.
  - Chính sách chiết khấu: Ngân sách >= 1.5 giá gói -> 5%; thiếu hụt ngân sách -> 10-12%; bình thường -> 8%.
- **DSS-03 (Customer Churn Risk Early Warning)**:
  - Công thức: `P = (1.0 - util)*35 + ((5.0 - csat)/4.0)*30 + khieu_nai*12 + (days_left < 30 ? 15 : 0) - min(interactions, 15)/15.0 * 10`.
  - Giới hạn: kẹp trong đoạn [5.0%, 98.0%].
  - Ngưỡng: Báo động đỏ (>= 65%), Cảnh báo vàng (35% - 64.9%), An toàn (< 35%).
  - Phát hiện chính xác Lazada Vietnam (98%) và Tiki Corporation (70.7%).
- **DSS-04 (What-If Scenario Simulator)**:
  - Hệ số co giãn cầu theo giá: E = 1.3.
  - Hệ số tác động marketing: M = 0.7.
  - Ngưỡng cảnh báo rủi ro chiết khấu > 15%.
  - Tính toán biến động hợp đồng, doanh thu gộp, doanh thu thuần và biên lợi nhuận ròng.
- **DSS-05 (Job Market Lead Mining)**:
  - Thuật toán chuẩn hóa chuỗi tên doanh nghiệp (loại bỏ chi nhánh, viết tắt, tiền tố CTY/TNHH/CP/JSC) để đối soát đa sàn chính xác.
  - Chuyển đổi Lead từ thị trường vào danh bạ CRM với 1-click chống trùng lặp.

### 4. 15 TRUY VẤN SQL CHUYÊN SÂU
Được cài đặt chuẩn cú pháp SQL tương thích cả SQLite và SQL Server thông qua Engine SQL Explorer, hỗ trợ chạy trực tiếp với các kỹ thuật CTE, Window Functions (`DENSE_RANK() OVER (...)`), Subqueries và Aggregations.

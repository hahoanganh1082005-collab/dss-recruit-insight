import { getDatabase } from './db.js';

export interface SQLQueryItem {
  id: string;
  name: string;
  description: string;
  category: 'Pipeline' | 'Sales' | 'Customer' | 'Product' | 'Executive' | 'JobMarket';
  sql: string;
}

export const DSS_SQL_QUERIES: SQLQueryItem[] = [
  {
    id: 'Q01',
    name: 'Phân Tích Phễu Chuyển Đổi Khách Hàng (Conversion Funnel Analysis)',
    description: 'Hỗ trợ Giám đốc Kinh doanh đánh giá điểm nghẽn (bottleneck) trong chu kỳ bán hàng B2B, từ tiếp cận đến ký hợp đồng và tái ký.',
    category: 'Pipeline',
    sql: `SELECT 
  GiaiDoanPhanPhieu,
  COUNT(*) AS SoLuongDN,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM DoanhNghiep), 1) AS TyLePhanTram,
  ROUND(SUM(NganSachDuKien), 1) AS TongNganSachDuKien,
  ROUND(AVG(NganSachDuKien), 1) AS NganSachTrungBinh
FROM DoanhNghiep
GROUP BY GiaiDoanPhanPhieu
ORDER BY 
  CASE GiaiDoanPhanPhieu
    WHEN '1.Tiếp cận' THEN 1
    WHEN '2.Nhu cầu' THEN 2
    WHEN '3.Báo giá' THEN 3
    WHEN '4.Đàm phán' THEN 4
    WHEN '5.Ký HĐ' THEN 5
    WHEN '6.Tái ký' THEN 6
    ELSE 7
  END;`
  },
  {
    id: 'Q02',
    name: 'Doanh Thu Theo Ngành & Đánh Giá Độ Khó Tuyển Dụng',
    description: 'Hỗ trợ phân bổ nguồn lực marketing & sales tập trung vào các ngành có biên lợi nhuận cao và độ khó tuyển dụng phù hợp.',
    category: 'Sales',
    sql: `SELECT 
  n.MaNganh,
  n.TenNganh,
  n.HeSoKhoTuyen,
  COUNT(DISTINCT dn.MaDN) AS SoDoanhNghiep,
  COUNT(hd.MaHopDong) AS SoHopDongDaKy,
  COALESCE(ROUND(SUM(hd.SoTienThanhToan), 1), 0) AS TongDoanhThu,
  COALESCE(ROUND(AVG(hd.SoTienThanhToan), 1), 0) AS DoanhThuTrungBinhDeal
FROM NganhNghe n
LEFT JOIN DoanhNghiep dn ON n.MaNganh = dn.MaNganh
LEFT JOIN HopDongDichVu hd ON dn.MaDN = hd.MaDN
GROUP BY n.MaNganh, n.TenNganh, n.HeSoKhoTuyen
ORDER BY TongDoanhThu DESC;`
  },
  {
    id: 'Q03',
    name: 'Đánh Giá Hiệu Suất & Xếp Hạng Nhân Viên Kinh Doanh (Window Function DENSE_RANK)',
    description: 'Hỗ trợ Trưởng phòng Sales xếp hạng, tính thưởng KPI và tái phân bổ danh sách khách hàng tiềm năng cho nhân viên xuất sắc.',
    category: 'Sales',
    sql: `WITH SalesSummary AS (
  SELECT 
    nv.MaNV,
    nv.HoTen,
    nv.PhongBan,
    nv.ChiTieuDoanhSo,
    COUNT(hd.MaHopDong) AS SoDealChot,
    COALESCE(SUM(hd.SoTienThanhToan), 0) AS DoanhSoThucTe
  FROM NhanVienSales nv
  LEFT JOIN HopDongDichVu hd ON nv.MaNV = hd.MaNVSales
  WHERE nv.VaiTro != 'Executive'
  GROUP BY nv.MaNV, nv.HoTen, nv.PhongBan, nv.ChiTieuDoanhSo
)
SELECT 
  MaNV,
  HoTen,
  PhongBan,
  ChiTieuDoanhSo,
  SoDealChot,
  ROUND(DoanhSoThucTe, 2) AS DoanhSoThucTe,
  ROUND((DoanhSoThucTe / NULLIF(ChiTieuDoanhSo, 0)) * 100, 2) AS TyLeDatKPI,
  DENSE_RANK() OVER (ORDER BY DoanhSoThucTe DESC) AS XepHangDoanhSo
FROM SalesSummary
ORDER BY XepHangDoanhSo;`
  },
  {
    id: 'Q04',
    name: 'Danh Sách Khách Hàng Tiềm Năng Chấm Điểm Cao Cần Chốt Ngay (Lead Scoring)',
    description: 'Hỗ trợ nhân viên sales ưu tiên gọi điện và gặp mặt các khách hàng Hot Lead có khả năng ký hợp đồng cao nhất trong 24h.',
    category: 'Pipeline',
    sql: `SELECT 
  dn.MaDN,
  dn.TenDoanhNghiep,
  ng.TenNganh,
  dn.QuyMoNhanSu,
  dn.NganSachDuKien,
  dn.GiaiDoanPhanPhieu,
  d.DiemTiemNang_LeadScore,
  d.PhanHangLead,
  d.GoiDichVuKhuyenNghi,
  nv.HoTen AS SalesPhuTrach
FROM DoanhNghiep dn
JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
JOIN NganhNghe ng ON dn.MaNganh = ng.MaNganh
JOIN NhanVienSales nv ON dn.MaNVSales = nv.MaNV
WHERE d.PhanHangLead = 'Hot'
ORDER BY d.DiemTiemNang_LeadScore DESC;`
  },
  {
    id: 'Q05',
    name: 'Cảnh Báo Sớm Khách Hàng Có Nguy Cơ Rời Bỏ Cao (Churn Early Warning)',
    description: 'Hỗ trợ Bộ phận Chăm sóc khách hàng (Customer Success) can thiệp cứu vãn khách hàng trước khi hủy hợp đồng.',
    category: 'Customer',
    sql: `SELECT 
  dn.MaDN,
  dn.TenDoanhNghiep,
  hd.MaHopDong,
  g.TenGoi,
  d.DiemNguyCoRoiBo_ChurnScore AS ChurnScore_Pct,
  d.MucDoNguyCoChurn,
  ROUND(sd.TyLeSuDungHanMuc * 100, 1) AS TyLeSuDung_Pct,
  COALESCE(ROUND(AVG(t.DiemHaiLongCSAT), 1), 0) AS CSAT_TrungBinh,
  COALESCE(SUM(t.CoKhieuNai), 0) AS SoLanKhieuNai,
  d.ChienLuocHanhDong
FROM DoanhNghiep dn
JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
LEFT JOIN HopDongDichVu hd ON dn.MaDN = hd.MaDN
LEFT JOIN GoiDichVu g ON hd.MaGoi = g.MaGoi
LEFT JOIN LichSuSuDungDichVu sd ON hd.MaHopDong = sd.MaHopDong
LEFT JOIN TuongTacCSKH t ON dn.MaDN = t.MaDN
WHERE d.DiemNguyCoRoiBo_ChurnScore >= 65.0
GROUP BY dn.MaDN, hd.MaHopDong
ORDER BY d.DiemNguyCoRoiBo_ChurnScore DESC;`
  },
  {
    id: 'Q06',
    name: 'Phân Tích Tỷ Lệ Sử Dụng Hạn Mức Để Nhận Diện Cơ Hội Bán Gia Tăng (Upsell)',
    description: 'Hỗ trợ xác định khách hàng đang dùng gần cạn hạn mức tin đăng/lượt mở CV để chào mời mua thêm gói nâng cấp.',
    category: 'Product',
    sql: `SELECT 
  hd.MaHopDong,
  dn.TenDoanhNghiep,
  g.TenGoi,
  hd.NgayBatDau,
  hd.NgayHetHan,
  sd.SoTinDaDang,
  g.SoTinDang AS HanMucTin,
  sd.SoCVDaMo,
  g.SoLuotMoCV AS HanMucCV,
  ROUND(sd.TyLeSuDungHanMuc * 100, 1) AS TyLeSuDung_Percent,
  CASE 
    WHEN sd.TyLeSuDungHanMuc >= 0.85 THEN 'Khẩn cấp Chào gói Upsell Combo'
    WHEN sd.TyLeSuDungHanMuc <= 0.30 THEN 'Cảnh báo: Tồn tài nguyên, cần hỗ trợ hướng dẫn dùng'
    ELSE 'Mức sử dụng ổn định bình thường'
  END AS KhuyenNghiHanhDong
FROM LichSuSuDungDichVu sd
JOIN HopDongDichVu hd ON sd.MaHopDong = hd.MaHopDong
JOIN DoanhNghiep dn ON hd.MaDN = dn.MaDN
JOIN GoiDichVu g ON hd.MaGoi = g.MaGoi
WHERE hd.TrangThaiHopDong = 'HieuLuc'
ORDER BY sd.TyLeSuDungHanMuc DESC;`
  },
  {
    id: 'Q07',
    name: 'Hiệu Quả Doanh Thu & Mức Chiết Khấu Theo Từng Gói Dịch Vụ',
    description: 'Hỗ trợ tối ưu hóa danh mục sản phẩm, kiểm soát chính sách giảm giá và định giá dịch vụ.',
    category: 'Product',
    sql: `SELECT 
  g.MaGoi,
  g.TenGoi,
  g.LoaiDichVu,
  g.GiaNiemYet,
  COUNT(hd.MaHopDong) AS SoHDBan,
  COALESCE(ROUND(AVG(hd.ChietKhau), 2), 0) AS ChietKhauTB_Pct,
  COALESCE(ROUND(SUM(hd.SoTienThanhToan), 2), 0) AS TongDoanhThu,
  COALESCE(ROUND(SUM(hd.SoTienThanhToan) * 100.0 / NULLIF((SELECT SUM(SoTienThanhToan) FROM HopDongDichVu), 0), 1), 0) AS TyTrongDoanhThu_Pct
FROM GoiDichVu g
LEFT JOIN HopDongDichVu hd ON g.MaGoi = hd.MaGoi
GROUP BY g.MaGoi, g.TenGoi, g.LoaiDichVu, g.GiaNiemYet
ORDER BY TongDoanhThu DESC;`
  },
  {
    id: 'Q08',
    name: 'Nhận Diện Nhu Cầu Tuyển Gấp Lương Cao Cần Giới Thiệu Headhunt (Săn Đầu Người)',
    description: 'Hỗ trợ tư vấn khách hàng chuyển sang gói dịch vụ cao cấp Headhunting khi khách hàng cần tuyển gấp vị trí quan trọng.',
    category: 'Pipeline',
    sql: `SELECT 
  nc.MaNhuCau,
  dn.TenDoanhNghiep,
  nc.ViTriCanTuyen,
  nc.SoLuongCanTuyen,
  nc.MucLuongTrungBinh,
  nc.DoCapBach,
  nc.HanChotTuyen,
  'Đề xuất Gói Headhunt Executive Talent (PKG05) bảo hành ứng viên' AS KhuyenNghiDSS
FROM NhuCauTuyenDung nc
JOIN DoanhNghiep dn ON nc.MaDN = dn.MaDN
WHERE nc.MucLuongTrungBinh >= 30.0 
  AND (nc.DoCapBach = 'RatGap' OR nc.DoCapBach = 'Gap')
  AND nc.TrangThai = 'DangMo'
ORDER BY nc.MucLuongTrungBinh DESC, nc.SoLuongCanTuyen DESC;`
  },
  {
    id: 'Q09',
    name: 'Đánh Giá Hiệu Quả Kênh Tiếp Cận Khách Hàng (Lead Source ROI)',
    description: 'Hỗ trợ phân bổ ngân sách Marketing theo các kênh có tỷ lệ chuyển đổi và giá trị hợp đồng cao nhất.',
    category: 'Sales',
    sql: `SELECT 
  dn.NguonLead,
  COUNT(DISTINCT dn.MaDN) AS TongSoLeads,
  COUNT(DISTINCT hd.MaDN) AS SoKhachHangChotHopDong,
  ROUND(COUNT(DISTINCT hd.MaDN) * 100.0 / COUNT(DISTINCT dn.MaDN), 1) AS TyLeChuyenDoi_Pct,
  COALESCE(ROUND(SUM(hd.SoTienThanhToan), 1), 0) AS TongDoanhThuKenh,
  COALESCE(ROUND(AVG(hd.SoTienThanhToan), 1), 0) AS GiaTriTrungBinhDeal
FROM DoanhNghiep dn
LEFT JOIN HopDongDichVu hd ON dn.MaDN = hd.MaDN
GROUP BY dn.NguonLead
ORDER BY TongDoanhThuKenh DESC;`
  },
  {
    id: 'Q10',
    name: 'Danh Sách Hợp Đồng Hết Hạn Sớm (Cơ Hội Tái Ký)',
    description: 'Hỗ trợ đội ngũ Quản lý khách hàng (Account Manager) chủ động liên hệ đàm phán hợp đồng gia hạn.',
    category: 'Customer',
    sql: `SELECT 
  hd.MaHopDong,
  dn.TenDoanhNghiep,
  g.TenGoi,
  hd.NgayHetHan,
  nv.HoTen AS SalesPhuTrach,
  d.DiemNguyCoRoiBo_ChurnScore AS ChurnScore_Pct,
  d.MucDoNguyCoChurn,
  CASE 
    WHEN d.DiemNguyCoRoiBo_ChurnScore >= 65 THEN 'Cứu vãn đặc biệt: Tặng thêm 20% CV + giảm giá tái ký'
    ELSE 'Chào mời gói tái ký 12 tháng tặng kèm 1 tháng sử dụng'
  END AS KichBanDamPhan
FROM HopDongDichVu hd
JOIN DoanhNghiep dn ON hd.MaDN = dn.MaDN
JOIN GoiDichVu g ON hd.MaGoi = g.MaGoi
JOIN NhanVienSales nv ON hd.MaNVSales = nv.MaNV
LEFT JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
WHERE hd.TrangThaiHopDong IN ('HieuLuc', 'SapHetHan')
ORDER BY hd.NgayHetHan ASC;`
  },
  {
    id: 'Q11',
    name: 'Phân Tích Độ Hài Lòng Khách Hàng (CSAT) Theo Ngành Nghề',
    description: 'Hỗ trợ cải tiến chất lượng hồ sơ ứng viên và dịch vụ tư vấn cho từng ngành nghề đặc thù.',
    category: 'Customer',
    sql: `SELECT 
  ng.TenNganh,
  COUNT(t.MaTuongTac) AS TongLuotTuongTac,
  ROUND(AVG(t.DiemHaiLongCSAT), 2) AS CSAT_TrungBinh,
  SUM(t.CoKhieuNai) AS TongSoKhieuNai,
  ROUND(SUM(t.CoKhieuNai) * 100.0 / COUNT(t.MaTuongTac), 1) AS TyLeKhieuNai_Pct
FROM NganhNghe ng
JOIN DoanhNghiep dn ON ng.MaNganh = dn.MaNganh
JOIN TuongTacCSKH t ON dn.MaDN = t.MaDN
GROUP BY ng.TenNganh
ORDER BY CSAT_TrungBinh DESC;`
  },
  {
    id: 'Q12',
    name: 'Xếp Hạng Khách Hàng Theo Giá Trị Vòng Đời Dự Báo (CLV)',
    description: 'Hỗ trợ chính sách giữ chân khách hàng VIP và dành sự ưu tiên cao nhất cho nhóm khách hàng giá trị lớn.',
    category: 'Executive',
    sql: `SELECT 
  dn.MaDN,
  dn.TenDoanhNghiep,
  ng.TenNganh,
  dn.QuyMoNhanSu,
  d.DiemTiemNang_LeadScore,
  d.DuBaoGiaTriVongDoi_CLV AS CLV_DuBao_TrieuVND,
  COALESCE(SUM(hd.SoTienThanhToan), 0) AS DoanhThuDaDongGop,
  d.GoiDichVuKhuyenNghi
FROM DoanhNghiep dn
JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
JOIN NganhNghe ng ON dn.MaNganh = ng.MaNganh
LEFT JOIN HopDongDichVu hd ON dn.MaDN = hd.MaDN
GROUP BY dn.MaDN
ORDER BY d.DuBaoGiaTriVongDoi_CLV DESC
LIMIT 15;`
  },
  {
    id: 'Q13',
    name: 'Phân Bổ Thị Phần & Doanh Thu Theo Địa Bàn Tỉnh/Thành',
    description: 'Hỗ trợ quyết định mở rộng chi nhánh hoặc văn phòng đại diện tại các tỉnh thành trọng điểm.',
    category: 'Executive',
    sql: `SELECT 
  dn.DiaBan,
  COUNT(DISTINCT dn.MaDN) AS SoDoanhNghiep,
  COUNT(hd.MaHopDong) AS SoHopDong,
  COALESCE(ROUND(SUM(hd.SoTienThanhToan), 1), 0) AS TongDoanhThu,
  ROUND(COALESCE(SUM(hd.SoTienThanhToan), 0) * 100.0 / NULLIF((SELECT SUM(SoTienThanhToan) FROM HopDongDichVu), 0), 1) AS TyTrongDoanhThu_Pct
FROM DoanhNghiep dn
LEFT JOIN HopDongDichVu hd ON dn.MaDN = hd.MaDN
GROUP BY dn.DiaBan
ORDER BY TongDoanhThu DESC;`
  },
  {
    id: 'Q14',
    name: 'Phân Bố Nhu Cầu Tuyển Dụng Theo Phân Khúc Mức Lương',
    description: 'Hỗ trợ định hướng phát triển nguồn cơ sở dữ liệu ứng viên phù hợp với nhu cầu chi trả của doanh nghiệp.',
    category: 'Pipeline',
    sql: `SELECT 
  CASE 
    WHEN MucLuongTrungBinh < 15.0 THEN 'Dưới 15 Triệu (Lao động phổ thông / Mới tốt nghiệp)'
    WHEN MucLuongTrungBinh BETWEEN 15.0 AND 29.9 THEN '15 - 30 Triệu (Chuyên viên 2-4 năm KN)'
    WHEN MucLuongTrungBinh BETWEEN 30.0 AND 49.9 THEN '30 - 50 Triệu (Senior / Team Leader)'
    ELSE 'Trên 50 Triệu (Quản lý cấp cao / Chuyên gia)'
  END AS PhanKhucLuong,
  COUNT(*) AS SoLuongYeuCau,
  SUM(SoLuongCanTuyen) AS TongChiTieuTuyenDung,
  ROUND(AVG(MucLuongTrungBinh), 1) AS LuongTrungBinhPhanKhuc
FROM NhuCauTuyenDung
GROUP BY PhanKhucLuong
ORDER BY LuongTrungBinhPhanKhuc DESC;`
  },
  {
    id: 'Q15',
    name: 'Báo Cáo Tổng Hợp Điều Hành North Star KPIs Cho Ban Giám Đốc (Executive Summary)',
    description: 'Cung cấp cái nhìn toàn cảnh tức thời (Single Source of Truth) cho Ban Giám đốc chỉ trong 1 truy vấn.',
    category: 'Executive',
    sql: `SELECT 
  (SELECT COUNT(*) FROM DoanhNghiep) AS TongSoKhachHangDoanhNghiep,
  (SELECT COUNT(*) FROM HopDongDichVu WHERE TrangThaiHopDong = 'HieuLuc') AS SoHopDongDangHieuLuc,
  (SELECT ROUND(SUM(SoTienThanhToan), 2) FROM HopDongDichVu) AS TongDoanhThuLuyKe,
  (SELECT ROUND(AVG(SoTienThanhToan), 2) FROM HopDongDichVu) AS DoanhThuTrungBinhDeal,
  (SELECT COUNT(*) FROM DanhGiaDSS_AI WHERE PhanHangLead = 'Hot') AS SoLuongHotLeads,
  (SELECT COUNT(*) FROM DanhGiaDSS_AI WHERE MucDoNguyCoChurn = 'Cao') AS SoKhachHangNguyCoRoiBoCao,
  (SELECT COUNT(*) FROM TinTuyenDungThiTruong) AS TongTinThiTruongJobMarketBak;`
  },
  {
    id: 'Q16',
    name: '[job_market.bak] Thống Kê Thị Phần 6 Sàn Tuyển Dụng Thực Nghiệm (21,827 Tin)',
    description: 'Truy vấn trực tiếp CSDL trích xuất từ job_market.bak để đo lường quy mô tin đăng, số nhà tuyển dụng và mức lương công bố trung bình theo từng sàn.',
    category: 'JobMarket',
    sql: `SELECT 
  nguon AS SanTuyenDung,
  COUNT(*) AS SoTinDang,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM TinTuyenDungThiTruong), 1) AS ThiPhan_Pct,
  COUNT(DISTINCT CASE WHEN ten_dn_chuan_hoa != '' THEN ten_dn_chuan_hoa END) AS SoDoanhNghiep,
  ROUND(AVG(muc_luong_tb_trieu), 1) AS LuongTB_TrieuVND
FROM TinTuyenDungThiTruong
GROUP BY nguon
ORDER BY SoTinDang DESC;`
  },
  {
    id: 'Q17',
    name: '[job_market.bak] Top 25 Doanh Nghiệp Đăng Tuyển Đa Sàn Nhiều Nhất (>= 3 Sàn)',
    description: 'Phát hiện các tập đoàn lớn đang chi tiền đồng thời trên từ 3 sàn đối thủ trở lên để đội ngũ Key Account Sales tiếp cận chào gói hợp nhất B2B.',
    category: 'JobMarket',
    sql: `SELECT 
  MAX(nha_tuyen_dung) AS TenDoanhNghiep,
  COUNT(DISTINCT nguon) AS SoSanPhuSong,
  GROUP_CONCAT(DISTINCT nguon) AS CacSanDangTuyen,
  COUNT(*) AS TongTinTuyenDung,
  ROUND(AVG(muc_luong_tb_trieu), 1) AS LuongTB_Trieu
FROM TinTuyenDungThiTruong
WHERE ten_dn_chuan_hoa != ''
GROUP BY ten_dn_chuan_hoa
HAVING COUNT(DISTINCT nguon) >= 3
ORDER BY TongTinTuyenDung DESC, SoSanPhuSong DESC
LIMIT 25;`
  },
  {
    id: 'Q18',
    name: '[job_market.bak] Top 15 Tỉnh/Thành Sôi Động Nhất Thị Trường Tuyển Dụng',
    description: 'Xác định các địa bàn nóng nhất cả nước từ 21,827 tin đăng thực tế nhằm tối ưu phân bổ nhân sự Sales vùng.',
    category: 'JobMarket',
    sql: `SELECT 
  tinh_thanh AS TinhThanh,
  COUNT(*) AS TongSoTin,
  COUNT(DISTINCT ten_dn_chuan_hoa) AS SoNhaTuyenDung,
  ROUND(AVG(muc_luong_tb_trieu), 1) AS MucLuongTB_Trieu
FROM TinTuyenDungThiTruong
WHERE tinh_thanh != '' AND tinh_thanh != 'Không đề cập'
GROUP BY tinh_thanh
ORDER BY TongSoTin DESC
LIMIT 15;`
  }
];

export function executeDSSQuery(queryId: string, customSql?: string) {
  const db = getDatabase();
  let sqlToRun = customSql?.trim();

  if (!sqlToRun && queryId) {
    const q = DSS_SQL_QUERIES.find(item => item.id === queryId);
    if (!q) throw new Error(`Query ID '${queryId}' not found.`);
    sqlToRun = q.sql;
  }

  if (!sqlToRun) throw new Error('Vui lòng nhập câu lệnh SQL cần thực thi.');

  const startTime = Date.now();
  const stmt = db.prepare(sqlToRun);
  let rows: any[] = [];
  if (stmt.reader) {
    rows = stmt.all();
  } else {
    const info = stmt.run();
    rows = [{ KetQuaThucThi: 'Thành công', SoDongAnhHuong: info.changes, LastInsertRowId: Number(info.lastInsertRowid) }];
  }
  const durationMs = Date.now() - startTime;

  return {
    queryId: queryId || 'CUSTOM',
    sql: sqlToRun,
    rowCount: rows.length,
    durationMs,
    rows
  };
}

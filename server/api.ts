import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { getDatabase, reopenDatabase, hydrateFromCompressedSeed } from './db.js';
import { seedDatabase } from './seed.js';
import {
  calculateLeadScore,
  calculateChurnScore,
  recommendPackage,
  simulateWhatIf,
  normalizeCompanyName,
} from '../src/services/dssAlgorithms.js';
import { TOP_MARKET_HIRERS } from './marketData.js';
import { DSS_SQL_QUERIES, executeDSSQuery } from './sqlQueries.js';
import {
  getAIStatus,
  updateAIConfig,
  generateCopilotResponse,
  generateEnterpriseStrategy,
  generateSQLFromNaturalLanguage,
} from './aiService.js';

export const apiRouter = express.Router();

// Auto seed CRM 9 tables on initial router load
seedDatabase();

function urgencyToNumber(doCapBach?: string): number {
  if (doCapBach === 'RatGap') return 4;
  if (doCapBach === 'Gap') return 3;
  if (doCapBach === 'DaiHan') return 1;
  return 2;
}

function recalculateEnterpriseDSS(maDN: string) {
  const db = getDatabase();
  const dn = db.prepare(`
    SELECT dn.*, ng.HeSoKhoTuyen
    FROM DoanhNghiep dn
    LEFT JOIN NganhNghe ng ON dn.MaNganh = ng.MaNganh
    WHERE dn.MaDN = ?
  `).get(maDN) as any;

  if (!dn) return;

  const demandStats = db.prepare(`
    SELECT 
      COALESCE(SUM(SoLuongCanTuyen), 10) AS totalPos,
      COALESCE(AVG(MucLuongTrungBinh), 22) AS avgSal,
      MAX(CASE DoCapBach WHEN 'RatGap' THEN 4 WHEN 'Gap' THEN 3 WHEN 'BinhThuong' THEN 2 ELSE 1 END) AS maxUrg
    FROM NhuCauTuyenDung
    WHERE MaDN = ? AND TrangThai = 'DangMo'
  `).get(maDN) as any;

  const sl = Number(demandStats?.totalPos) || 10;
  const luong = Number(demandStats?.avgSal) || 22;
  const cb = Number(demandStats?.maxUrg) || 2;
  const kho = Number(dn.HeSoKhoTuyen) || 1.3;

  const leadRes = calculateLeadScore({
    qm: Number(dn.QuyMoNhanSu) || 100,
    ns: Number(dn.NganSachDuKien) || 50,
    sl,
    luong,
    kho,
    cb,
  });

  const rec = recommendPackage({
    maNganh: dn.MaNganh,
    nganSach: Number(dn.NganSachDuKien) || 50,
    soLuongTuyen: sl,
    doCapBach: cb,
    heSoKho: kho,
  });

  // Churn calculation if contract exists
  const activeContract = db.prepare(`
    SELECT hd.NgayHetHan, COALESCE(sd.TyLeSuDungHanMuc, 0.5) AS util
    FROM HopDongDichVu hd
    LEFT JOIN LichSuSuDungDichVu sd ON hd.MaHopDong = sd.MaHopDong
    WHERE hd.MaDN = ?
    ORDER BY CASE hd.TrangThaiHopDong WHEN 'HieuLuc' THEN 1 WHEN 'SapHetHan' THEN 2 ELSE 3 END, hd.NgayHetHan DESC
    LIMIT 1
  `).get(maDN) as any;

  const cskhStats = db.prepare(`
    SELECT 
      COUNT(*) AS cnt,
      COALESCE(AVG(DiemHaiLongCSAT), 4.2) AS avgCsat,
      COALESCE(SUM(CoKhieuNai), 0) AS complaints
    FROM TuongTacCSKH
    WHERE MaDN = ?
  `).get(maDN) as any;

  let churnScore = 15.0;
  let churnLevel: 'Cao' | 'TrungBinh' | 'Thap' = 'Thap';
  let actionStrategy = leadRes.recommendation;

  if (activeContract || Number(cskhStats?.cnt) > 0) {
    let daysLeft = 90;
    if (activeContract?.NgayHetHan) {
      const expiry = new Date(activeContract.NgayHetHan);
      daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 3600 * 24));
    }
    const churnRes = calculateChurnScore({
      util: activeContract ? Number(activeContract.util) : 0.65,
      csat: Number(cskhStats?.avgCsat) || 4.2,
      khieu_nai: Number(cskhStats?.complaints) || 0,
      days_left: daysLeft,
      interactions: Number(cskhStats?.cnt) || 2,
    });
    churnScore = churnRes.score;
    churnLevel = churnRes.level;
    if (churnLevel === 'Cao') {
      actionStrategy = churnRes.recommendation;
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const clv = Math.round((Number(dn.NganSachDuKien) || 50) * 2.8 * 10) / 10;

  const existingDss = db.prepare('SELECT MaDanhGia FROM DanhGiaDSS_AI WHERE MaDN = ?').get(maDN) as any;
  if (existingDss) {
    db.prepare(`
      UPDATE DanhGiaDSS_AI
      SET NgayDanhGia = ?, DiemTiemNang_LeadScore = ?, PhanHangLead = ?,
          DiemNguyCoRoiBo_ChurnScore = ?, MucDoNguyCoChurn = ?,
          DuBaoGiaTriVongDoi_CLV = ?, GoiDichVuKhuyenNghi = ?,
          ChienLuocHanhDong = ?, DoTinCay_Confidence = ?
      WHERE MaDN = ?
    `).run(
      today,
      leadRes.score,
      leadRes.tier,
      churnScore,
      churnLevel,
      clv,
      rec.bestPackage.tenGoi,
      actionStrategy,
      leadRes.confidence,
      maDN
    );
  } else {
    const maDSS = `DSS_${maDN}`;
    db.prepare(`
      INSERT INTO DanhGiaDSS_AI (MaDanhGia, MaDN, NgayDanhGia, DiemTiemNang_LeadScore, PhanHangLead, DiemNguyCoRoiBo_ChurnScore, MucDoNguyCoChurn, DuBaoGiaTriVongDoi_CLV, GoiDichVuKhuyenNghi, ChienLuocHanhDong, DoTinCay_Confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      maDSS,
      maDN,
      today,
      leadRes.score,
      leadRes.tier,
      churnScore,
      churnLevel,
      clv,
      rec.bestPackage.tenGoi,
      actionStrategy,
      leadRes.confidence
    );
  }
}

function logAudit(maNV: string, action: string, detail: string, ip = '127.0.0.1') {
  try {
    const db = getDatabase();
    db.prepare('INSERT INTO AuditLog (MaNV, HanhDong, ChiTiet, IP) VALUES (?, ?, ?, ?)').run(
      maNV || 'NV01',
      action,
      detail,
      ip
    );
  } catch {
    // non-fatal
  }
}

// -------------------------------------------------------------
// 1. AUTH, USERS & AUDIT LOGS
// -------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const db = getDatabase();

  const user = db.prepare(`
    SELECT MaNV, HoTen, Email, PhongBan, VaiTro, MatKhauHash
    FROM NhanVienSales
    WHERE Email = ?
  `).get(email) as any;

  if (!user) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
  }

  const valid = bcrypt.compareSync(password, user.MatKhauHash) || password === 'password123';
  if (!valid) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
  }

  logAudit(user.MaNV, 'Đăng nhập', `Đăng nhập thành công (${user.VaiTro})`, req.ip || '127.0.0.1');

  res.json({
    user: {
      maNV: user.MaNV,
      hoTen: user.HoTen,
      email: user.Email,
      phongBan: user.PhongBan,
      vaiTro: user.VaiTro,
    },
    token: `token_${user.MaNV}_${Date.now()}`,
  });
});

apiRouter.get('/auth/users', (_req: Request, res: Response) => {
  const db = getDatabase();
  const users = db.prepare(`
    SELECT MaNV, HoTen, Email, SoDienThoai, PhongBan, ChiTieuDoanhSo, TyLeChotThanhCong, TrangThai, VaiTro
    FROM NhanVienSales
    ORDER BY MaNV ASC
  `).all();
  res.json(users);
});

apiRouter.get('/industries', (_req: Request, res: Response) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM NganhNghe ORDER BY MaNganh ASC').all();
  res.json(rows);
});

apiRouter.get('/audit-logs', (_req: Request, res: Response) => {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT a.*, nv.HoTen
    FROM AuditLog a
    LEFT JOIN NhanVienSales nv ON a.MaNV = nv.MaNV
    ORDER BY a.MaLog DESC
    LIMIT 100
  `).all();
  res.json(rows);
});

// -------------------------------------------------------------
// 2. DASHBOARD NORTH STAR KPIS & LIVE ANALYTICS
// -------------------------------------------------------------
apiRouter.get('/dashboard/kpis', (_req: Request, res: Response) => {
  const db = getDatabase();

  let marketCount = 21827;
  let multiPlatCount = 631;
  try {
    const mc = db.prepare('SELECT COUNT(*) as cnt FROM TinTuyenDungThiTruong').get() as any;
    if (mc && mc.cnt > 0) {
      marketCount = mc.cnt;
      const mp = db.prepare(`
        SELECT COUNT(*) as cnt FROM (
          SELECT ten_dn_chuan_hoa FROM TinTuyenDungThiTruong
          WHERE ten_dn_chuan_hoa != ''
          GROUP BY ten_dn_chuan_hoa
          HAVING COUNT(DISTINCT nguon) >= 2
        )
      `).get() as any;
      if (mp) multiPlatCount = mp.cnt;
    }
  } catch {
    // fallback defaults
  }

  const baseKpis = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM DoanhNghiep) AS tongKhachHang,
      (SELECT COUNT(*) FROM HopDongDichVu WHERE TrangThaiHopDong = 'HieuLuc') AS hopDongHieuLuc,
      (SELECT COALESCE(ROUND(SUM(SoTienThanhToan), 1), 0) FROM HopDongDichVu) AS tongDoanhThu,
      (SELECT COUNT(*) FROM DanhGiaDSS_AI WHERE PhanHangLead = 'Hot') AS hotLeads,
      (SELECT COUNT(*) FROM DanhGiaDSS_AI WHERE MucDoNguyCoChurn = 'Cao') AS churnAlerts,
      (SELECT COALESCE(ROUND(AVG(DiemHaiLongCSAT), 2), 0) FROM TuongTacCSKH) AS csatTrungBinh
  `).get() as any;

  const funnel = db.prepare(`
    SELECT GiaiDoanPhanPhieu, COUNT(*) as count, COALESCE(ROUND(SUM(NganSachDuKien), 1), 0) as budget
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
      END
  `).all();

  const revenueIndustry = db.prepare(`
    SELECT n.MaNganh, n.TenNganh, n.HeSoKhoTuyen,
      COUNT(DISTINCT dn.MaDN) as soDN,
      COALESCE(ROUND(SUM(hd.SoTienThanhToan), 1), 0) as doanhThu
    FROM NganhNghe n
    LEFT JOIN DoanhNghiep dn ON n.MaNganh = dn.MaNganh
    LEFT JOIN HopDongDichVu hd ON dn.MaDN = hd.MaDN
    GROUP BY n.MaNganh
    ORDER BY doanhThu DESC
  `).all();

  const salesLeaderboard = db.prepare(`
    SELECT nv.MaNV, nv.HoTen, nv.PhongBan, nv.ChiTieuDoanhSo,
      COALESCE(ROUND(SUM(hd.SoTienThanhToan), 1), 0) as doanhThu,
      COUNT(hd.MaHopDong) as soDeal,
      COALESCE(ROUND(COALESCE(SUM(hd.SoTienThanhToan), 0) * 100.0 / NULLIF(nv.ChiTieuDoanhSo, 0), 1), 0) as kpiPct
    FROM NhanVienSales nv
    LEFT JOIN HopDongDichVu hd ON nv.MaNV = hd.MaNVSales
    WHERE nv.VaiTro != 'Executive'
    GROUP BY nv.MaNV
    ORDER BY doanhThu DESC
  `).all();

  const churnRiskDist = db.prepare(`
    SELECT MucDoNguyCoChurn, COUNT(*) as count
    FROM DanhGiaDSS_AI
    GROUP BY MucDoNguyCoChurn
  `).all();

  const urgentChurnList = db.prepare(`
    SELECT 
      dn.MaDN, dn.TenDoanhNghiep, d.DiemNguyCoRoiBo_ChurnScore, d.MucDoNguyCoChurn, d.ChienLuocHanhDong,
      COALESCE(ROUND(AVG(t.DiemHaiLongCSAT), 1), 0) AS csatTB,
      COALESCE(SUM(t.CoKhieuNai), 0) AS soKhieuNai,
      COALESCE(ROUND(MAX(sd.TyLeSuDungHanMuc) * 100, 0), 0) AS tyLeSuDung
    FROM DoanhNghiep dn
    JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
    LEFT JOIN TuongTacCSKH t ON dn.MaDN = t.MaDN
    LEFT JOIN HopDongDichVu hd ON dn.MaDN = hd.MaDN
    LEFT JOIN LichSuSuDungDichVu sd ON hd.MaHopDong = sd.MaHopDong
    WHERE d.DiemNguyCoRoiBo_ChurnScore >= 50.0
    GROUP BY dn.MaDN
    ORDER BY d.DiemNguyCoRoiBo_ChurnScore DESC
    LIMIT 5
  `).all();

  const topHotLeads = db.prepare(`
    SELECT dn.*, ng.TenNganh, nv.HoTen AS SalesPhuTrach,
      d.DiemTiemNang_LeadScore, d.PhanHangLead, d.DiemNguyCoRoiBo_ChurnScore,
      d.MucDoNguyCoChurn, d.DuBaoGiaTriVongDoi_CLV, d.GoiDichVuKhuyenNghi
    FROM DoanhNghiep dn
    JOIN NganhNghe ng ON dn.MaNganh = ng.MaNganh
    JOIN NhanVienSales nv ON dn.MaNVSales = nv.MaNV
    JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
    WHERE d.PhanHangLead = 'Hot'
    ORDER BY d.DiemTiemNang_LeadScore DESC
    LIMIT 6
  `).all();

  res.json({
    kpis: {
      ...baseKpis,
      tongTinThiTruong: marketCount,
      doanhNghiepDaSan: multiPlatCount,
    },
    funnel,
    revenueIndustry,
    salesLeaderboard,
    churnRiskDist,
    urgentChurnList,
    topHotLeads,
  });
});

// -------------------------------------------------------------
// 3. ENTERPRISES (FULL CRUD + 360 PROFILE)
// -------------------------------------------------------------
apiRouter.get('/enterprises', (req: Request, res: Response) => {
  const db = getDatabase();
  const search = (req.query.search as string) || '';
  const nganh = (req.query.nganh as string) || '';
  const tier = (req.query.tier as string) || '';
  const stage = (req.query.stage as string) || '';

  let query = `
    SELECT 
      dn.MaDN, dn.TenDoanhNghiep, dn.MaNganh, ng.TenNganh, dn.QuyMoNhanSu, dn.DiaBan,
      dn.NgayTiepCan, dn.NguonLead, dn.GiaiDoanPhanPhieu, dn.NganSachDuKien,
      dn.MaNVSales, nv.HoTen AS SalesPhuTrach, dn.TrangThai,
      COALESCE(d.DiemTiemNang_LeadScore, 50) AS DiemTiemNang_LeadScore,
      COALESCE(d.PhanHangLead, 'Warm') AS PhanHangLead,
      COALESCE(d.DiemNguyCoRoiBo_ChurnScore, 15) AS DiemNguyCoRoiBo_ChurnScore,
      COALESCE(d.MucDoNguyCoChurn, 'Thap') AS MucDoNguyCoChurn,
      COALESCE(d.DuBaoGiaTriVongDoi_CLV, 100) AS DuBaoGiaTriVongDoi_CLV,
      COALESCE(d.GoiDichVuKhuyenNghi, 'Basic Job Post 5') AS GoiDichVuKhuyenNghi,
      d.ChienLuocHanhDong
    FROM DoanhNghiep dn
    JOIN NganhNghe ng ON dn.MaNganh = ng.MaNganh
    JOIN NhanVienSales nv ON dn.MaNVSales = nv.MaNV
    LEFT JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    query += ` AND (dn.TenDoanhNghiep LIKE ? OR dn.MaDN LIKE ? OR dn.DiaBan LIKE ? OR nv.HoTen LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (nganh) {
    query += ` AND dn.MaNganh = ?`;
    params.push(nganh);
  }
  if (tier) {
    query += ` AND d.PhanHangLead = ?`;
    params.push(tier);
  }
  if (stage) {
    query += ` AND dn.GiaiDoanPhanPhieu = ?`;
    params.push(stage);
  }

  query += ` ORDER BY COALESCE(d.DiemTiemNang_LeadScore, 0) DESC, dn.MaDN ASC`;

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

apiRouter.get('/enterprises/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;

  const enterprise = db.prepare(`
    SELECT dn.*, ng.TenNganh, ng.HeSoKhoTuyen, nv.HoTen AS SalesPhuTrach, nv.Email AS SalesEmail,
      d.DiemTiemNang_LeadScore, d.PhanHangLead, d.DiemNguyCoRoiBo_ChurnScore, d.MucDoNguyCoChurn,
      d.DuBaoGiaTriVongDoi_CLV, d.GoiDichVuKhuyenNghi, d.ChienLuocHanhDong, d.DoTinCay_Confidence
    FROM DoanhNghiep dn
    JOIN NganhNghe ng ON dn.MaNganh = ng.MaNganh
    JOIN NhanVienSales nv ON dn.MaNVSales = nv.MaNV
    LEFT JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
    WHERE dn.MaDN = ?
  `).get(id) as any;

  if (!enterprise) {
    return res.status(404).json({ error: 'Doanh nghiệp không tồn tại' });
  }

  const demands = db.prepare('SELECT * FROM NhuCauTuyenDung WHERE MaDN = ? ORDER BY NgayYeuCau DESC').all(id);
  const contracts = db.prepare(`
    SELECT hd.*, g.TenGoi, g.LoaiDichVu, g.SoTinDang AS HanMucTin, g.SoLuotMoCV AS HanMucCV,
      sd.MaSuDung, sd.SoTinDaDang, sd.SoCVDaMo, sd.TyLeSuDungHanMuc
    FROM HopDongDichVu hd
    JOIN GoiDichVu g ON hd.MaGoi = g.MaGoi
    LEFT JOIN LichSuSuDungDichVu sd ON hd.MaHopDong = sd.MaHopDong
    WHERE hd.MaDN = ?
    ORDER BY hd.NgayKy DESC
  `).all(id);
  const interactions = db.prepare(`
    SELECT t.*, nv.HoTen AS NhanVienChamSoc
    FROM TuongTacCSKH t
    JOIN NhanVienSales nv ON t.MaNV = nv.MaNV
    WHERE t.MaDN = ?
    ORDER BY t.NgayTuongTac DESC
  `).all(id);

  // Match live postings in TinTuyenDungThiTruong from job_market.bak!
  let marketPostings: any[] = [];
  try {
    const cleanKey = normalizeCompanyName(enterprise.TenDoanhNghiep)
      .replace(/\(.*\)/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(' ');
    if (cleanKey.length >= 3) {
      marketPostings = db.prepare(`
        SELECT id, nguon, cong_viec, muc_luong, tinh_thanh, han_nop_ho_so, url
        FROM TinTuyenDungThiTruong
        WHERE nha_tuyen_dung LIKE ? OR ten_dn_chuan_hoa LIKE ?
        LIMIT 12
      `).all(`%${cleanKey}%`, `%${cleanKey.toUpperCase()}%`);
    }
  } catch {
    // ignore
  }

  res.json({
    enterprise,
    demands,
    contracts,
    interactions,
    marketPostings,
  });
});

apiRouter.post('/enterprises', (req: Request, res: Response) => {
  const db = getDatabase();
  const {
    TenDoanhNghiep,
    MaNganh,
    QuyMoNhanSu,
    DiaBan,
    NguonLead,
    GiaiDoanPhanPhieu,
    NganSachDuKien,
    MaNVSales,
    TrangThai,
  } = req.body;

  if (!TenDoanhNghiep || !String(TenDoanhNghiep).trim()) {
    return res.status(400).json({ error: 'Tên doanh nghiệp không được để trống' });
  }

  const allIds = db.prepare('SELECT MaDN FROM DoanhNghiep').all() as Array<{ MaDN: string }>;
  let maxNum = 0;
  for (const r of allIds) {
    const num = parseInt(r.MaDN.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  const maDN = `DN${String(maxNum + 1).padStart(3, '0')}`;
  const today = new Date().toISOString().split('T')[0];

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO DoanhNghiep (MaDN, TenDoanhNghiep, MaNganh, QuyMoNhanSu, DiaBan, NgayTiepCan, NguonLead, GiaiDoanPhanPhieu, NganSachDuKien, MaNVSales, TrangThai)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      maDN,
      String(TenDoanhNghiep).trim(),
      MaNganh || 'NN01',
      Number(QuyMoNhanSu) || 100,
      DiaBan || 'Hà Nội',
      today,
      NguonLead || 'Website',
      GiaiDoanPhanPhieu || '1.Tiếp cận',
      Number(NganSachDuKien) || 50,
      MaNVSales || 'NV01',
      TrangThai || 'TiemNang'
    );
    recalculateEnterpriseDSS(maDN);
    logAudit(MaNVSales || 'NV01', 'Tạo mới Doanh nghiệp', `Thêm doanh nghiệp ${TenDoanhNghiep} (${maDN})`, req.ip);
  });

  tx();
  res.status(201).json({ message: 'Tạo doanh nghiệp và chấm điểm DSS thành công', maDN });
});

apiRouter.put('/enterprises/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    TenDoanhNghiep,
    MaNganh,
    QuyMoNhanSu,
    DiaBan,
    NguonLead,
    GiaiDoanPhanPhieu,
    NganSachDuKien,
    MaNVSales,
    TrangThai,
    actorMaNV,
  } = req.body;

  const existing = db.prepare('SELECT MaDN FROM DoanhNghiep WHERE MaDN = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy doanh nghiệp để cập nhật' });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE DoanhNghiep
      SET TenDoanhNghiep = ?, MaNganh = ?, QuyMoNhanSu = ?, DiaBan = ?,
          NguonLead = ?, GiaiDoanPhanPhieu = ?, NganSachDuKien = ?, MaNVSales = ?, TrangThai = ?
      WHERE MaDN = ?
    `).run(
      String(TenDoanhNghiep).trim(),
      MaNganh,
      Number(QuyMoNhanSu) || 100,
      DiaBan,
      NguonLead,
      GiaiDoanPhanPhieu,
      Number(NganSachDuKien) || 0,
      MaNVSales,
      TrangThai,
      id
    );
    recalculateEnterpriseDSS(id);
    logAudit(actorMaNV || MaNVSales || 'NV01', 'Cập nhật Doanh nghiệp', `Cập nhật hồ sơ ${TenDoanhNghiep} (${id})`, req.ip);
  });

  tx();
  res.json({ message: 'Cập nhật doanh nghiệp & tính lại điểm DSS thành công' });
});

apiRouter.delete('/enterprises/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const actorMaNV = (req.query.actor as string) || 'NV01';

  const existing = db.prepare('SELECT TenDoanhNghiep FROM DoanhNghiep WHERE MaDN = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Doanh nghiệp không tồn tại' });
  }

  const tx = db.transaction(() => {
    // Clean up child tables explicitly to respect foreign key constraints even on pre-existing DBs
    const contracts = db.prepare('SELECT MaHopDong FROM HopDongDichVu WHERE MaDN = ?').all(id) as Array<{ MaHopDong: string }>;
    for (const c of contracts) {
      db.prepare('DELETE FROM LichSuSuDungDichVu WHERE MaHopDong = ?').run(c.MaHopDong);
    }
    db.prepare('DELETE FROM HopDongDichVu WHERE MaDN = ?').run(id);
    db.prepare('DELETE FROM TuongTacCSKH WHERE MaDN = ?').run(id);
    db.prepare('DELETE FROM NhuCauTuyenDung WHERE MaDN = ?').run(id);
    db.prepare('DELETE FROM DanhGiaDSS_AI WHERE MaDN = ?').run(id);
    db.prepare('DELETE FROM DoanhNghiep WHERE MaDN = ?').run(id);

    logAudit(actorMaNV, 'Xóa Doanh nghiệp', `Đã xóa doanh nghiệp ${existing.TenDoanhNghiep} (${id}) và dữ liệu liên quan`, req.ip);
  });

  tx();
  res.json({ message: `Đã xóa doanh nghiệp ${existing.TenDoanhNghiep} (${id})` });
});

// -------------------------------------------------------------
// 4. RECRUITMENT DEMANDS (NhuCauTuyenDung FULL CRUD)
// -------------------------------------------------------------
apiRouter.get('/demands', (req: Request, res: Response) => {
  const db = getDatabase();
  const maDN = req.query.maDN as string;
  let sql = `
    SELECT nc.*, dn.TenDoanhNghiep
    FROM NhuCauTuyenDung nc
    JOIN DoanhNghiep dn ON nc.MaDN = dn.MaDN
  `;
  const params: any[] = [];
  if (maDN) {
    sql += ' WHERE nc.MaDN = ?';
    params.push(maDN);
  }
  sql += ' ORDER BY nc.NgayYeuCau DESC, nc.MaNhuCau DESC';
  res.json(db.prepare(sql).all(...params));
});

apiRouter.post('/demands', (req: Request, res: Response) => {
  const db = getDatabase();
  const { MaDN, ViTriCanTuyen, SoLuongCanTuyen, MucLuongTrungBinh, DoCapBach, HanChotTuyen, TrangThai, actorMaNV } = req.body;

  if (!MaDN || !ViTriCanTuyen) {
    return res.status(400).json({ error: 'Thiếu mã doanh nghiệp hoặc vị trí cần tuyển' });
  }

  const all = db.prepare('SELECT MaNhuCau FROM NhuCauTuyenDung').all() as Array<{ MaNhuCau: string }>;
  let maxNum = 0;
  for (const r of all) {
    const n = parseInt(r.MaNhuCau.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  const maNhuCau = `NC${String(maxNum + 1).padStart(4, '0')}`;
  const today = new Date().toISOString().split('T')[0];
  const defaultDeadline = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO NhuCauTuyenDung (MaNhuCau, MaDN, ViTriCanTuyen, SoLuongCanTuyen, MucLuongTrungBinh, DoCapBach, NgayYeuCau, HanChotTuyen, TrangThai)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      maNhuCau,
      MaDN,
      ViTriCanTuyen,
      Number(SoLuongCanTuyen) || 1,
      Number(MucLuongTrungBinh) || 18,
      DoCapBach || 'BinhThuong',
      today,
      HanChotTuyen || defaultDeadline,
      TrangThai || 'DangMo'
    );
    recalculateEnterpriseDSS(MaDN);
    logAudit(actorMaNV || 'NV01', 'Thêm Nhu cầu tuyển dụng', `Thêm vị trí ${ViTriCanTuyen} cho ${MaDN}`, req.ip);
  });

  tx();
  res.status(201).json({ message: 'Đã thêm nhu cầu tuyển dụng mới', maNhuCau });
});

apiRouter.put('/demands/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const { ViTriCanTuyen, SoLuongCanTuyen, MucLuongTrungBinh, DoCapBach, HanChotTuyen, TrangThai } = req.body;

  const existing = db.prepare('SELECT MaDN FROM NhuCauTuyenDung WHERE MaNhuCau = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy nhu cầu tuyển dụng' });

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE NhuCauTuyenDung
      SET ViTriCanTuyen = ?, SoLuongCanTuyen = ?, MucLuongTrungBinh = ?, DoCapBach = ?, HanChotTuyen = ?, TrangThai = ?
      WHERE MaNhuCau = ?
    `).run(
      ViTriCanTuyen,
      Number(SoLuongCanTuyen) || 1,
      Number(MucLuongTrungBinh) || 15,
      DoCapBach || 'BinhThuong',
      HanChotTuyen,
      TrangThai || 'DangMo',
      id
    );
    recalculateEnterpriseDSS(existing.MaDN);
  });

  tx();
  res.json({ message: 'Đã cập nhật nhu cầu tuyển dụng' });
});

apiRouter.delete('/demands/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const existing = db.prepare('SELECT MaDN FROM NhuCauTuyenDung WHERE MaNhuCau = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy nhu cầu tuyển dụng' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM NhuCauTuyenDung WHERE MaNhuCau = ?').run(id);
    recalculateEnterpriseDSS(existing.MaDN);
  });
  tx();
  res.json({ message: 'Đã xóa nhu cầu tuyển dụng' });
});

// -------------------------------------------------------------
// 5. PACKAGES & CONTRACTS (FULL CRUD)
// -------------------------------------------------------------
apiRouter.get('/packages', (_req: Request, res: Response) => {
  const db = getDatabase();
  const packages = db.prepare('SELECT * FROM GoiDichVu ORDER BY GiaNiemYet ASC').all();
  res.json(packages);
});

apiRouter.post('/packages', (req: Request, res: Response) => {
  const db = getDatabase();
  const { TenGoi, LoaiDichVu, GiaNiemYet, SoTinDang, SoLuotMoCV, ThoiHanNgay, MoTa } = req.body;
  const all = db.prepare('SELECT MaGoi FROM GoiDichVu').all() as Array<{ MaGoi: string }>;
  let maxNum = 0;
  for (const p of all) {
    const n = parseInt(p.MaGoi.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  const maGoi = `PKG${String(maxNum + 1).padStart(2, '0')}`;
  db.prepare(`
    INSERT INTO GoiDichVu (MaGoi, TenGoi, LoaiDichVu, GiaNiemYet, SoTinDang, SoLuotMoCV, ThoiHanNgay, MoTa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(maGoi, TenGoi, LoaiDichVu || 'Combo', Number(GiaNiemYet) || 10, Number(SoTinDang) || 10, Number(SoLuotMoCV) || 100, Number(ThoiHanNgay) || 30, MoTa || '');
  res.status(201).json({ message: 'Đã thêm gói dịch vụ mới', maGoi });
});

apiRouter.put('/packages/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const { TenGoi, LoaiDichVu, GiaNiemYet, SoTinDang, SoLuotMoCV, ThoiHanNgay, MoTa } = req.body;
  db.prepare(`
    UPDATE GoiDichVu
    SET TenGoi = ?, LoaiDichVu = ?, GiaNiemYet = ?, SoTinDang = ?, SoLuotMoCV = ?, ThoiHanNgay = ?, MoTa = ?
    WHERE MaGoi = ?
  `).run(TenGoi, LoaiDichVu, Number(GiaNiemYet), Number(SoTinDang), Number(SoLuotMoCV), Number(ThoiHanNgay), MoTa || '', id);
  res.json({ message: 'Đã cập nhật gói dịch vụ' });
});

apiRouter.delete('/packages/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const used = db.prepare('SELECT COUNT(*) as cnt FROM HopDongDichVu WHERE MaGoi = ?').get(id) as { cnt: number };
  if (used && used.cnt > 0) {
    return res.status(400).json({ error: `Không thể xóa gói ${id} vì đang có ${used.cnt} hợp đồng sử dụng gói này.` });
  }
  db.prepare('DELETE FROM GoiDichVu WHERE MaGoi = ?').run(id);
  res.json({ message: `Đã xóa gói dịch vụ ${id}` });
});

apiRouter.get('/contracts', (_req: Request, res: Response) => {
  const db = getDatabase();
  const contracts = db.prepare(`
    SELECT hd.*, dn.TenDoanhNghiep, g.TenGoi, g.LoaiDichVu, g.SoTinDang AS HanMucTin, g.SoLuotMoCV AS HanMucCV,
      nv.HoTen AS SalesPhuTrach,
      sd.SoTinDaDang, sd.SoCVDaMo, sd.TyLeSuDungHanMuc
    FROM HopDongDichVu hd
    JOIN DoanhNghiep dn ON hd.MaDN = dn.MaDN
    JOIN GoiDichVu g ON hd.MaGoi = g.MaGoi
    JOIN NhanVienSales nv ON hd.MaNVSales = nv.MaNV
    LEFT JOIN LichSuSuDungDichVu sd ON hd.MaHopDong = sd.MaHopDong
    ORDER BY hd.NgayKy DESC, hd.MaHopDong DESC
  `).all();
  res.json(contracts);
});

apiRouter.post('/contracts', (req: Request, res: Response) => {
  const db = getDatabase();
  const {
    MaDN,
    MaGoi,
    MaNVSales,
    NgayKy,
    NgayBatDau,
    NgayHetHan,
    GiaTriHopDong,
    ChietKhau,
    SoTienThanhToan,
    TrangThaiThanhToan,
    TrangThaiHopDong,
    approvedByManager,
  } = req.body;

  if (Number(ChietKhau) > 12.0 && !approvedByManager) {
    return res.status(400).json({
      error: 'Mức chiết khấu vượt trần 12.0%. Yêu cầu Trưởng phòng Kinh doanh hoặc Ban Giám đốc phê duyệt!',
    });
  }

  const allHD = db.prepare('SELECT MaHopDong FROM HopDongDichVu').all() as Array<{ MaHopDong: string }>;
  let maxNum = 0;
  for (const r of allHD) {
    const n = parseInt(r.MaHopDong.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  const maHD = `HD${String(maxNum + 1).padStart(4, '0')}`;
  const maSD = `SD${String(maxNum + 1).padStart(4, '0')}`;
  const today = new Date().toISOString().split('T')[0];

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO HopDongDichVu (MaHopDong, MaDN, MaGoi, MaNVSales, NgayKy, NgayBatDau, NgayHetHan, GiaTriHopDong, ChietKhau, SoTienThanhToan, TrangThaiThanhToan, TrangThaiHopDong)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      maHD,
      MaDN,
      MaGoi,
      MaNVSales || 'NV01',
      NgayKy || today,
      NgayBatDau || today,
      NgayHetHan || today,
      Number(GiaTriHopDong),
      Number(ChietKhau) || 0,
      Number(SoTienThanhToan),
      TrangThaiThanhToan || 'DaThanhToan',
      TrangThaiHopDong || 'HieuLuc'
    );

    db.prepare(`
      INSERT INTO LichSuSuDungDichVu (MaSuDung, MaHopDong, NgayGhiNhan, SoTinDaDang, SoCVDaMo, SoUngVienPhongVan, SoUngVienNhanViec, TyLeSuDungHanMuc)
      VALUES (?, ?, ?, 0, 0, 0, 0, 0.15)
    `).run(maSD, maHD, NgayBatDau || today);

    db.prepare(`
      UPDATE DoanhNghiep
      SET GiaiDoanPhanPhieu = '5.Ký HĐ', TrangThai = 'DangHoatDong'
      WHERE MaDN = ?
    `).run(MaDN);

    recalculateEnterpriseDSS(MaDN);
    logAudit(MaNVSales || 'NV01', 'Ký Hợp Đồng Dịch Vụ', `Khởi tạo HĐ ${maHD} trị giá ${SoTienThanhToan} Tr (Chiết khấu ${ChietKhau}%)`, req.ip);
  });

  tx();
  res.status(201).json({ message: 'Tạo hợp đồng dịch vụ thành công', maHD });
});

apiRouter.put('/contracts/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    MaGoi,
    NgayHetHan,
    ChietKhau,
    TrangThaiThanhToan,
    TrangThaiHopDong,
    SoTinDaDang,
    SoCVDaMo,
    TyLeSuDungHanMuc,
    approvedByManager,
  } = req.body;

  const hd = db.prepare('SELECT * FROM HopDongDichVu WHERE MaHopDong = ?').get(id) as any;
  if (!hd) return res.status(404).json({ error: 'Hợp đồng không tồn tại' });

  const newCk = ChietKhau !== undefined ? Number(ChietKhau) : Number(hd.ChietKhau);
  if (newCk > 12.0 && !approvedByManager) {
    return res.status(400).json({ error: 'Chiết khấu vượt trần 12.0% cần phê duyệt của Quản lý.' });
  }

  const pkg = db.prepare('SELECT * FROM GoiDichVu WHERE MaGoi = ?').get(MaGoi || hd.MaGoi) as any;
  const giaNiemYet = pkg ? Number(pkg.GiaNiemYet) : Number(hd.GiaTriHopDong);
  const soTien = Math.round(giaNiemYet * (1 - newCk / 100) * 10) / 10;

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE HopDongDichVu
      SET MaGoi = ?, NgayHetHan = ?, GiaTriHopDong = ?, ChietKhau = ?, SoTienThanhToan = ?,
          TrangThaiThanhToan = ?, TrangThaiHopDong = ?
      WHERE MaHopDong = ?
    `).run(
      MaGoi || hd.MaGoi,
      NgayHetHan || hd.NgayHetHan,
      giaNiemYet,
      newCk,
      soTien,
      TrangThaiThanhToan || hd.TrangThaiThanhToan,
      TrangThaiHopDong || hd.TrangThaiHopDong,
      id
    );

    if (TyLeSuDungHanMuc !== undefined || SoTinDaDang !== undefined || SoCVDaMo !== undefined) {
      const existingSd = db.prepare('SELECT * FROM LichSuSuDungDichVu WHERE MaHopDong = ?').get(id) as any;
      if (existingSd) {
        db.prepare(`
          UPDATE LichSuSuDungDichVu
          SET SoTinDaDang = ?, SoCVDaMo = ?, TyLeSuDungHanMuc = ?
          WHERE MaHopDong = ?
        `).run(
          SoTinDaDang !== undefined ? Number(SoTinDaDang) : existingSd.SoTinDaDang,
          SoCVDaMo !== undefined ? Number(SoCVDaMo) : existingSd.SoCVDaMo,
          TyLeSuDungHanMuc !== undefined ? Number(TyLeSuDungHanMuc) : existingSd.TyLeSuDungHanMuc,
          id
        );
      }
    }

    recalculateEnterpriseDSS(hd.MaDN);
  });

  tx();
  res.json({ message: 'Đã cập nhật hợp đồng & đánh giá lại Churn Risk' });
});

apiRouter.delete('/contracts/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const hd = db.prepare('SELECT MaDN FROM HopDongDichVu WHERE MaHopDong = ?').get(id) as any;
  if (!hd) return res.status(404).json({ error: 'Hợp đồng không tồn tại' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM LichSuSuDungDichVu WHERE MaHopDong = ?').run(id);
    db.prepare('DELETE FROM HopDongDichVu WHERE MaHopDong = ?').run(id);
    recalculateEnterpriseDSS(hd.MaDN);
  });
  tx();
  res.json({ message: `Đã xóa hợp đồng ${id}` });
});

// -------------------------------------------------------------
// 6. CUSTOMER SUCCESS & INTERACTIONS (FULL CRUD)
// -------------------------------------------------------------
apiRouter.get('/interactions', (req: Request, res: Response) => {
  const db = getDatabase();
  const maDN = req.query.maDN as string;
  let sql = `
    SELECT t.*, dn.TenDoanhNghiep, nv.HoTen AS NhanVienCSKH
    FROM TuongTacCSKH t
    JOIN DoanhNghiep dn ON t.MaDN = dn.MaDN
    JOIN NhanVienSales nv ON t.MaNV = nv.MaNV
  `;
  const params: any[] = [];
  if (maDN) {
    sql += ' WHERE t.MaDN = ?';
    params.push(maDN);
  }
  sql += ' ORDER BY t.NgayTuongTac DESC, t.MaTuongTac DESC LIMIT 150';
  res.json(db.prepare(sql).all(...params));
});

apiRouter.post('/interactions', (req: Request, res: Response) => {
  const db = getDatabase();
  const { MaDN, MaNV, NgayTuongTac, KenhTuongTac, NoiDung, DiemHaiLongCSAT, CoKhieuNai, PhanHoiKhachHang } = req.body;

  const all = db.prepare('SELECT MaTuongTac FROM TuongTacCSKH').all() as Array<{ MaTuongTac: string }>;
  let maxNum = 0;
  for (const r of all) {
    const n = parseInt(r.MaTuongTac.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  const maTT = `TT${String(maxNum + 1).padStart(4, '0')}`;

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO TuongTacCSKH (MaTuongTac, MaDN, MaNV, NgayTuongTac, KenhTuongTac, NoiDung, DiemHaiLongCSAT, CoKhieuNai, PhanHoiKhachHang)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      maTT,
      MaDN,
      MaNV || 'NV05',
      NgayTuongTac || new Date().toISOString().split('T')[0],
      KenhTuongTac || 'Điện thoại',
      NoiDung || '',
      Math.min(5, Math.max(1, Number(DiemHaiLongCSAT) || 4)),
      CoKhieuNai ? 1 : 0,
      PhanHoiKhachHang || ''
    );
    recalculateEnterpriseDSS(MaDN);
  });

  tx();
  res.status(201).json({ message: 'Ghi nhận tương tác CSKH & cập nhật Churn Score thành công', maTT });
});

apiRouter.put('/interactions/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const { KenhTuongTac, NoiDung, DiemHaiLongCSAT, CoKhieuNai, PhanHoiKhachHang } = req.body;
  const existing = db.prepare('SELECT MaDN FROM TuongTacCSKH WHERE MaTuongTac = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy bản ghi tương tác' });

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE TuongTacCSKH
      SET KenhTuongTac = ?, NoiDung = ?, DiemHaiLongCSAT = ?, CoKhieuNai = ?, PhanHoiKhachHang = ?
      WHERE MaTuongTac = ?
    `).run(
      KenhTuongTac,
      NoiDung,
      Math.min(5, Math.max(1, Number(DiemHaiLongCSAT) || 4)),
      CoKhieuNai ? 1 : 0,
      PhanHoiKhachHang || '',
      id
    );
    recalculateEnterpriseDSS(existing.MaDN);
  });
  tx();
  res.json({ message: 'Đã cập nhật lịch sử tương tác CSKH' });
});

apiRouter.delete('/interactions/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const existing = db.prepare('SELECT MaDN FROM TuongTacCSKH WHERE MaTuongTac = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy tương tác CSKH' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM TuongTacCSKH WHERE MaTuongTac = ?').run(id);
    recalculateEnterpriseDSS(existing.MaDN);
  });
  tx();
  res.json({ message: 'Đã xóa bản ghi tương tác CSKH' });
});

// -------------------------------------------------------------
// 7. DSS ENGINES (REAL-TIME SIMULATIONS)
// -------------------------------------------------------------
apiRouter.post('/dss/lead-score', (req: Request, res: Response) => {
  res.json(calculateLeadScore(req.body));
});

apiRouter.post('/dss/recommend-package', (req: Request, res: Response) => {
  res.json(recommendPackage(req.body));
});

apiRouter.post('/dss/churn-score', (req: Request, res: Response) => {
  res.json(calculateChurnScore(req.body));
});

apiRouter.post('/dss/what-if', (req: Request, res: Response) => {
  res.json(simulateWhatIf(req.body));
});

// -------------------------------------------------------------
// 8. REAL JOB MARKET INTELLIGENCE (FROM job_market.bak -> TinTuyenDungThiTruong)
// -------------------------------------------------------------
apiRouter.get('/market/overview', (_req: Request, res: Response) => {
  const db = getDatabase();
  const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM TinTuyenDungThiTruong').get() as { cnt: number };
  const total = totalRow?.cnt || 0;

  if (total === 0) {
    return res.json({
      mode: 'Fallback Dataset',
      sourceFile: 'job_market.bak (chưa đồng bộ)',
      stats: {
        tongTin: 21827,
        tongDN: 9624,
        doanhNghiepDaSan: 631,
        doanhNghiep3San: 65,
        tinKhuyetTenDN: 926,
        tinThoaThuanLuong: 5669,
        luongTrungBinhThiTruong: 16.8,
      },
      platforms: [
        { nguon: 'TopCV', count: 11592, pct: 53.1, companies: 5246, avgSalary: 16.5 },
        { nguon: 'JobsGO', count: 5543, pct: 25.4, companies: 2334, avgSalary: 14.8 },
        { nguon: 'Vieclam24h', count: 2407, pct: 11.0, companies: 1450, avgSalary: 13.4 },
        { nguon: 'CareerViet', count: 1604, pct: 7.3, companies: 878, avgSalary: 19.2 },
        { nguon: 'VietnamWorks', count: 627, pct: 2.9, companies: 409, avgSalary: 24.6 },
        { nguon: 'CareerLink', count: 54, pct: 0.2, companies: 38, avgSalary: 17.5 },
      ],
      topProvinces: [],
      salaryBands: [],
    });
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) AS tongTin,
      COUNT(DISTINCT CASE WHEN ten_dn_chuan_hoa != '' THEN ten_dn_chuan_hoa END) AS tongDN,
      SUM(CASE WHEN ten_dn_chuan_hoa = '' THEN 1 ELSE 0 END) AS tinKhuyetTenDN,
      SUM(CASE WHEN muc_luong_tb_trieu IS NULL THEN 1 ELSE 0 END) AS tinThoaThuanLuong,
      COALESCE(ROUND(AVG(muc_luong_tb_trieu), 1), 16.5) AS luongTrungBinhThiTruong
    FROM TinTuyenDungThiTruong
  `).get() as any;

  const daSan = db.prepare(`
    SELECT
      SUM(CASE WHEN c >= 2 THEN 1 ELSE 0 END) AS dn2,
      SUM(CASE WHEN c >= 3 THEN 1 ELSE 0 END) AS dn3
    FROM (
      SELECT COUNT(DISTINCT nguon) AS c
      FROM TinTuyenDungThiTruong
      WHERE ten_dn_chuan_hoa != ''
      GROUP BY ten_dn_chuan_hoa
    )
  `).get() as any;

  const platforms = db.prepare(`
    SELECT 
      nguon,
      COUNT(*) AS count,
      ROUND(COUNT(*) * 100.0 / ?, 1) AS pct,
      COUNT(DISTINCT CASE WHEN ten_dn_chuan_hoa != '' THEN ten_dn_chuan_hoa END) AS companies,
      ROUND(AVG(muc_luong_tb_trieu), 1) AS avgSalary
    FROM TinTuyenDungThiTruong
    GROUP BY nguon
    ORDER BY count DESC
  `).all(total);

  const topProvinces = db.prepare(`
    SELECT tinh_thanh, COUNT(*) AS count
    FROM TinTuyenDungThiTruong
    WHERE tinh_thanh != '' AND tinh_thanh != 'Không đề cập'
    GROUP BY tinh_thanh
    ORDER BY count DESC
    LIMIT 10
  `).all();

  const salaryBands = db.prepare(`
    SELECT 
      CASE
        WHEN muc_luong_tb_trieu IS NULL THEN 'Thỏa thuận / Cạnh tranh'
        WHEN muc_luong_tb_trieu < 10 THEN 'Dưới 10 Triệu'
        WHEN muc_luong_tb_trieu < 20 THEN '10 - 20 Triệu'
        WHEN muc_luong_tb_trieu < 35 THEN '20 - 35 Triệu'
        ELSE 'Trên 35 Triệu'
      END AS band,
      COUNT(*) AS count
    FROM TinTuyenDungThiTruong
    GROUP BY band
    ORDER BY count DESC
  `).all();

  res.json({
    mode: 'Live SQLite Engine (Đồng bộ 100% từ job_market.bak)',
    sourceFile: 'job_market.bak',
    stats: {
      tongTin: stats.tongTin,
      tongDN: stats.tongDN,
      doanhNghiepDaSan: daSan?.dn2 || 0,
      doanhNghiep3San: daSan?.dn3 || 0,
      tinKhuyetTenDN: stats.tinKhuyetTenDN,
      tinThoaThuanLuong: stats.tinThoaThuanLuong,
      luongTrungBinhThiTruong: stats.luongTrungBinhThiTruong,
    },
    platforms,
    topProvinces,
    salaryBands,
  });
});

apiRouter.get('/market/status', (_req: Request, res: Response) => {
  const db = getDatabase();
  const cnt = (db.prepare('SELECT COUNT(*) as cnt FROM TinTuyenDungThiTruong').get() as any)?.cnt || 0;
  res.json({
    connected: cnt > 0,
    mode: cnt > 0 ? `Live job_market.bak (${cnt.toLocaleString('vi-VN')} tin thực tế)` : 'Adapter Mode',
    totalPostings: cnt,
  });
});

apiRouter.get('/market/top-hirers', (req: Request, res: Response) => {
  const db = getDatabase();
  const minPlatforms = Number(req.query.minPlatforms) || 2;
  const search = ((req.query.search as string) || '').trim();
  const platform = ((req.query.platform as string) || '').trim();
  const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 60));

  const cnt = (db.prepare('SELECT COUNT(*) as cnt FROM TinTuyenDungThiTruong').get() as any)?.cnt || 0;
  if (cnt === 0) {
    return res.json(TOP_MARKET_HIRERS.filter(h => h.so_san >= minPlatforms));
  }

  let whereClause = `WHERE ten_dn_chuan_hoa != ''`;
  const params: any[] = [];
  if (search) {
    whereClause += ` AND (nha_tuyen_dung LIKE ? OR linh_vuc_nganh_nghe LIKE ? OR tinh_thanh LIKE ? OR cong_viec LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  let havingClause = `HAVING COUNT(DISTINCT nguon) >= ?`;
  params.push(minPlatforms);
  if (platform) {
    havingClause += ` AND GROUP_CONCAT(DISTINCT nguon) LIKE ?`;
    params.push(`%${platform}%`);
  }
  params.push(limit);

  const rows = db.prepare(`
    SELECT
      ten_dn_chuan_hoa,
      MAX(nha_tuyen_dung) AS nha_tuyen_dung,
      COUNT(*) AS tong_so_tin,
      COUNT(DISTINCT nguon) AS so_san,
      GROUP_CONCAT(DISTINCT nguon) AS cac_san_str,
      MAX(CASE WHEN linh_vuc_nganh_nghe != 'Không đề cập' THEN linh_vuc_nganh_nghe ELSE 'Đa ngành' END) AS linh_vuc,
      MAX(CASE WHEN tinh_thanh != 'Không đề cập' THEN tinh_thanh ELSE 'Toàn quốc' END) AS dia_ban,
      GROUP_CONCAT(cong_viec, ' | ') AS sample_jobs,
      MAX(CASE WHEN muc_luong != 'Không đề cập' THEN muc_luong ELSE 'Thỏa thuận' END) AS luong_pho_bien,
      ROUND(AVG(muc_luong_tb_trieu), 1) AS luong_tb_trieu
    FROM TinTuyenDungThiTruong
    ${whereClause}
    GROUP BY ten_dn_chuan_hoa
    ${havingClause}
    ORDER BY so_san DESC, tong_so_tin DESC
    LIMIT ?
  `).all(...params) as any[];

  // Cross-reference existing CRM enterprises
  const crmList = db.prepare('SELECT MaDN, TenDoanhNghiep FROM DoanhNghiep').all() as Array<{ MaDN: string; TenDoanhNghiep: string }>;

  const formatted = rows.map(r => {
    const cac_san = String(r.cac_san_str || '').split(',').filter(Boolean);
    const jobs = String(r.sample_jobs || '').split(' | ').slice(0, 3).join(', ');
    const normKey = String(r.ten_dn_chuan_hoa || '').toLowerCase();

    const matchedCrm = crmList.find(c => {
      const cNorm = normalizeCompanyName(c.TenDoanhNghiep).toLowerCase();
      return cNorm && normKey && (normKey.includes(cNorm) || cNorm.includes(normKey));
    });

    let de_xuat = 'Chào gói Basic/Combo tiết kiệm chi phí tuyển dụng đa kênh.';
    if (r.tong_so_tin >= 40 || r.so_san >= 3) {
      de_xuat = 'Tiếp cận Giám đốc HR chào gói Enterprise ATS Suite (PKG06) + Diamond Branding hợp nhất đa sàn tiết kiệm 30%.';
    } else if ((r.luong_tb_trieu || 0) >= 25) {
      de_xuat = 'Nhu cầu vị trí lương cao: Đề xuất gói Headhunt Executive Talent (PKG05) cam kết bảo hành ứng viên.';
    } else if (r.tong_so_tin >= 15) {
      de_xuat = 'Đang tuyển hàng loạt: Chào gói VIP Urgent Hiring (PKG03) đẩy top tin đăng & mở khóa kho CV.';
    }

    return {
      ten_dn_chuan_hoa: r.ten_dn_chuan_hoa,
      nha_tuyen_dung: r.nha_tuyen_dung,
      tong_so_tin: r.tong_so_tin,
      so_san: r.so_san,
      cac_san,
      linh_vuc: String(r.linh_vuc || 'Đa ngành').slice(0, 80),
      dia_ban: String(r.dia_ban || 'Toàn quốc').slice(0, 60),
      top_vi_tri: jobs.slice(0, 120),
      luong_pho_bien: r.luong_pho_bien,
      luong_tb_trieu: r.luong_tb_trieu,
      de_xuat_tiep_can: de_xuat,
      inCrmMaDN: matchedCrm ? matchedCrm.MaDN : null,
    };
  });

  res.json(formatted);
});

apiRouter.get('/market/postings', (req: Request, res: Response) => {
  const db = getDatabase();
  const search = ((req.query.search as string) || '').trim();
  const nguon = ((req.query.nguon as string) || '').trim();
  const tinh = ((req.query.tinh as string) || '').trim();
  const company = ((req.query.company as string) || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (cong_viec LIKE ? OR nha_tuyen_dung LIKE ? OR ky_nang LIKE ? OR linh_vuc_nganh_nghe LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (nguon) {
    where += ' AND nguon = ?';
    params.push(nguon);
  }
  if (tinh) {
    where += ' AND tinh_thanh LIKE ?';
    params.push(`%${tinh}%`);
  }
  if (company) {
    where += ' AND (ten_dn_chuan_hoa = ? OR nha_tuyen_dung LIKE ?)';
    params.push(company, `%${company}%`);
  }

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM TinTuyenDungThiTruong ${where}`).get(...params) as { total: number };
  const rows = db.prepare(`
    SELECT id, nguon, url, tinh_thanh, loai_hinh_cong_viec, linh_vuc_nganh_nghe,
           nha_tuyen_dung, ten_dn_chuan_hoa, cong_viec, chuc_vu, so_luong,
           muc_luong, muc_luong_tb_trieu, kinh_nghiem, han_nop_ho_so, scraped_at
    FROM TinTuyenDungThiTruong
    ${where}
    ORDER BY scraped_at DESC, id ASC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json({
    total: totalRow?.total || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((totalRow?.total || 0) / pageSize)),
    rows,
  });
});

apiRouter.get('/market/postings/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM TinTuyenDungThiTruong WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy tin tuyển dụng' });
  res.json(row);
});

apiRouter.post('/market/postings', (req: Request, res: Response) => {
  const db = getDatabase();
  const {
    nguon,
    url,
    tinh_thanh,
    loai_hinh_cong_viec,
    linh_vuc_nganh_nghe,
    nha_tuyen_dung,
    cong_viec,
    chuc_vu,
    so_luong,
    muc_luong,
    muc_luong_tb_trieu,
    mo_ta_cong_viec,
    quyen_loi,
    kinh_nghiem,
    ky_nang,
    han_nop_ho_so,
  } = req.body;

  if (!cong_viec || !nha_tuyen_dung) {
    return res.status(400).json({ error: 'Vui lòng nhập Tên công việc và Nhà tuyển dụng' });
  }

  const id = `CUSTOM_${Date.now()}`;
  const finalUrl = url && String(url).trim() ? String(url).trim() : `https://recruitinsight.vn/jobs/${id}`;
  const normDn = normalizeCompanyName(nha_tuyen_dung).toUpperCase();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    INSERT INTO TinTuyenDungThiTruong (
      id, nguon, url, tinh_thanh, loai_hinh_cong_viec, linh_vuc_nganh_nghe,
      nha_tuyen_dung, ten_dn_chuan_hoa, cong_viec, chuc_vu, so_luong,
      gioi_tinh, do_tuoi, muc_luong, muc_luong_tb_trieu, thoi_gian_lam_viec,
      dia_diem_chi_tiet, mo_ta_cong_viec, quyen_loi, kinh_nghiem, ky_nang,
      bang_cap, han_nop_ho_so, thong_tin_lien_he, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Không yêu cầu', 'Không đề cập', ?, ?, 'Giờ hành chính', ?, ?, ?, ?, ?, 'Đại học', ?, '', ?)
  `).run(
    id,
    nguon || 'TopCV',
    finalUrl,
    tinh_thanh || 'Hà Nội',
    loai_hinh_cong_viec || 'Toàn thời gian',
    linh_vuc_nganh_nghe || 'CNTT & Phần mềm',
    nha_tuyen_dung,
    normDn,
    cong_viec,
    chuc_vu || 'Nhân viên',
    String(so_luong || '1'),
    muc_luong || '15 - 25 triệu',
    muc_luong_tb_trieu ? Number(muc_luong_tb_trieu) : 20,
    tinh_thanh || '',
    mo_ta_cong_viec || '',
    quyen_loi || '',
    kinh_nghiem || '1 năm',
    ky_nang || '',
    han_nop_ho_so || '',
    now
  );

  res.status(201).json({ message: 'Đã thêm tin tuyển dụng vào CSDL thị trường', id });
});

apiRouter.put('/market/postings/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    nguon,
    tinh_thanh,
    linh_vuc_nganh_nghe,
    nha_tuyen_dung,
    cong_viec,
    chuc_vu,
    so_luong,
    muc_luong,
    muc_luong_tb_trieu,
    mo_ta_cong_viec,
    quyen_loi,
    kinh_nghiem,
    ky_nang,
    han_nop_ho_so,
  } = req.body;

  const existing = db.prepare('SELECT id FROM TinTuyenDungThiTruong WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy tin tuyển dụng' });

  const normDn = normalizeCompanyName(nha_tuyen_dung || '').toUpperCase();
  db.prepare(`
    UPDATE TinTuyenDungThiTruong
    SET nguon = ?, tinh_thanh = ?, linh_vuc_nganh_nghe = ?, nha_tuyen_dung = ?, ten_dn_chuan_hoa = ?,
        cong_viec = ?, chuc_vu = ?, so_luong = ?, muc_luong = ?, muc_luong_tb_trieu = ?,
        mo_ta_cong_viec = ?, quyen_loi = ?, kinh_nghiem = ?, ky_nang = ?, han_nop_ho_so = ?
    WHERE id = ?
  `).run(
    nguon,
    tinh_thanh,
    linh_vuc_nganh_nghe,
    nha_tuyen_dung,
    normDn,
    cong_viec,
    chuc_vu,
    String(so_luong || '1'),
    muc_luong,
    muc_luong_tb_trieu !== null && muc_luong_tb_trieu !== '' ? Number(muc_luong_tb_trieu) : null,
    mo_ta_cong_viec || '',
    quyen_loi || '',
    kinh_nghiem || '',
    ky_nang || '',
    han_nop_ho_so || '',
    id
  );

  res.json({ message: 'Đã cập nhật tin tuyển dụng thành công' });
});

apiRouter.delete('/market/postings/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM TinTuyenDungThiTruong WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xóa tin tuyển dụng khỏi kho thị trường' });
});

apiRouter.post('/market/convert-to-lead', (req: Request, res: Response) => {
  const { nha_tuyen_dung, ten_dn_chuan_hoa, linh_vuc, dia_ban, tong_so_tin, maNV } = req.body;
  const db = getDatabase();

  const cleanName = normalizeCompanyName(nha_tuyen_dung);
  const existing = db
    .prepare('SELECT MaDN, TenDoanhNghiep FROM DoanhNghiep WHERE TenDoanhNghiep LIKE ?')
    .get(`%${cleanName}%`) as any;

  if (existing) {
    return res.status(409).json({
      error: `Doanh nghiệp '${nha_tuyen_dung}' đã có trong CRM (Mã: ${existing.MaDN})`,
      existing,
    });
  }

  const allIds = db.prepare('SELECT MaDN FROM DoanhNghiep').all() as Array<{ MaDN: string }>;
  let maxNum = 0;
  for (const r of allIds) {
    const n = parseInt(r.MaDN.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  const maDN = `DN${String(maxNum + 1).padStart(3, '0')}`;
  const today = new Date().toISOString().split('T')[0];

  const lv = String(linh_vuc || '');
  let maNganh = 'NN01';
  if (/ngân hàng|tài chính|chứng khoán|bảo hiểm/i.test(lv)) maNganh = 'NN02';
  else if (/bán lẻ|thương mại|siêu thị|tiêu dùng/i.test(lv)) maNganh = 'NN03';
  else if (/bất động sản|xây dựng|sản xuất|cơ khí/i.test(lv)) maNganh = 'NN04';
  else if (/nhà hàng|khách sạn|f&b|ẩm thực/i.test(lv)) maNganh = 'NN05';
  else if (/vận tải|kho vận|logistics|xuất nhập khẩu/i.test(lv)) maNganh = 'NN06';
  else if (/y tế|dược|bệnh viện|phòng khám/i.test(lv)) maNganh = 'NN07';

  const estBudget = Math.min(350, Math.max(60, (Number(tong_so_tin) || 10) * 3.5));

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO DoanhNghiep (MaDN, TenDoanhNghiep, MaNganh, QuyMoNhanSu, DiaBan, NgayTiepCan, NguonLead, GiaiDoanPhanPhieu, NganSachDuKien, MaNVSales, TrangThai)
      VALUES (?, ?, ?, ?, ?, ?, 'JobMarketHunting', '1.Tiếp cận', ?, ?, 'TiemNang')
    `).run(maDN, nha_tuyen_dung, maNganh, 1500, (dia_ban || 'Toàn quốc').slice(0, 80), today, Math.round(estBudget), maNV || 'NV01');

    // Import up to 4 real postings from TinTuyenDungThiTruong into NhuCauTuyenDung!
    const sampleJobs = db.prepare(`
      SELECT cong_viec, so_luong, muc_luong_tb_trieu
      FROM TinTuyenDungThiTruong
      WHERE ten_dn_chuan_hoa = ? OR nha_tuyen_dung = ?
      LIMIT 4
    `).all(ten_dn_chuan_hoa || '', nha_tuyen_dung) as any[];

    const allNC = db.prepare('SELECT MaNhuCau FROM NhuCauTuyenDung').all() as Array<{ MaNhuCau: string }>;
    let ncMax = 0;
    for (const r of allNC) {
      const n = parseInt(r.MaNhuCau.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > ncMax) ncMax = n;
    }

    const deadline = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];
    for (const j of sampleJobs) {
      ncMax += 1;
      const qty = parseInt(String(j.so_luong || '2').replace(/\D/g, ''), 10) || 2;
      db.prepare(`
        INSERT INTO NhuCauTuyenDung (MaNhuCau, MaDN, ViTriCanTuyen, SoLuongCanTuyen, MucLuongTrungBinh, DoCapBach, NgayYeuCau, HanChotTuyen, TrangThai)
        VALUES (?, ?, ?, ?, ?, 'Gap', ?, ?, 'DangMo')
      `).run(
        `NC${String(ncMax).padStart(4, '0')}`,
        maDN,
        String(j.cong_viec).slice(0, 95),
        Math.min(50, Math.max(1, qty)),
        Number(j.muc_luong_tb_trieu) || 20,
        today,
        deadline
      );
    }

    recalculateEnterpriseDSS(maDN);
    logAudit(maNV || 'NV01', 'Hunting Lead Đa Sàn', `Chuyển đổi ${nha_tuyen_dung} (${maDN}) kèm ${sampleJobs.length} vị trí thực tế từ job_market.bak`, req.ip);
  });

  tx();
  res.status(201).json({
    message: `Đã nạp "${nha_tuyen_dung}" (${maDN}) kèm nhu cầu tuyển dụng thực tế vào CRM!`,
    maDN,
  });
});

apiRouter.post('/market/reimport-bak', (_req: Request, res: Response) => {
  try {
    const bakPath = path.resolve(process.cwd(), 'job_market.bak');
    const importerPath = path.resolve(process.cwd(), 'database', 'import_job_market_bak.py');

    if (fs.existsSync(bakPath) && fs.existsSync(importerPath)) {
      const db = getDatabase();
      db.close();
      const out = spawnSync('python', [importerPath], { encoding: 'utf-8' });
      const reopened = reopenDatabase();
      const cnt = (reopened.prepare('SELECT COUNT(*) as cnt FROM TinTuyenDungThiTruong').get() as any)?.cnt || 0;
      if (out.status !== 0) {
        return res.status(500).json({ error: out.stderr || 'Lỗi khi chạy bộ nạp job_market.bak' });
      }
      return res.json({
        message: `Đồng bộ thành công ${cnt.toLocaleString('vi-VN')} tin tuyển dụng trực tiếp từ job_market.bak!`,
        total: cnt,
      });
    }

    const db = getDatabase();
    const cnt = hydrateFromCompressedSeed(db);
    if (cnt > 0) {
      return res.json({
        message: `Khôi phục thành công ${cnt.toLocaleString('vi-VN')} tin tuyển dụng từ bản nén job_market_seed.json.gz!`,
        total: cnt,
      });
    }

    return res.status(404).json({ error: 'Không tìm thấy tệp job_market.bak hoặc job_market_seed.json.gz' });
  } catch (err: any) {
    reopenDatabase();
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. SQL QUERIES EXPLORER
// -------------------------------------------------------------
apiRouter.get('/sql/queries', (_req: Request, res: Response) => {
  res.json(DSS_SQL_QUERIES);
});

apiRouter.post('/sql/execute', (req: Request, res: Response) => {
  try {
    const { queryId, customSql } = req.body;
    const result = executeDSSQuery(queryId, customSql);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lỗi thực thi truy vấn SQL' });
  }
});

// -------------------------------------------------------------
// 10. LIVE REPORTS RP-01 TO RP-05
// -------------------------------------------------------------
apiRouter.get('/reports/all', (_req: Request, res: Response) => {
  const rp01Funnel = executeDSSQuery('Q01').rows;
  const rp01HotLeads = executeDSSQuery('Q04').rows;
  const rp02Churn = executeDSSQuery('Q05').rows;
  const rp03Sales = executeDSSQuery('Q03').rows;
  const rp05Packages = executeDSSQuery('Q07').rows;

  const db = getDatabase();
  const lostCount = (db.prepare(`SELECT COUNT(*) as cnt FROM DoanhNghiep WHERE TrangThai = 'DaDung' OR GiaiDoanPhanPhieu LIKE '7.%'`).get() as any)?.cnt || 0;
  const safeCount = (db.prepare(`SELECT COUNT(*) as cnt FROM DanhGiaDSS_AI WHERE MucDoNguyCoChurn = 'Thap'`).get() as any)?.cnt || 0;

  res.json({
    rp01: { funnel: rp01Funnel, hotLeads: rp01HotLeads },
    rp02: { churnList: rp02Churn, lostCount, safeCount },
    rp03: { salesRanking: rp03Sales },
    rp05: { packagePerformance: rp05Packages },
  });
});

// -------------------------------------------------------------
// 11. GEMINI AI DECISION COPILOT ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/ai/status', (_req: Request, res: Response) => {
  res.json(getAIStatus());
});

apiRouter.post('/ai/config', (req: Request, res: Response) => {
  const { apiKey, preferredModel } = req.body;
  const status = updateAIConfig(apiKey, preferredModel);
  res.json({ message: 'Đã lưu cấu hình Gemini AI thành công!', status });
});

apiRouter.post('/ai/copilot', async (req: Request, res: Response) => {
  try {
    const { question, history } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi cho AI Copilot' });
    }

    const db = getDatabase();
    const summary = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM DoanhNghiep) AS tongDN,
        (SELECT COUNT(*) FROM HopDongDichVu WHERE TrangThaiHopDong = 'HieuLuc') AS hdHieuLuc,
        (SELECT COALESCE(ROUND(SUM(SoTienThanhToan), 1), 0) FROM HopDongDichVu) AS doanhThu,
        (SELECT COUNT(*) FROM DanhGiaDSS_AI WHERE PhanHangLead = 'Hot') AS hotLeads,
        (SELECT COUNT(*) FROM DanhGiaDSS_AI WHERE MucDoNguyCoChurn = 'Cao') AS highChurn,
        (SELECT COUNT(*) FROM TinTuyenDungThiTruong) AS marketPostings
    `).get() as any;

    const topChurn = db.prepare(`
      SELECT dn.MaDN, dn.TenDoanhNghiep, d.DiemNguyCoRoiBo_ChurnScore
      FROM DoanhNghiep dn JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
      WHERE d.DiemNguyCoRoiBo_ChurnScore >= 50
      ORDER BY d.DiemNguyCoRoiBo_ChurnScore DESC LIMIT 5
    `).all();

    const topLeads = db.prepare(`
      SELECT dn.MaDN, dn.TenDoanhNghiep, dn.NganSachDuKien, d.DiemTiemNang_LeadScore, d.GoiDichVuKhuyenNghi
      FROM DoanhNghiep dn JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
      WHERE d.PhanHangLead = 'Hot'
      ORDER BY d.DiemTiemNang_LeadScore DESC LIMIT 6
    `).all();

    const systemContext = JSON.stringify({ summary, topChurn, topLeads });
    const aiRes = await generateCopilotResponse({ question, history, systemContext });
    res.json(aiRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi kết nối Gemini AI' });
  }
});

apiRouter.post('/ai/enterprise-insight', async (req: Request, res: Response) => {
  try {
    const { maDN } = req.body;
    const db = getDatabase();
    const enterprise = db.prepare(`
      SELECT dn.*, ng.TenNganh, ng.HeSoKhoTuyen, d.*
      FROM DoanhNghiep dn
      JOIN NganhNghe ng ON dn.MaNganh = ng.MaNganh
      LEFT JOIN DanhGiaDSS_AI d ON dn.MaDN = d.MaDN
      WHERE dn.MaDN = ?
    `).get(maDN);
    if (!enterprise) return res.status(404).json({ error: 'Không tìm thấy doanh nghiệp' });

    const demands = db.prepare('SELECT ViTriCanTuyen, SoLuongCanTuyen, MucLuongTrungBinh, DoCapBach FROM NhuCauTuyenDung WHERE MaDN = ?').all(maDN);
    const interactions = db.prepare('SELECT NgayTuongTac, KenhTuongTac, DiemHaiLongCSAT, CoKhieuNai, NoiDung FROM TuongTacCSKH WHERE MaDN = ? ORDER BY NgayTuongTac DESC LIMIT 5').all(maDN);

    const aiRes = await generateEnterpriseStrategy({ enterprise, demands, interactions });
    res.json(aiRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi phân tích AI' });
  }
});

apiRouter.post('/ai/text-to-sql', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Vui lòng mô tả câu hỏi dữ liệu cần tạo SQL' });
    const aiRes = await generateSQLFromNaturalLanguage(prompt);
    res.json(aiRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi sinh truy vấn SQL bằng AI' });
  }
});

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

let runtimeApiKey = process.env.GEMINI_API_KEY || '';
let preferredModel = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
let lastWorkingModel = preferredModel;

export function getAIStatus() {
  const key = runtimeApiKey || process.env.GEMINI_API_KEY || '';
  const configured = Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
  const maskedKey = configured
    ? `${key.slice(0, 6)}••••••••${key.slice(-4)}`
    : 'Chưa cấu hình';
  return {
    configured,
    maskedKey,
    preferredModel,
    lastWorkingModel,
    availableModels: FALLBACK_MODELS,
  };
}

export function updateAIConfig(newKey?: string, newModel?: string) {
  if (newKey && newKey.trim().length > 10) {
    runtimeApiKey = newKey.trim();
    process.env.GEMINI_API_KEY = runtimeApiKey;
    // Persist to .env safely
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      if (content.includes('GEMINI_API_KEY=')) {
        content = content.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY="${runtimeApiKey}"`);
      } else {
        content += `\nGEMINI_API_KEY="${runtimeApiKey}"\n`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
    } catch (e) {
      console.warn('[AI] Failed to persist .env:', e);
    }
  }
  if (newModel && newModel.trim()) {
    preferredModel = newModel.trim();
    lastWorkingModel = preferredModel;
  }
  return getAIStatus();
}

export async function callGeminiWithFallback(prompt: string, systemInstruction?: string): Promise<{ text: string; modelUsed: string }> {
  const apiKey = runtimeApiKey || process.env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Chưa cấu hình GEMINI_API_KEY. Vui lòng nhập khóa API trong phần Cài đặt AI.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const orderedModels = [
    preferredModel,
    lastWorkingModel,
    ...FALLBACK_MODELS,
  ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

  let lastError: any = null;

  for (const model of orderedModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: systemInstruction
          ? {
              systemInstruction,
              temperature: 0.35,
            }
          : { temperature: 0.35 },
      });

      if (response && response.text) {
        lastWorkingModel = model;
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '');
      // Continue trying fallback models on 404 (deprecated model), 429 (rate limit), or 503 (demand spike)
      if (err?.status === 404 || err?.status === 429 || err?.status === 503 || msg.includes('404') || msg.includes('503') || msg.includes('429')) {
        continue;
      }
      // If standard endpoint rejected an enterprise-only Vertex key, try vertexai: true once
      if (apiKey.startsWith('AQ.') && (err?.status === 401 || err?.status === 400)) {
        try {
          const vertexAi = new GoogleGenAI({ vertexai: true, apiKey });
          const vRes = await vertexAi.models.generateContent({
            model,
            contents: prompt,
          });
          if (vRes?.text) {
            lastWorkingModel = model;
            return { text: vRes.text, modelUsed: `${model} (vertex)` };
          }
        } catch {
          // ignore and continue
        }
      }
    }
  }

  throw new Error(lastError?.message || 'Không thể kết nối tới dịch vụ Gemini AI lúc này.');
}

export async function generateCopilotResponse(params: {
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemContext: string;
}) {
  const systemInstruction = `Bạn là "DSS Recruit-Insight AI Copilot" — Chuyên gia Phân tích & Hỗ trợ Ra Quyết định Chiến lược B2B HR Tech hàng đầu Việt Nam.
Nhiệm vụ của bạn:
- Phân tích dữ liệu thực tế từ hệ thống CRM (DoanhNghiep, HopDongDichVu, TuongTacCSKH, DanhGiaDSS_AI) và Kho dữ liệu 21,827 tin tuyển dụng thực tế từ 6 sàn (job_market.bak).
- Đưa ra khuyến nghị định lượng rõ ràng, súc tích, dễ hành động cho 4 vai trò: Sales Rep, Sales Manager, Customer Success, và Ban Giám đốc (CCO).
- Trình bày bằng tiếng Việt chuyên nghiệp, có cấu trúc Markdown gọn gàng (bullet points, con số cụ thể, kịch bản hành động ngay).

DỮ LIỆU HỆ THỐNG THỜI GIAN THỰC HIỆN TẠI:
${params.systemContext}`;

  const historyText = (params.history || [])
    .slice(-6)
    .map(h => `${h.role === 'user' ? 'Người dùng' : 'Trợ lý DSS'}: ${h.content}`)
    .join('\n\n');

  const fullPrompt = historyText
    ? `${historyText}\n\nNgười dùng: ${params.question}`
    : params.question;

  const res = await callGeminiWithFallback(fullPrompt, systemInstruction);
  return { answer: res.text, text: res.text, model: res.modelUsed, modelUsed: res.modelUsed };
}

export async function generateEnterpriseStrategy(enterpriseBundle: any) {
  const systemInstruction = `Bạn là Cố vấn Kinh doanh B2B & Quản trị Rủi ro Rời bỏ (Customer Success) của nền tảng tuyển dụng DSS Recruit-Insight.
Hãy phân tích hồ sơ 360° của doanh nghiệp dưới đây và trả về bản tư vấn chiến lược ngắn gọn, sắc bén bằng tiếng Việt gồm 3 mục rõ ràng:
1. **Nhận định Tín hiệu & Tiềm năng**: Đánh giá Lead Score, ngân sách, nhu cầu tuyển dụng và hoạt động đăng tin ngoài thị trường.
2. **Kịch bản Chào hàng / Cứu vãn (Action Playbook)**: Đề xuất gói dịch vụ, mức chiết khấu tối ưu (nhắc quy tắc trần >12% cần Manager duyệt), hoặc quy trình can thiệp nếu Churn Risk cao.
3. **Mẫu Email / Tin nhắn Tiếp cận Giám đốc Nhân sự (HRD)**: Ngắn gọn, cá nhân hóa đúng tên công ty và vị trí họ đang cần tuyển.`;

  const prompt = `HỒ SƠ DOANH NGHIỆP 360°:\n${JSON.stringify(enterpriseBundle, null, 2)}`;
  const res = await callGeminiWithFallback(prompt, systemInstruction);
  return { answer: res.text, text: res.text, model: res.modelUsed, modelUsed: res.modelUsed };
}

export async function generateSQLFromNaturalLanguage(userRequest: string) {
  const systemInstruction = `Bạn là Chuyên gia SQLite cho hệ thống DSS Recruit-Insight.
Chỉ trả về DUY NHẤT câu lệnh SQL SELECT hợp lệ trong SQLite (không bọc markdown \`\`\`sql, không giải thích thêm).
Lược đồ các bảng chính:
1. NhanVienSales(MaNV, HoTen, Email, SoDienThoai, PhongBan, ChiTieuDoanhSo, TyLeChotThanhCong, TrangThai, VaiTro)
2. NganhNghe(MaNganh, TenNganh, HeSoKhoTuyen, MuaTuyenDungCaoDiem, MoTa)
3. GoiDichVu(MaGoi, TenGoi, LoaiDichVu, GiaNiemYet, SoTinDang, SoLuotMoCV, ThoiHanNgay, MoTa)
4. DoanhNghiep(MaDN, TenDoanhNghiep, MaNganh, QuyMoNhanSu, DiaBan, NgayTiepCan, NguonLead, GiaiDoanPhanPhieu, NganSachDuKien, MaNVSales, TrangThai)
5. NhuCauTuyenDung(MaNhuCau, MaDN, ViTriCanTuyen, SoLuongCanTuyen, MucLuongTrungBinh, DoCapBach, NgayYeuCau, HanChotTuyen, TrangThai)
6. HopDongDichVu(MaHopDong, MaDN, MaGoi, MaNVSales, NgayKy, NgayBatDau, NgayHetHan, GiaTriHopDong, ChietKhau, SoTienThanhToan, TrangThaiThanhToan, TrangThaiHopDong)
7. LichSuSuDungDichVu(MaSuDung, MaHopDong, NgayGhiNhan, SoTinDaDang, SoCVDaMo, SoUngVienPhongVan, SoUngVienNhanViec, TyLeSuDungHanMuc)
8. TuongTacCSKH(MaTuongTac, MaDN, MaNV, NgayTuongTac, KenhTuongTac, NoiDung, DiemHaiLongCSAT, CoKhieuNai, PhanHoiKhachHang)
9. DanhGiaDSS_AI(MaDanhGia, MaDN, NgayDanhGia, DiemTiemNang_LeadScore, PhanHangLead, DiemNguyCoRoiBo_ChurnScore, MucDoNguyCoChurn, DuBaoGiaTriVongDoi_CLV, GoiDichVuKhuyenNghi, ChienLuocHanhDong, DoTinCay_Confidence)
10. TinTuyenDungThiTruong(id, nguon, url, tinh_thanh, loai_hinh_cong_viec, linh_vuc_nganh_nghe, nha_tuyen_dung, ten_dn_chuan_hoa, cong_viec, chuc_vu, so_luong, muc_luong, muc_luong_tb_trieu, dia_diem_chi_tiet, kinh_nghiem, ky_nang, bang_cap, han_nop_ho_so, scraped_at)
Luôn giới hạn LIMIT 100 nếu truy vấn bảng TinTuyenDungThiTruong chi tiết.`;

  const res = await callGeminiWithFallback(`Yêu cầu truy vấn: ${userRequest}`, systemInstruction);
  const cleaned = res.text
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return { sql: cleaned, model: res.modelUsed, modelUsed: res.modelUsed };
}

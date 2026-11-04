# DSS RECRUIT-INSIGHT
## Hệ Thống Khai Thác Khách Hàng & Hỗ Trợ Ra Quyết Định Tuyển Dụng B2B (Tích hợp Gemini AI & `job_market.bak`)

---

### 1. Tổng quan Nền tảng
**DSS Recruit-Insight** là nền tảng quản trị khách hàng B2B (CRM 360°) kết hợp Hệ Hỗ trợ Ra Quyết định (Decision Support System) và Trí tuệ Nhân tạo **Google Gemini AI**, vận hành trực tiếp trên kho dữ liệu thực nghiệm **21.827 tin tuyển dụng** trích xuất từ tệp sao lưu **`job_market.bak`** (6 sàn lớn nhất Việt Nam: **TopCV, JobsGO, Vieclam24h, CareerViet, VietnamWorks, CareerLink**).

#### Điểm nổi bật của hệ thống:
- **Thiết kế Data-Dense Executive Dashboard (`docs/DESIGN_SYSTEM.md`)**: Hỗ trợ chuyển đổi tức thời giữa **Crisp Executive Light Mode** (mặc định, độ tương phản ≥ 4.5:1) và **High-Contrast Dark Mode**, phông chữ `Be Vietnam Pro` + `Fira Code` (`tabular-nums`), biểu đồ tương tác `Recharts`, đáp ứng đầy đủ từ Mobile (`375px`) tới Desktop (`1440px+`).
- **Đồng bộ Tự động 21.827 Tin Tuyển Dụng Thực tế**:
  - Khi clone dự án từ GitHub, hệ thống tự động giải nén và nạp toàn bộ **21.827 tin tuyển dụng** từ `database/job_market_seed.json.gz` vào SQLite trong ~1 giây (hoặc đọc trực tiếp từ tệp gốc `job_market.bak` qua `database/import_job_market_bak.py`).
  - Săn **694 doanh nghiệp đăng tuyển đa sàn (≥ 2 sàn)** và **76 tập đoàn lớn (≥ 3 sàn)**, chuyển đổi 1-Click thành Lead CRM kèm theo các vị trí tuyển dụng thực tế.
  - Hỗ trợ **Xem chi tiết 22 trường JD, Thêm, Sửa, Xóa, Lọc phân trang & Khôi phục dữ liệu** kho tin tuyển dụng.
- **Quản trị Dữ liệu CRM Toàn diện (Full CRUD)**:
  - **Thêm / Xem 360° / Chỉnh sửa / Xóa** đầy đủ trên 5 phân mục: *Doanh nghiệp & Leads*, *Hợp đồng & Tiêu hao Hạn mức*, *Nhu cầu Tuyển dụng*, *Lịch sử Chăm sóc CSKH & CSAT*, và *Danh mục Gói Dịch vụ*.
  - Mọi thao tác cập nhật tự động kích hoạt tính toán lại điểm **AHP Lead Score** và **Churn Risk Score** theo thời gian thực.
- **Tích hợp Google Gemini AI Copilot**:
  - **AI Decision Copilot Drawer**: Hỏi đáp chiến lược kinh doanh dựa trên số liệu thật của hệ thống.
  - **AI 360° Enterprise Pitch**: Tự động phân tích hồ sơ doanh nghiệp và soạn kịch bản tư vấn + Cold Email cá nhân hóa.
  - **AI Text-to-SQL**: Chuyển câu hỏi tiếng Việt tự nhiên thành truy vấn SQLite hợp lệ và thực thi trực tiếp.

---

### 2. Cấu trúc Cây Thư Mục
```text
dss-recruit-insight/
├── database/
│   ├── schema.sql                        # Lược đồ 10 bảng SQLite 3NF + Indexes
│   ├── job_market_seed.json.gz           # Kho 21.827 tin thực tế nén chuẩn Gzip (tự động nạp khi chạy)
│   └── import_job_market_bak.py          # Bộ giải mã nhị phân trực tiếp từ tệp job_market.bak
├── docs/
│   ├── Bao_Cao_N14_HTTT_Ho_Tro_Ra_Quyet_Dinh.pdf
│   ├── DESIGN_SYSTEM.md                  # Tài liệu chuẩn thiết kế UI/UX Pro Max
│   └── TECHNICAL_DECISIONS.md            # Thuyết minh kiến trúc & quyết định kỹ thuật
├── server/                               # Backend (Express + SQLite WAL + Gemini AI)
│   ├── index.ts                          # Entry point máy chủ Express + Vite Middleware
│   ├── api.ts                            # RESTful API Router (CRUD, DSS, Market, Reports, AI)
│   ├── db.ts                             # Kết nối SQLite & tự động khởi tạo CSDL
│   ├── seed.ts                           # Khởi tạo dữ liệu chuẩn cho 9 bảng CRM
│   ├── sqlQueries.ts                     # 18 mẫu truy vấn phân tích OLAP (Q01 - Q18)
│   ├── aiService.ts                      # Tích hợp @google/genai với cơ chế Fallback đa mô hình
│   └── marketData.ts                     # Dữ liệu dự phòng thị trường
├── src/                                  # Frontend (React 19 + Tailwind CSS v4 + Recharts)
│   ├── components/
│   │   ├── layout/                       # Sidebar.tsx, TopBar.tsx
│   │   ├── modals/                       # Enterprise360Modal.tsx, AICopilotDrawer.tsx, LoginModal.tsx
│   │   ├── ui/                           # UIPrimitives.tsx (Toast, ConfirmDialog, Badges)
│   │   └── views/                        # DashboardView, CRMView, MarketMiningView, DSSEngineView, ReportsView, SQLExplorerView
│   ├── services/
│   │   └── dssAlgorithms.ts              # Công thức toán học 5 mô hình DSS (DSS-01 -> DSS-05)
│   ├── types/
│   │   └── index.ts                      # TypeScript Interfaces toàn hệ thống
│   ├── utils/
│   │   └── exportCsv.ts                  # Xuất báo cáo CSV chuẩn UTF-8 BOM
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example                          # Mẫu cấu hình biến môi trường
├── .gitignore
├── index.html
├── package.json
├── run_app.bat                           # Khởi chạy nhanh 1-Click trên Windows
├── stop_app.bat                          # Dừng tiến trình máy chủ
├── tsconfig.json
└── vite.config.ts
```

---

### 3. Hướng dẫn Cài đặt & Khởi chạy
```bash
# 1. Cài đặt thư viện
npm install

# 2. Tạo tệp .env từ .env.example và điền GEMINI_API_KEY của bạn
cp .env.example .env

# 3. Khởi động hệ thống Full-stack (Tự động khởi tạo CSDL & 21.827 tin thị trường)
npm run dev
```
Hoặc trên Windows, kích đúp trực tiếp vào tệp **`run_app.bat`** để mở tại **`http://localhost:3000`**.

---

### 4. Tài khoản Kiểm thử Phân quyền (RBAC — Mật khẩu: `password123`)
Chuyển đổi 1-Click giữa 4 vai trò ngay tại góc trên bên phải giao diện:
- **Ban Giám Đốc (`Executive`)**: `cco@recruitinsight.vn` — Toàn quyền quản trị & phê duyệt chiết khấu > 12%.
- **Trưởng phòng Kinh doanh (`SalesManager`)**: `tuan.do@recruitinsight.vn` — Phê duyệt hợp đồng vượt trần chiết khấu 12%.
- **Chuyên viên Tư vấn B2B (`Sales`)**: `yen.vu@recruitinsight.vn` — Khai thác Lead đa sàn, ký hợp đồng tiêu chuẩn (≤ 12%).
- **Chuyên viên Chăm sóc KH (`CustomerSuccess`)**: `thao.pham@recruitinsight.vn` — Cập nhật hạn mức, CSAT & cứu vãn Churn.

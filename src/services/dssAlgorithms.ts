/**
 * DSS Calculation Algorithms
 * Exact formulas matching Chapter 3 and Technical Decisions:
 * DSS-01: AHP & AI Lead Scoring
 * DSS-02: Package Recommender & Pricing
 * DSS-03: Customer Churn Risk Early Warning
 * DSS-04: What-If Strategic Simulation
 * DSS-05: Job Market Lead Mining Normalization
 */

export interface LeadScoringInput {
  qm: number;       // Quy mô nhân sự
  ns: number;       // Ngân sách tuyển dụng hàng năm (Triệu VNĐ)
  sl: number;       // Số vị trí cần tuyển
  luong: number;    // Mức lương bình quân (Triệu VNĐ/tháng)
  kho: number;      // Hệ số khó tuyển (1.0 - 2.5)
  cb: number;       // Mức độ cấp bách (1: DaiHan, 2: BinhThuong, 3: Gap, 4: RatGap)
}

export interface LeadScoringResult {
  score: number;
  tier: 'Hot' | 'Warm' | 'Cold';
  breakdown: {
    budgetScore: number;     // max 30
    scaleScore: number;      // max 25
    urgencyScore: number;    // max 20
    positionsScore: number;  // max 10
    salaryScore: number;     // max 8
    difficultyScore: number; // max 7
  };
  recommendation: string;
  confidence: number;
}

export function calculateLeadScore(input: LeadScoringInput): LeadScoringResult {
  const ns = Math.max(0, input.ns);
  const qm = Math.max(0, input.qm);
  const cb = Math.min(4, Math.max(1, input.cb));
  const sl = Math.max(0, input.sl);
  const luong = Math.max(0, input.luong);
  const kho = Math.max(1.0, input.kho);

  // S = [min(ns / 300, 1.0) × 30] + [min(ln(1 + qm) / ln(1 + 20000), 1.0) × 25] + [(cb / 4) × 20] + [min(sl / 30, 1.0) × 10] + [min(luong / 40, 1.0) × 8] + [min(kho / 2.5, 1.0) × 7]
  const budgetScore = Math.min(ns / 300, 1.0) * 30;
  const scaleScore = Math.min(Math.log(1 + qm) / Math.log(1 + 20000), 1.0) * 25;
  const urgencyScore = (cb / 4.0) * 20;
  const positionsScore = Math.min(sl / 30, 1.0) * 10;
  const salaryScore = Math.min(luong / 40, 1.0) * 8;
  const difficultyScore = Math.min(kho / 2.5, 1.0) * 7;

  const rawScore = budgetScore + scaleScore + urgencyScore + positionsScore + salaryScore + difficultyScore;
  const score = Math.round(rawScore * 10) / 10;

  let tier: 'Hot' | 'Warm' | 'Cold';
  let recommendation: string;

  if (score >= 70.0) {
    tier = 'Hot';
    recommendation = 'Khẩn cấp. Phân bổ cho Key Account Manager liên hệ trong 2 giờ, đặt lịch hẹn gặp Giám đốc Nhân sự demo giải pháp trực tiếp.';
  } else if (score >= 45.0) {
    tier = 'Warm';
    recommendation = 'Nuôi dưỡng (Nurturing). Gửi báo cáo phân tích thị trường lương ngành, mời dùng thử và gọi tư vấn sau 48 giờ.';
  } else {
    tier = 'Cold';
    recommendation = 'Tự động hóa. Đưa vào luồng Email Marketing Automation định kỳ và mời tham gia các hội thảo tuyển dụng trực tuyến.';
  }

  // Calculate synthetic confidence based on data completeness
  const confidence = Math.min(0.98, 0.70 + (input.ns > 0 ? 0.08 : 0) + (input.qm > 0 ? 0.08 : 0) + (input.sl > 0 ? 0.06 : 0) + (input.luong > 0 ? 0.06 : 0));

  return {
    score,
    tier,
    breakdown: {
      budgetScore: Math.round(budgetScore * 10) / 10,
      scaleScore: Math.round(scaleScore * 10) / 10,
      urgencyScore: Math.round(urgencyScore * 10) / 10,
      positionsScore: Math.round(positionsScore * 10) / 10,
      salaryScore: Math.round(salaryScore * 10) / 10,
      difficultyScore: Math.round(difficultyScore * 10) / 10,
    },
    recommendation,
    confidence: Math.round(confidence * 100) / 100
  };
}

export interface PackageOffer {
  maGoi: string;
  tenGoi: string;
  loaiDichVu: string;
  giaNiemYet: number;
  soTinDang: number;
  soLuotMoCV: number;
  thoiHanNgay: number;
  moTa: string;
}

export const CATALOG_PACKAGES: PackageOffer[] = [
  { maGoi: 'PKG01', tenGoi: 'Basic Job Post 5', loaiDichVu: 'DangTin', giaNiemYet: 4.5, soTinDang: 5, soLuotMoCV: 20, thoiHanNgay: 30, moTa: 'Gói đăng tin cơ bản cho doanh nghiệp SME tuyển số lượng ít' },
  { maGoi: 'PKG02', tenGoi: 'Pro CV Search 100', loaiDichVu: 'LocCV', giaNiemYet: 15.0, soTinDang: 0, soLuotMoCV: 100, thoiHanNgay: 60, moTa: 'Gói lọc và tìm kiếm hồ sơ ứng viên tài năng chất lượng cao' },
  { maGoi: 'PKG03', tenGoi: 'VIP Urgent Tech Hiring', loaiDichVu: 'Combo', giaNiemYet: 28.0, soTinDang: 15, soLuotMoCV: 250, thoiHanNgay: 90, moTa: 'Combo đẩy tin vị trí HOT ngành Công nghệ & tuyển dụng khẩn cấp' },
  { maGoi: 'PKG04', tenGoi: 'Diamond Branding Combo', loaiDichVu: 'Combo', giaNiemYet: 45.0, soTinDang: 30, soLuotMoCV: 600, thoiHanNgay: 180, moTa: 'Combo tuyển dụng đa kênh kèm banner quảng bá thương hiệu tuyển dụng' },
  { maGoi: 'PKG05', tenGoi: 'Headhunt Executive Talent', loaiDichVu: 'Headhunting', giaNiemYet: 90.0, soTinDang: 10, soLuotMoCV: 500, thoiHanNgay: 90, moTa: 'Dịch vụ săn đầu người cấp quản lý và chuyên gia cao cấp cam kết bảo hành' },
  { maGoi: 'PKG06', tenGoi: 'Enterprise ATS Suite', loaiDichVu: 'GiaiPhap', giaNiemYet: 150.0, soTinDang: 100, soLuotMoCV: 2500, thoiHanNgay: 365, moTa: 'Giải pháp phần mềm quản trị tuyển dụng toàn diện và cổng việc làm riêng cho tập đoàn' }
];

export interface RecommenderInput {
  maNganh: string;
  nganSach: number;
  soLuongTuyen: number;
  doCapBach: number; // 1-4
  heSoKho?: number;
}

export interface RecommenderResult {
  bestPackage: PackageOffer;
  fitScore: number;
  suggestedDiscount: number;
  finalPrice: number;
  reason: string;
  allPackages: Array<PackageOffer & { fitScore: number; suggestedDiscount: number; finalPrice: number }>;
}

export function recommendPackage(input: RecommenderInput): RecommenderResult {
  const budget = Math.max(0, input.nganSach);
  const positions = Math.max(1, input.soLuongTuyen);
  const urgency = input.doCapBach;
  const difficulty = input.heSoKho || 1.2;

  const scoredPackages = CATALOG_PACKAGES.map((pkg) => {
    let fit = 50;

    // Price fit
    if (budget >= pkg.giaNiemYet * 0.8 && budget <= pkg.giaNiemYet * 2.5) {
      fit += 30;
    } else if (budget >= pkg.giaNiemYet * 0.6) {
      fit += 15;
    } else {
      fit -= 20;
    }

    // Positions fit
    if (positions > 20 && (pkg.maGoi === 'PKG06' || pkg.maGoi === 'PKG04')) fit += 25;
    else if (positions >= 8 && (pkg.maGoi === 'PKG03' || pkg.maGoi === 'PKG04')) fit += 20;
    else if (positions < 5 && pkg.maGoi === 'PKG01') fit += 25;

    // High salary / Urgent / Executive
    if (difficulty >= 1.8 && (pkg.maGoi === 'PKG05' || pkg.maGoi === 'PKG03')) fit += 20;
    if (urgency >= 3 && (pkg.maGoi === 'PKG03' || pkg.maGoi === 'PKG05')) fit += 15;

    const fitScore = Math.min(99, Math.max(10, Math.round(fit)));

    // Pricing Rule
    let suggestedDiscount = 8;
    if (budget >= 1.5 * pkg.giaNiemYet) {
      suggestedDiscount = 5;
    } else if (budget < pkg.giaNiemYet) {
      suggestedDiscount = 11; // 10-12% policy
    }

    const finalPrice = Math.round(pkg.giaNiemYet * (1 - suggestedDiscount / 100) * 10) / 10;

    return {
      ...pkg,
      fitScore,
      suggestedDiscount,
      finalPrice
    };
  });

  scoredPackages.sort((a, b) => b.fitScore - a.fitScore);
  const best = scoredPackages[0];

  let reason = `Gói ${best.tenGoi} đạt độ tương thích cao nhất (${best.fitScore}%) phù hợp với ngân sách dự kiến ${budget} Tr và nhu cầu tuyển ${positions} nhân sự.`;
  if (best.suggestedDiscount === 5) {
    reason += ' Ngân sách doanh nghiệp dồi dào (>= 1.5 lần giá niêm yết), đề xuất mức chiết khấu thấp 5% để tối đa hóa biên lợi nhuận.';
  } else if (best.suggestedDiscount >= 10) {
    reason += ' Ngân sách doanh nghiệp có phần eo hẹp so với giá niêm yết, đề xuất chiết khấu kích cầu 10-12% để hỗ trợ chốt hợp đồng.';
  } else {
    reason += ' Áp dụng mức chiết khấu tiêu chuẩn 8% theo quy chuẩn thương mại của bộ phận Sales.';
  }

  return {
    bestPackage: best,
    fitScore: best.fitScore,
    suggestedDiscount: best.suggestedDiscount,
    finalPrice: best.finalPrice,
    reason,
    allPackages: scoredPackages
  };
}

export interface ChurnInput {
  util: number;        // Tỷ lệ sử dụng hạn mức (0.0 - 1.0)
  csat: number;        // Điểm hài lòng CSAT (1 - 5)
  khieu_nai: number;   // Số lần khiếu nại (0, 1, 2...)
  days_left: number;   // Số ngày còn lại hợp đồng
  interactions: number;// Số lượt tương tác CSKH
}

export interface ChurnResult {
  score: number;       // 5.0% - 98.0%
  level: 'Cao' | 'TrungBinh' | 'Thap';
  factors: {
    utilPenalty: number;
    csatPenalty: number;
    complaintPenalty: number;
    expiryPenalty: number;
    interactionBonus: number;
  };
  recommendation: string;
}

export function calculateChurnScore(input: ChurnInput): ChurnResult {
  const util = Math.min(1.0, Math.max(0.0, input.util));
  const csat = Math.min(5.0, Math.max(1.0, input.csat));
  const khieu_nai = Math.max(0, input.khieu_nai);
  const days_left = input.days_left;
  const interactions = Math.max(0, input.interactions);

  // P = [(1.0 - util) × 35] + [((5.0 - csat) / 4.0) × 30] + [khieu_nai × 12] + [15 nếu days_left < 30 else 0] - [(min(interactions, 15) / 15.0) × 10]
  const utilPenalty = (1.0 - util) * 35;
  const csatPenalty = ((5.0 - csat) / 4.0) * 30;
  const complaintPenalty = khieu_nai * 12;
  const expiryPenalty = days_left < 30 ? 15 : 0;
  const interactionBonus = (Math.min(interactions, 15) / 15.0) * 10;

  const rawScore = utilPenalty + csatPenalty + complaintPenalty + expiryPenalty - interactionBonus;
  // Clamped between 5.0% and 98.0% as defined in specification
  const score = Math.min(98.0, Math.max(5.0, Math.round(rawScore * 10) / 10));

  let level: 'Cao' | 'TrungBinh' | 'Thap';
  let recommendation: string;

  if (score >= 65.0) {
    level = 'Cao';
    recommendation = 'BÁO ĐỘNG ĐỎ: Khách hàng có nguy cơ hủy/bỏ dịch vụ cực cao. Kích hoạt quy trình cứu vãn khẩn cấp, Trưởng phòng CSKH gọi điện trực tiếp, tặng ưu đãi gia hạn hoặc hỗ trợ bảo hành lọc ứng viên.';
  } else if (score >= 35.0) {
    level = 'TrungBinh';
    recommendation = 'CẢNH BÁO VÀNG: Tăng tần suất chăm sóc và khảo sát nhu cầu, hỗ trợ doanh nghiệp đăng lại tin hoặc mở rộng tiêu chí tìm hồ sơ.';
  } else {
    level = 'Thap';
    recommendation = 'AN TOÀN: Khách hàng có mức độ hài lòng tốt và tiêu hao hạn mức đồng đều. Lên lịch đàm phán hợp đồng tái ký hoặc tư vấn gói gia hạn mở rộng.';
  }

  return {
    score,
    level,
    factors: {
      utilPenalty: Math.round(utilPenalty * 10) / 10,
      csatPenalty: Math.round(csatPenalty * 10) / 10,
      complaintPenalty: Math.round(complaintPenalty * 10) / 10,
      expiryPenalty: Math.round(expiryPenalty * 10) / 10,
      interactionBonus: Math.round(interactionBonus * 10) / 10,
    },
    recommendation
  };
}

export interface WhatIfInput {
  baseDeals?: number;            // Hợp đồng gốc (mặc định 38)
  baseAvgDealPrice?: number;     // Giá trị deal gốc (mặc định ~62.2 Tr)
  baseDiscountPct?: number;      // Chiết khấu gốc % (mặc định ~8%)
  baseMarketingBudget?: number;  // Ngân sách marketing gốc (mặc định 150 Tr)
  discountPct: number;           // Chiết khấu mới %
  marketingBudgetChangePct: number; // Tăng giảm ngân sách Marketing % (+/-)
  marketDemandShiftPct: number;  // Biến động nhu cầu thị trường % (+/-)
}

export interface WhatIfResult {
  expectedDeals: number;
  dealGrowthPct: number;
  grossRevenue: number;          // Doanh thu niêm yết
  netRevenue: number;            // Doanh thu thực thu
  netRevenueChangePct: number;
  estimatedCost: number;         // Chi phí vận hành ước tính
  netProfit: number;             // Lợi nhuận ròng
  netMarginPct: number;          // Biên lợi nhuận %
  warning: string | null;
  insight: string;
}

export function simulateWhatIf(input: WhatIfInput): WhatIfResult {
  const baseDeals = input.baseDeals || 38;
  const baseAvgDealPrice = input.baseAvgDealPrice || 62.2;
  const baseDiscountPct = input.baseDiscountPct ?? 8.0;
  const baseMarketingBudget = input.baseMarketingBudget || 150.0;

  const E = 1.3;  // Co giãn cầu theo giá
  const M = 0.7;  // Tác động marketing

  // Discount delta impact on quantity demanded
  // ΔQ/Q = E * (ΔDiscount) + M * (ΔMkt) + MarketShift
  const deltaDiscount = (input.discountPct - baseDiscountPct) / 100.0;
  const deltaMarketing = input.marketingBudgetChangePct / 100.0;
  const deltaDemand = input.marketDemandShiftPct / 100.0;

  const demandGrowth = (E * deltaDiscount) + (M * deltaMarketing) + deltaDemand;
  const expectedDeals = Math.max(5, Math.round(baseDeals * (1.0 + demandGrowth)));
  const dealGrowthPct = Math.round(((expectedDeals - baseDeals) / baseDeals) * 1000) / 10;

  const grossRevenue = Math.round(expectedDeals * baseAvgDealPrice * 10) / 10;
  const netRevenue = Math.round(grossRevenue * (1.0 - input.discountPct / 100.0) * 10) / 10;

  const baseGross = baseDeals * baseAvgDealPrice;
  const baseNet = baseGross * (1.0 - baseDiscountPct / 100.0);
  const netRevenueChangePct = Math.round(((netRevenue - baseNet) / baseNet) * 1000) / 10;

  // Cost model: Fixed cost 450 Tr + Variable cost (30% net revenue) + Marketing budget
  const newMarketingBudget = baseMarketingBudget * (1.0 + deltaMarketing);
  const estimatedCost = Math.round((450 + (netRevenue * 0.30) + newMarketingBudget) * 10) / 10;
  const netProfit = Math.round((netRevenue - estimatedCost) * 10) / 10;
  const netMarginPct = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0;

  let warning: string | null = null;
  if (input.discountPct > 15.0) {
    warning = 'CẢNH BÁO RỦI RO: Mức chiết khấu vượt ngưỡng 15.0%. Biên lợi nhuận ròng bị xói mòn nghiêm trọng, cần kiểm soát chính sách giảm giá!';
  } else if (netMarginPct < 20.0) {
    warning = 'CẢNH BÁO: Biên lợi nhuận dự kiến dưới 20%, chi phí vận hành và khuyến mãi đang ở mức báo động.';
  }

  let insight = `Kịch bản mô phỏng ước tính mang lại ${expectedDeals} hợp đồng chốt mới (${dealGrowthPct >= 0 ? '+' : ''}${dealGrowthPct}%), tổng doanh thu thuần ${netRevenue} Tr (${netRevenueChangePct >= 0 ? '+' : ''}${netRevenueChangePct}%).`;
  if (netProfit > 0) {
    insight += ` Lợi nhuận ròng dự phóng đạt ${netProfit} Tr với biên lợi nhuận ${netMarginPct}%.`;
  }

  return {
    expectedDeals,
    dealGrowthPct,
    grossRevenue,
    netRevenue,
    netRevenueChangePct,
    estimatedCost,
    netProfit,
    netMarginPct,
    warning,
    insight
  };
}

export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  let clean = name.trim();
  if (clean.toLowerCase() === 'không đề cập' || clean.toLowerCase() === 'n/a' || clean.toLowerCase() === 'none') {
    return '';
  }
  // Standardize common prefixes and abbreviations in Vietnamese business titles
  clean = clean.replace(/^(công ty|cty|ctcp|tnhh|tập đoàn|ngân hàng|chi nhánh)\s+/i, '');
  clean = clean.replace(/\s+(cổ phần|tnhh|vietnam|việt nam|group|corp|corporation)$/i, '');
  return clean.trim();
}

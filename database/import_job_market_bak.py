#!/usr/bin/env python3
"""
Direct SQL Server .bak (MTF Uncompressed MDF Pages) Importer for DSS Recruit-Insight.
Extracts all 6 job market platform tables from `job_market.bak` (TopCV, JobsGO,
Vieclam24h, CareerViet, VietnamWorks, CareerLink) including off-row LOB NVARCHAR(MAX)
fields and DATETIME2 timestamps, deduplicating into SQLite `TinTuyenDungThiTruong`.
"""

import os
import re
import sqlite3
import struct
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAK_PATH = os.path.join(ROOT_DIR, 'job_market.bak')
DB_PATH = os.path.join(ROOT_DIR, 'database', 'dss_recruit_insight.db')
SCHEMA_PATH = os.path.join(ROOT_DIR, 'database', 'schema.sql')

# Known object_ids in job_market.bak mapped to source platform (also auto-detected by URL)
PLATFORM_MAP = {
    236: 'TopCV',
    222: 'TopCV',
    229: 'JobsGO',
    256: 'Vieclam24h',
    249: 'CareerViet',
    238: 'VietnamWorks',
    263: 'CareerLink',
}


def detect_platform(url: str, fallback: str) -> str:
    u = (url or '').lower()
    if 'topcv.vn' in u:
        return 'TopCV'
    if 'jobsgo.vn' in u:
        return 'JobsGO'
    if 'vieclam24h.vn' in u:
        return 'Vieclam24h'
    if 'careerviet.vn' in u:
        return 'CareerViet'
    if 'vietnamworks.com' in u:
        return 'VietnamWorks'
    if 'careerlink.vn' in u:
        return 'CareerLink'
    return fallback


def normalize_company(name: str) -> str:
    if not name:
        return ''
    s = name.strip()
    low = s.lower()
    if low in ('không đề cập', 'khong de cap', 'n/a', 'none', 'ẩn danh', 'null', '-', ''):
        return ''
    s = re.sub(r'\s+', ' ', s)
    # Remove branch/parenthetical suffixes for canonical matching across platforms
    s_clean = s.upper()
    s_clean = re.sub(
        r'^(CÔNG TY\s+|CTY\s+)?(CỔ PHẦN\s+|CP\s+|TNHH\s+|TNHH MTV\s+|TNHH MỘT THÀNH VIÊN\s+|TMCP\s+|TẬP ĐOÀN\s+|CHI NHÁNH\s+)+',
        '',
        s_clean,
    )
    s_clean = re.sub(r'\s*[-–|]\s*CHI NHÁNH.*$', '', s_clean)
    s_clean = re.sub(r'\s+(VIỆT NAM|VIETNAM|VN|JSC|CO\.,?\s*LTD\.?|CORP\.?|CORPORATION|GROUP)\.?$', '', s_clean)
    return s_clean.strip(' -–,.')


def decode_datetime2(raw8: bytes) -> str:
    if len(raw8) != 8:
        return '2026-08-01 00:00:00'
    try:
        ticks = int.from_bytes(raw8[0:5], 'little')
        days = int.from_bytes(raw8[5:8], 'little')
        if 700000 <= days <= 800000:
            base = datetime(1, 1, 1) + timedelta(days=days, microseconds=ticks // 10)
            return base.strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        pass
    return '2026-08-01 00:00:00'


def parse_salary_million(salary_text: str):
    """Best-effort numeric average salary in Million VND/month for analytics."""
    if not salary_text:
        return None
    s = salary_text.lower().replace(',', '').replace('.', '')
    # Wait: keep decimal dots for triệu if needed, so parse original string carefully
    orig = salary_text.lower()
    if any(k in orig for k in ('thỏa thuận', 'thoả thuận', 'cạnh tranh', 'thương lượng', 'không đề cập', 'negotiable')):
        return None

    # USD handling
    if '$' in orig or 'usd' in orig:
        nums = [float(x.replace(',', '')) for x in re.findall(r'\d+(?:,\d+)*', orig)]
        nums = [n for n in nums if 100 <= n <= 20000]
        if nums:
            avg_usd = sum(nums[:2]) / len(nums[:2])
            return round(avg_usd * 0.0255, 1)

    # Full VND numbers like 10,000,000 - 30,000,000
    big_nums = [float(x.replace(',', '').replace('.', '')) for x in re.findall(r'\d{1,3}(?:[.,]\d{3}){2,}', orig)]
    if big_nums:
        vals = [n / 1_000_000.0 for n in big_nums if 1_000_000 <= n <= 500_000_000]
        if vals:
            return round(sum(vals[:2]) / len(vals[:2]), 1)

    # Million VND like "11 - 18 triệu" or "tới 25 triệu"
    if 'triệu' in orig or 'tr' in orig:
        m_nums = [float(x.replace(',', '.')) for x in re.findall(r'\d+(?:[.,]\d+)?', orig)]
        m_nums = [n for n in m_nums if 1.0 <= n <= 300.0]
        if m_nums:
            return round(sum(m_nums[:2]) / len(m_nums[:2]), 1)

    return None


def main():
    if not os.path.exists(BAK_PATH):
        print(f"[Import] job_market.bak not found at {BAK_PATH}")
        sys.exit(1)

    print(f"[Import] Reading {BAK_PATH}...")
    with open(BAK_PATH, 'rb') as f:
        data = f.read()

    pages_by_id = {}
    table_pages = defaultdict(list)

    for off in range(0, len(data) - 8192 + 1, 512):
        if data[off] == 1 and data[off + 1] in (1, 3, 4):
            ptype = data[off + 1]
            index_id, = struct.unpack_from('<H', data, off + 6)
            pminlen, = struct.unpack_from('<H', data, off + 14)
            slot_cnt, = struct.unpack_from('<H', data, off + 22)
            obj_id, = struct.unpack_from('<I', data, off + 24)
            free_cnt, free_data = struct.unpack_from('<HH', data, off + 28)
            page_id, file_id = struct.unpack_from('<IH', data, off + 32)
            if file_id == 1 and 96 <= free_data <= 8192 and free_cnt <= 8192 and slot_cnt < 2000:
                if page_id not in pages_by_id:
                    pages_by_id[page_id] = off
                    if ptype == 1 and index_id == 256 and pminlen == 16 and obj_id in PLATFORM_MAP:
                        table_pages[obj_id].append((page_id, off))

    def read_lob_slot(pid: int, fid: int, slot: int, depth: int = 0) -> bytes:
        if depth > 4 or fid != 1 or pid not in pages_by_id:
            return b''
        poff = pages_by_id[pid]
        lpb = data[poff : poff + 8192]
        lsc, = struct.unpack_from('<H', lpb, 22)
        if slot >= lsc:
            return b''
        lsoff, = struct.unpack_from('<H', lpb, 8192 - 2 * (slot + 1))
        if lsoff < 96 or lsoff + 14 > 8192:
            return b''
        l_len, = struct.unpack_from('<H', lpb, lsoff + 2)
        l_type, = struct.unpack_from('<H', lpb, lsoff + 12)
        if l_type == 3:  # DATA chunk
            return lpb[lsoff + 14 : min(8192, lsoff + l_len)]
        elif l_type == 5:  # INTERNAL B-tree node
            cur_i = lsoff + 16
            out = []
            while cur_i + 16 <= min(8192, lsoff + l_len):
                _, c_pid, c_fid, c_slot = struct.unpack_from('<QIHH', lpb, cur_i)
                cur_i += 16
                out.append(read_lob_slot(c_pid, c_fid, c_slot, depth + 1))
            return b''.join(out)
        return lpb[lsoff + 14 : min(8192, lsoff + l_len)]

    def decode_lob(raw: bytes) -> str:
        if len(raw) < 24:
            return ''
        lob_type, = struct.unpack_from('<H', raw, 0)
        #Type 4 = LOB SMALL_ROOT / Pointer links at offset 12 (12 bytes per link: end_off 4B, pid 4B, fid 2B, slot 2B)
        #Type 2 = ROW_OVERFLOW (24 bytes: link at offset 12: length 4B, pid 4B, fid 2B, slot 2B)
        if lob_type in (0, 2, 4):
            pos = 12
            chunks = []
            while pos + 12 <= len(raw):
                _, pid, fid, slot = struct.unpack_from('<IIHH', raw, pos)
                pos += 12
                chunks.append(read_lob_slot(pid, fid, slot))
            return b''.join(chunks).decode('utf-16le', errors='ignore')
        return ''

    seen_urls = set()
    records = []

    for obj_id, fallback_plat in PLATFORM_MAP.items():
        plist = sorted(table_pages.get(obj_id, []))
        for pid, off in plist:
            pb = data[off : off + 8192]
            sc, = struct.unpack_from('<H', pb, 22)
            for s in range(sc):
                soff, = struct.unpack_from('<H', pb, 8192 - 2 * (s + 1))
                if soff < 96 or soff + 8 > 8192:
                    continue
                sa = pb[soff]
                rt = (sa >> 1) & 0x07
                if rt not in (0, 4):
                    continue
                fe, = struct.unpack_from('<H', pb, soff + 2)
                if soff + fe + 2 > 8192:
                    continue
                fb = pb[soff + 4 : soff + fe]
                if len(fb) < 12:
                    continue
                src_id, = struct.unpack_from('<I', fb, 0)
                scraped_at = decode_datetime2(fb[4:12])

                pos = soff + fe
                nc, = struct.unpack_from('<H', pb, pos)
                pos += 2 + (nc + 7) // 8
                vals = []
                if (sa & 0x20) and pos + 2 <= 8192:
                    nv, = struct.unpack_from('<H', pb, pos)
                    pos += 2
                    offs = [struct.unpack_from('<H', pb, pos + i * 2)[0] for i in range(nv)]
                    cur = pos + nv * 2
                    for idx, vo in enumerate(offs):
                        is_comp = (vo & 0x8000) != 0
                        end = vo & 0x7FFF
                        raw = pb[cur : soff + end]
                        cur = soff + end
                        if is_comp and rt == 4 and idx == nv - 1 and len(raw) == 9:
                            continue
                        if is_comp:
                            vals.append(decode_lob(raw).strip())
                        else:
                            vals.append(raw.decode('utf-16le', errors='ignore').strip())

                while len(vals) < 20:
                    vals.append('')

                url = vals[0]
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)

                nguon = detect_platform(url, fallback_plat)
                nha_td = vals[4] or 'Không đề cập'
                norm_dn = normalize_company(nha_td)
                luong_tb = parse_salary_million(vals[10])

                records.append((
                    f"{nguon[:3].upper()}_{src_id}_{len(records)+1}",
                    nguon,
                    url,
                    vals[1] or 'Toàn quốc',
                    vals[2] or 'Toàn thời gian',
                    vals[3] or 'Đa ngành',
                    nha_td,
                    norm_dn,
                    vals[5] or 'Vị trí tuyển dụng',
                    vals[6] or 'Nhân viên',
                    vals[7] or '1',
                    vals[8] or 'Không yêu cầu',
                    vals[9] or 'Không đề cập',
                    vals[10] or 'Thỏa thuận',
                    luong_tb,
                    vals[11] or 'Giờ hành chính',
                    vals[12] or '',
                    vals[13] or '',
                    vals[14] or '',
                    vals[15] or 'Không yêu cầu',
                    vals[16] or '',
                    vals[17] or 'Không yêu cầu',
                    vals[18] or '',
                    vals[19] or '',
                    scraped_at,
                ))

    print(f"[Import] Extracted {len(records):,} unique job postings from job_market.bak!")

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as sf:
            conn.executescript(sf.read())

    cur.executescript("""
        DROP TABLE IF EXISTS TinTuyenDungThiTruong;
        CREATE TABLE TinTuyenDungThiTruong (
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
    """)

    cur.executemany("""
        INSERT INTO TinTuyenDungThiTruong VALUES (
            ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
    """, records)

    cur.executescript("""
        CREATE INDEX idx_ttd_nguon ON TinTuyenDungThiTruong(nguon);
        CREATE INDEX idx_ttd_norm_dn ON TinTuyenDungThiTruong(ten_dn_chuan_hoa);
        CREATE INDEX idx_ttd_nha_td ON TinTuyenDungThiTruong(nha_tuyen_dung);
        CREATE INDEX idx_ttd_tinh_thanh ON TinTuyenDungThiTruong(tinh_thanh);
        CREATE INDEX idx_ttd_luong ON TinTuyenDungThiTruong(muc_luong_tb_trieu);
    """)

    conn.commit()

    # Print quick verification stats
    plat_counts = cur.execute("SELECT nguon, COUNT(*) FROM TinTuyenDungThiTruong GROUP BY nguon ORDER BY COUNT(*) DESC").fetchall()
    multi_2 = cur.execute("SELECT COUNT(*) FROM (SELECT ten_dn_chuan_hoa FROM TinTuyenDungThiTruong WHERE ten_dn_chuan_hoa != '' GROUP BY ten_dn_chuan_hoa HAVING COUNT(DISTINCT nguon) >= 2)").fetchone()[0]
    multi_3 = cur.execute("SELECT COUNT(*) FROM (SELECT ten_dn_chuan_hoa FROM TinTuyenDungThiTruong WHERE ten_dn_chuan_hoa != '' GROUP BY ten_dn_chuan_hoa HAVING COUNT(DISTINCT nguon) >= 3)").fetchone()[0]
    uniq_dn = cur.execute("SELECT COUNT(DISTINCT ten_dn_chuan_hoa) FROM TinTuyenDungThiTruong WHERE ten_dn_chuan_hoa != ''").fetchone()[0]

    print("[Import] Platform distribution:")
    for p, c in plat_counts:
        print(f"  - {p:15s}: {c:,} postings")
    print(f"[Import] Unique normalized companies: {uniq_dn:,}")
    print(f"[Import] Multi-platform (>=2): {multi_2:,} | (>=3): {multi_3:,}")
    conn.close()


if __name__ == '__main__':
    main()


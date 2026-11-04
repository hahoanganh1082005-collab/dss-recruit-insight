import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { spawnSync } from 'child_process';

const DB_PATH = path.resolve(process.cwd(), 'database', 'dss_recruit_insight.db');
const SCHEMA_PATH = path.resolve(process.cwd(), 'database', 'schema.sql');
const SEED_GZ_PATH = path.resolve(process.cwd(), 'database', 'job_market_seed.json.gz');
const BAK_PATH = path.resolve(process.cwd(), 'job_market.bak');
const IMPORTER_PATH = path.resolve(process.cwd(), 'database', 'import_job_market_bak.py');

let dbInstance: Database.Database | null = null;

export function hydrateFromCompressedSeed(db: Database.Database): number {
  if (!fs.existsSync(SEED_GZ_PATH)) return 0;

  const compressed = fs.readFileSync(SEED_GZ_PATH);
  const rawJson = zlib.gunzipSync(compressed).toString('utf-8');
  const rows = JSON.parse(rawJson) as any[];
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO TinTuyenDungThiTruong (
      id, nguon, url, tinh_thanh, loai_hinh_cong_viec, linh_vuc_nganh_nghe,
      nha_tuyen_dung, ten_dn_chuan_hoa, cong_viec, chuc_vu, so_luong,
      gioi_tinh, do_tuoi, muc_luong, muc_luong_tb_trieu, thoi_gian_lam_viec,
      dia_diem_chi_tiet, mo_ta_cong_viec, quyen_loi, kinh_nghiem, ky_nang,
      bang_cap, han_nop_ho_so, thong_tin_lien_he, scraped_at
    ) VALUES (
      @id, @nguon, @url, @tinh_thanh, @loai_hinh_cong_viec, @linh_vuc_nganh_nghe,
      @nha_tuyen_dung, @ten_dn_chuan_hoa, @cong_viec, @chuc_vu, @so_luong,
      @gioi_tinh, @do_tuoi, @muc_luong, @muc_luong_tb_trieu, @thoi_gian_lam_viec,
      @dia_diem_chi_tiet, @mo_ta_cong_viec, @quyen_loi, @kinh_nghiem, @ky_nang,
      @bang_cap, @han_nop_ho_so, @thong_tin_lien_he, @scraped_at
    )
  `);

  const batchTx = db.transaction((items: any[]) => {
    db.prepare('DELETE FROM TinTuyenDungThiTruong').run();
    for (const item of items) {
      insertStmt.run(item);
    }
  });

  batchTx(rows);
  return rows.length;
}

export function getDatabase(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('journal_mode = WAL');

  // Initialize schema if tables don't exist
  if (fs.existsSync(SCHEMA_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    dbInstance.exec(schemaSql);
  }

  // Auto-hydrate 21,827 job postings on fresh clone or empty table
  try {
    const row = dbInstance
      .prepare('SELECT COUNT(*) as cnt FROM TinTuyenDungThiTruong')
      .get() as { cnt: number };

    if (!row || row.cnt === 0) {
      if (fs.existsSync(SEED_GZ_PATH)) {
        console.log('[DB] Hydrating 21,827 real job postings from database/job_market_seed.json.gz...');
        const count = hydrateFromCompressedSeed(dbInstance);
        console.log(`[DB] Hydrated ${count.toLocaleString('vi-VN')} postings successfully.`);
      } else if (fs.existsSync(BAK_PATH) && fs.existsSync(IMPORTER_PATH)) {
        console.log('[DB] Extracting 21,827 records directly from job_market.bak...');
        dbInstance.close();
        dbInstance = null;
        const py = spawnSync('python', [IMPORTER_PATH], { stdio: 'inherit' });
        if (py.error) {
          spawnSync('py', ['-3', IMPORTER_PATH], { stdio: 'inherit' });
        }
        dbInstance = new Database(DB_PATH);
        dbInstance.pragma('foreign_keys = ON');
        dbInstance.pragma('journal_mode = WAL');
      }
    }
  } catch (e) {
    console.warn('[DB] Auto-check TinTuyenDungThiTruong warning:', e);
  }

  return dbInstance;
}

export function reopenDatabase(): Database.Database {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
  return getDatabase();
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

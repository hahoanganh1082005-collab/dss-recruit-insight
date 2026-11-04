import React, { useState, useEffect } from 'react';
import {
  Database,
  Play,
  Sparkles,
  Download,
  Clock,
  Table as TableIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SQLQueryItem } from '../../types';
import { exportToCsv } from '../../utils/exportCsv';
import { useToast } from '../ui/UIPrimitives';

export const SQLExplorerView: React.FC = () => {
  const { showToast } = useToast();
  const [queries, setQueries] = useState<SQLQueryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedQuery, setSelectedQuery] = useState<SQLQueryItem | null>(null);
  const [sqlText, setSqlText] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  const [result, setResult] = useState<{
    rowCount: number;
    durationMs: number;
    rows: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);

  const executeSql = async (queryId: string, customSql?: string) => {
    setExecuting(true);
    setError(null);
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId, customSql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi cú pháp truy vấn SQL');
      } else {
        setResult(data);
      }
    } catch {
      setError('Không thể kết nối tới SQLite Engine trên máy chủ.');
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    fetch('/api/sql/queries')
      .then((r) => r.json())
      .then((list: SQLQueryItem[]) => {
        setQueries(list);
        if (list.length > 0) {
          setSelectedQuery(list[0]);
          setSqlText(list[0].sql);
          executeSql(list[0].id, list[0].sql);
        }
      })
      .catch(() => setError('Không tải được danh mục 18 truy vấn SQL'));
  }, []);

  const handleSelectSample = (q: SQLQueryItem) => {
    setSelectedQuery(q);
    setSqlText(q.sql);
    executeSql(q.id, q.sql);
  };

  const handleGenerateAiSql = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/text-to-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể sinh câu lệnh SQL');
      setSelectedQuery(null);
      setSqlText(data.sql);
      showToast('success', 'Gemini AI đã chuyển câu hỏi thành SQL!', `Model: ${data.model}`);
      executeSql('AI_GENERATED', data.sql);
    } catch (err: any) {
      showToast('error', 'Lỗi AI Text-to-SQL', err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const categories = ['ALL', 'JobMarket', 'Pipeline', 'Sales', 'Customer', 'Product', 'Executive'];

  const filteredQueries =
    selectedCategory === 'ALL'
      ? queries
      : queries.filter((q) => q.category === selectedCategory);

  const columns = result && result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

  return (
    <div className="space-y-5">
      {/* Gemini AI Natural Language to SQL Bar */}
      <form
        onSubmit={handleGenerateAiSql}
        className="ds-card p-4 bg-amber-50/50 dark:bg-amber-500/5 border-amber-300/80 dark:border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Gemini AI Text-to-SQL
            </div>
            <div className="text-[11px] text-slate-500">Hỏi bằng tiếng Việt trên 10 bảng CSDL</div>
          </div>
        </div>
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="VD: Liệt kê 10 công ty ở Hà Nội có mức lương trung bình cao nhất trong bảng TinTuyenDungThiTruong..."
          className="ds-input flex-1"
        />
        <button
          type="submit"
          disabled={aiGenerating || !aiPrompt.trim()}
          className="ds-btn-accent shrink-0 text-xs!"
        >
          {aiGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Đang sinh SQL...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Tạo & Chạy SQL</span>
            </>
          )}
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: 18 Queries Catalog */}
        <div className="lg:col-span-4 ds-card flex flex-col max-h-[740px] overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <span>Thư viện {queries.length} Truy vấn OLAP</span>
              </h3>
            </div>

            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-800 text-white dark:bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả' : cat === 'JobMarket' ? 'job_market.bak' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1">
            {filteredQueries.map((q) => {
              const active = selectedQuery?.id === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleSelectSample(q)}
                  className={`w-full text-left p-3.5 transition-colors ${
                    active
                      ? 'bg-blue-50/90 dark:bg-blue-500/15 border-l-4 border-blue-700 dark:border-blue-400'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-800 dark:text-blue-400">
                      {q.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {q.category}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {q.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: SQL Code Editor & Live Data Grid */}
        <div className="lg:col-span-8 space-y-5">
          {/* SQL Editor */}
          <div className="ds-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {selectedQuery ? `${selectedQuery.id}: ${selectedQuery.name}` : 'Truy vấn SQL Tùy chỉnh / AI'}
                </div>
                {selectedQuery && (
                  <p className="text-[11px] text-slate-500 truncate">{selectedQuery.description}</p>
                )}
              </div>

              <button
                type="button"
                disabled={executing}
                onClick={() => executeSql(selectedQuery?.id || 'CUSTOM', sqlText)}
                className="ds-btn-primary py-1.5! px-3.5! text-xs! shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>{executing ? 'Đang chạy...' : 'Thực thi SQL'}</span>
              </button>
            </div>

            <textarea
              value={sqlText}
              onChange={(e) => setSqlText(e.target.value)}
              spellCheck={false}
              rows={8}
              aria-label="Trình soạn thảo câu lệnh SQL"
              className="w-full p-4 bg-slate-950 text-emerald-300 font-mono text-xs leading-relaxed focus:outline-none resize-y"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 flex items-center gap-2.5 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Result Data Grid */}
          {result && (
            <div className="ds-card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                    <TableIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                    Kết quả: <strong className="font-mono">{result.rowCount}</strong> dòng
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-500">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {result.durationMs} ms
                  </span>
                </div>

                {result.rows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportToCsv(`SQL_${selectedQuery?.id || 'Custom'}.csv`, result.rows)}
                    className="ds-btn-secondary py-1! px-2.5! text-xs!"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Xuất CSV kết quả
                  </button>
                )}
              </div>

              <div className="overflow-x-auto max-h-96">
                {result.rows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Truy vấn hoàn tất nhưng không có bản ghi nào trả về.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                      <tr>
                        {columns.map((col) => (
                          <th key={col} className="py-2.5 px-3.5 font-mono font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {result.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50">
                          {columns.map((col) => (
                            <td key={col} className="py-2.5 px-3.5 whitespace-nowrap text-slate-800 dark:text-slate-200">
                              {typeof row[col] === 'number' ? (
                                <span className="font-mono font-semibold text-blue-800 dark:text-blue-300">
                                  {row[col]}
                                </span>
                              ) : (
                                String(row[col] ?? '-')
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

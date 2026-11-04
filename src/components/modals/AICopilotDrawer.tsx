import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Settings2,
  MessageSquareText,
  KeyRound,
  CheckCircle2,
  Loader2,
  Bot,
  User,
  RotateCcw,
} from 'lucide-react';
import { AIStatusInfo } from '../../types';
import { useToast } from '../ui/UIPrimitives';

interface AICopilotDrawerProps {
  open: boolean;
  initialTab?: 'chat' | 'settings';
  onClose: () => void;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

const SUGGESTED_PROMPTS = [
  'Phân tích Top 5 Hot Leads có ngân sách cao nhất và đề xuất chiến lược tiếp cận tuần này.',
  'Đề xuất kịch bản cứu vãn các doanh nghiệp đang có nguy cơ rời bỏ (Churn Risk) cao.',
  'Từ 21.827 tin job_market.bak, làm sao để khai thác nhóm 694 doanh nghiệp đăng tuyển đa sàn hiệu quả?',
  'Tư vấn chính sách chiết khấu B2B để vừa tăng số hợp đồng chốt vừa bảo vệ biên lợi nhuận trên 25%.',
];

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  open,
  initialTab = 'chat',
  onClose,
}) => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'chat' | 'settings'>(initialTab);
  const [status, setStatus] = useState<AIStatusInfo | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('gemini-flash-lite-latest');
  const [savingConfig, setSavingConfig] = useState(false);

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là **Gemini AI Decision Copilot** của hệ thống DSS Recruit-Insight. Tôi đã được kết nối trực tiếp với số liệu CRM (Doanh nghiệp, Hợp đồng, CSKH) và kho **21.827 tin tuyển dụng thực tế từ `job_market.bak`**.\n\nBạn muốn tôi phân tích khách hàng tiềm năng, đánh giá rủi ro rời bỏ hay xây dựng kịch bản tư vấn gói dịch vụ nào?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    if (open) {
      fetch('/api/ai/status')
        .then((r) => r.json())
        .then((d: AIStatusInfo) => {
          setStatus(d);
          setModelInput(d.preferredModel || 'gemini-flash-lite-latest');
        })
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendQuestion = async (qText?: string) => {
    const question = (qText ?? input).trim();
    if (!question || loading) return;

    const nextMessages: ChatMsg[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    if (!qText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: nextMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể kết nối Gemini AI');
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, model: data.model },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Không thể xử lý yêu cầu lúc này: ${err.message}. Vui lòng kiểm tra cấu hình Gemini API Key ở tab Cài đặt.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim() || undefined,
          preferredModel: modelInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.status);
        setApiKeyInput('');
        showToast('success', 'Đã lưu cấu hình Gemini AI', `Model ưu tiên: ${data.status.preferredModel}`);
        setTab('chat');
      } else {
        showToast('error', 'Lỗi cấu hình AI', data.error);
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    } finally {
      setSavingConfig(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Gemini AI Decision Copilot
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status?.configured ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <span>
                  {status?.configured
                    ? `Sẵn sàng (${status.lastWorkingModel || status.preferredModel})`
                    : 'Chưa cấu hình API Key'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab(tab === 'chat' ? 'settings' : 'chat')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              {tab === 'chat' ? (
                <>
                  <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>API Key</span>
                </>
              ) : (
                <>
                  <MessageSquareText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Trò chuyện</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng AI Copilot"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {tab === 'settings' ? (
          <form onSubmit={handleSaveConfig} className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <span>Trạng thái Kết nối Google Gemini API</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Khóa hiện tại:{' '}
                <code className="font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {status?.maskedKey || 'Chưa thiết lập'}
                </code>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hệ thống tự động kích hoạt cơ chế Fallback đa mô hình để đảm bảo phản hồi liên tục cho Cố vấn Chiến lược, Phân tích Doanh nghiệp 360° và Sinh câu lệnh SQL.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Cập nhật Gemini API Key mới (Để trống nếu giữ nguyên khóa hiện tại)
              </label>
              <div className="relative">
                <KeyRound
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Nhập khóa Gemini API mới..."
                  className="ds-input pl-9! font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mô hình Gemini ưu tiên
              </label>
              <select
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                className="ds-input"
              >
                {(
                  status?.availableModels || [
                    'gemini-flash-lite-latest',
                    'gemini-3.8-flash',
                    'gemini-3.7-flash',
                    'gemini-3.6-flash',
                    'gemini-3.5-flash-lite',
                  ]
                ).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setTab('chat')} className="ds-btn-secondary">
                Quay lại
              </button>
              <button type="submit" disabled={savingConfig} className="ds-btn-primary">
                {savingConfig ? 'Đang lưu...' : 'Lưu cấu hình AI'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${
                    m.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      m.role === 'user'
                        ? 'bg-blue-800 text-white'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <User className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Bot className="w-4 h-4" aria-hidden="true" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-blue-800 text-white rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-xs'
                    }`}
                  >
                    {m.content}
                    {m.model && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Model: {m.model}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pl-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
                  <span>Gemini AI đang phân tích dữ liệu CRM & job_market.bak...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            {messages.length <= 2 && !loading && (
              <div className="px-4 pb-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Câu hỏi gợi ý cho Cố vấn Chiến lược:
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendQuestion(p)}
                      className="text-left text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors line-clamp-2"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion();
              }}
              className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setMessages(messages.slice(0, 1))}
                title="Làm mới cuộc hội thoại"
                aria-label="Làm mới cuộc hội thoại"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Đặt câu hỏi phân tích kinh doanh hoặc tuyển dụng..."
                className="ds-input flex-1"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Gửi câu hỏi"
                className="ds-btn-primary px-3.5! py-2.5! disabled:opacity-50"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};


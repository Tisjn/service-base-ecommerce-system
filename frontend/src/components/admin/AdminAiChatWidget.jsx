import { useEffect, useRef, useState } from "react";
import {
  askAiAssistant,
  getAiErrorMessage,
  getAiRetryAfterSeconds,
} from "../../api/aiApi";

const initialMessages = [
  {
    id: "admin-ai-welcome",
    role: "assistant",
    message:
      "Xin chào, mình là trợ lý AI cho trang quản trị DTPShop. Bạn có thể hỏi về sản phẩm, đơn hàng, khách hàng hoặc thao tác vận hành.",
    timestamp: Date.now(),
  },
];

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.username || "Admin";
}

export default function AdminAiChatWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const bottomRef = useRef(null);
  const adminName = getDisplayName(user);
  const rateLimited = retrySeconds > 0;

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, open, status]);

  useEffect(() => {
    if (!retryUntil) {
      setRetrySeconds(0);
      return undefined;
    }

    const updateRetrySeconds = () => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((retryUntil - Date.now()) / 1000),
      );
      setRetrySeconds(secondsLeft);
      if (secondsLeft === 0) {
        setRetryUntil(0);
      }
    };

    updateRetrySeconds();
    const timer = window.setInterval(updateRetrySeconds, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  async function sendQuestion(event) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || status === "thinking" || rateLimited) return;

    const userMessage = {
      id: `admin-user-${Date.now()}`,
      role: "user",
      message: question,
      timestamp: Date.now(),
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError("");
    setStatus("thinking");

    try {
      const data = await askAiAssistant(question);
      setMessages((current) => [
        ...current,
        {
          id: `admin-ai-${Date.now()}`,
          role: "assistant",
          message:
            data?.answer ||
            "AI chưa có câu trả lời phù hợp. Vui lòng thử câu hỏi khác.",
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      const retryAfterSeconds = getAiRetryAfterSeconds(err);
      if (retryAfterSeconds > 0) {
        setRetryUntil(Date.now() + retryAfterSeconds * 1000);
      }
      setError(getAiErrorMessage(err));
      setDraft(question);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[6.5rem] right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[#ffd6c4] bg-[#ff4500] text-white shadow-[0_18px_48px_-18px_rgba(255,69,0,0.85)] transition hover:scale-110 hover:bg-[#e63e00] active:scale-95"
          aria-label="Mở trợ lý AI admin"
          title="Trợ lý AI admin"
        >
          <span className="material-symbols-outlined text-2xl">smart_toy</span>
        </button>
      )}

      {open && (
        <section className="fixed bottom-24 right-8 z-50 flex h-[min(640px,calc(100svh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#ffd6c4] bg-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-[#e63e00] bg-[#ff4500] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <span className="material-symbols-outlined text-3xl">
                  smart_toy
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">
                  Trợ lý AI quản trị
                </p>
                <p className="truncate text-xs text-[#ffe5d8]">
                  Đang hỗ trợ {adminName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-white transition hover:bg-white/10"
              aria-label="Đóng trợ lý AI"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          {error ? (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#fff8f4] px-4 py-4">
            {messages.map((message) => {
              const mine = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      mine
                        ? "bg-[#ff4500] text-white"
                        : "border border-[#ffd6c4] bg-white text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.message}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-[#ffe5d8]" : "text-slate-400"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString(
                        "vi-VN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                </div>
              );
            })}

            {status === "thinking" ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[#ffd6c4] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500] [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500] [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500]" />
                  </span>
                  <span>AI đang trả lời...</span>
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendQuestion}
            className="border-t border-[#ffd6c4] bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendQuestion(event);
                  }
                }}
                disabled={status === "thinking" || rateLimited}
                rows="1"
                className="min-h-11 flex-1 resize-none rounded-xl border border-[#ffd6c4] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
                placeholder={
                  rateLimited
                    ? `Chờ ${retrySeconds}s rồi hỏi tiếp...`
                    : "Hỏi AI về quản trị cửa hàng..."
                }
              />
              <button
                type="submit"
                disabled={!draft.trim() || status === "thinking" || rateLimited}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff4500] text-white transition hover:bg-[#e63e00] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gửi câu hỏi cho AI"
              >
                <span className="material-symbols-outlined">
                  {status === "thinking" || rateLimited
                    ? "hourglass_top"
                    : "send"}
                </span>
              </button>
            </div>
            {rateLimited ? (
              <p className="mt-2 text-xs font-semibold text-orange-700">
                Gemini đang giới hạn lượt gọi miễn phí. Có thể gửi lại sau{" "}
                {retrySeconds}s.
              </p>
            ) : null}
          </form>
        </section>
      )}
    </>
  );
}

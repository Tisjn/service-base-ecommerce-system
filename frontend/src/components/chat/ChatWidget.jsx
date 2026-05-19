import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { askAiAssistant } from "../../api/aiApi";
import {
  createChatRoom,
  createChatSocket,
  getRoomMessages,
  resolveAbsoluteChatUrl,
  uploadChatFile,
} from "../../api/chatApi";

function messageKey(message) {
  return message?.id || `${message?.senderId}-${message?.timestamp}`;
}

function normalizeUserId(user) {
  return String(user?.id || user?.userId || user?.accountId || "");
}

export default function ChatWidget({ user, onRequestLogin }) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      id: "ai-welcome",
      role: "assistant",
      message: "Xin chao, minh la tro ly AI cua DTPShop. Ban can tim san pham, chinh sach hay kiem tra don hang nao?",
      timestamp: Date.now(),
    },
  ]);
  const [aiDraft, setAiDraft] = useState("");
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiError, setAiError] = useState("");
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const userId = normalizeUserId(user);

  const canChat = Boolean(userId);

  const appendMessage = useCallback((message) => {
    setMessages((prev) => {
      if (prev.some((item) => messageKey(item) === messageKey(message))) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, aiMessages.length, open, aiOpen]);

  useEffect(() => {
    if (!open || !canChat) {
      return undefined;
    }

    let cancelled = false;

    async function startChat() {
      setStatus("loading");
      setError("");
      try {
        const activeRoom = await createChatRoom();
        if (cancelled) return;
        setRoom(activeRoom);
        const history = await getRoomMessages(activeRoom.roomId);
        if (cancelled) return;
        setMessages(history.messages || []);

        const socket = createChatSocket();
        socketRef.current = socket;
        socket.on("connect", () => {
          socket.emit("join_room", { roomId: activeRoom.roomId });
          setStatus("ready");
        });
        socket.on("message", appendMessage);
        socket.on("typing", (event) => {
          if (event.userType === "admin" && event.isTyping) {
            setTypingUser("Admin dang nhap...");
            window.clearTimeout(typingTimerRef.current);
            typingTimerRef.current = window.setTimeout(() => setTypingUser(""), 1500);
          }
        });
        socket.on("room_closed", () => {
          setRoom((prev) => (prev ? { ...prev, status: "closed" } : prev));
          setStatus("closed");
        });
        socket.on("chat_error", (event) => setError(event.message || "Chat bi loi"));
        socket.connect();
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err.message || "Khong mo duoc chat");
          setStatus("error");
        }
      }
    }

    startChat();

    return () => {
      cancelled = true;
      window.clearTimeout(typingTimerRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [appendMessage, canChat, open]);

  const isClosed = room?.status === "closed" || status === "closed";

  function handleOpen() {
    if (!canChat) {
      onRequestLogin?.();
      return;
    }
    setAiOpen(false);
    setOpen(true);
  }

  function handleAiOpen() {
    if (!canChat) {
      onRequestLogin?.();
      return;
    }
    setOpen(false);
    setAiOpen(true);
  }

  function sendText(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !room || isClosed) return;
    socketRef.current?.emit("message", {
      roomId: room.roomId,
      message: text,
      type: "text",
    });
    setDraft("");
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !room || isClosed) return;

    try {
      setStatus("uploading");
      const uploaded = await uploadChatFile(file);
      socketRef.current?.emit("message", {
        roomId: room.roomId,
        message: file.name,
        type: uploaded.type,
        fileUrl: uploaded.fileUrl,
      });
      setStatus("ready");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Upload that bai");
      setStatus("ready");
    }
  }

  async function sendAiText(event) {
    event.preventDefault();
    const text = aiDraft.trim();
    if (!text || aiStatus === "thinking") return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      message: text,
      timestamp: Date.now(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setAiDraft("");
    setAiError("");
    setAiStatus("thinking");

    try {
      const data = await askAiAssistant(text);
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          message: data.answer || "Minh chua co cau tra loi phu hop luc nay.",
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setAiError(err?.response?.data?.message || err.message || "Khong goi duoc tro ly AI");
    } finally {
      setAiStatus("idle");
    }
  }

  const title = useMemo(() => {
    if (!canChat) return "Can dang nhap de chat";
    if (isClosed) return "Cuoc chat da dong";
    if (status === "loading") return "Dang ket noi admin...";
    return "Ho tro truc tuyen";
  }, [canChat, isClosed, status]);

  return (
    <>
      {!open && !aiOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          <button
            type="button"
            onClick={handleAiOpen}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-2xl shadow-violet-700/20 transition hover:-translate-y-0.5 hover:bg-violet-700"
            aria-label="Chat voi AI"
            title="Chat voi AI"
          >
            <span className="material-symbols-outlined">smart_toy</span>
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-2xl shadow-sky-700/20 transition hover:-translate-y-0.5 hover:bg-sky-700"
            aria-label="Mo chat ho tro"
            title="Mo chat ho tro"
          >
            <span className="material-symbols-outlined">support_agent</span>
          </button>
        </div>
      )}

      {aiOpen && (
        <section className="fixed bottom-5 right-5 z-50 flex h-[min(620px,calc(100svh-2.5rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-violet-700 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">Tro ly AI DTPShop</p>
              <p className="truncate text-xs text-violet-100">
                Doc san pham, chinh sach va don hang cua ban
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              className="rounded-full p-2 text-violet-50 hover:bg-white/10"
              aria-label="Dong chat AI"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          {aiError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {aiError}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {aiMessages.map((message) => {
              const mine = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      mine
                        ? "bg-violet-600 text-white"
                        : "border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.message}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "text-violet-100" : "text-slate-400"}`}>
                      {new Date(message.timestamp).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            {aiStatus === "thinking" ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  AI dang tra loi...
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendAiText} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={aiDraft}
                onChange={(event) => setAiDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendAiText(event);
                  }
                }}
                disabled={aiStatus === "thinking"}
                rows="1"
                className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                placeholder="Hoi ve san pham, don hang, chinh sach..."
              />
              <button
                type="submit"
                disabled={!aiDraft.trim() || aiStatus === "thinking"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gui cau hoi AI"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {open && (
        <section className="fixed bottom-5 right-5 z-50 flex h-[min(680px,calc(100svh-2.5rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{title}</p>
              <p className="truncate text-xs text-slate-300">
                {typingUser || room?.roomId || "DTPShop"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-slate-200 hover:bg-white/10"
              aria-label="Dong chat"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          {error && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                Hay gui loi nhan, admin se ho tro ban ngay khi online.
              </div>
            ) : (
              messages.map((message) => {
                const mine = String(message.senderId) === userId;
                const fileUrl = resolveAbsoluteChatUrl(message.fileUrl);
                return (
                  <div
                    key={messageKey(message)}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        mine
                          ? "bg-sky-600 text-white"
                          : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {message.type === "image" && fileUrl ? (
                        <img
                          src={fileUrl}
                          alt={message.message || "Chat image"}
                          className="mb-2 max-h-48 rounded-lg object-cover"
                        />
                      ) : null}
                      {message.type === "file" && fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-2 flex items-center gap-2 underline"
                        >
                          <span className="material-symbols-outlined text-lg">
                            attach_file
                          </span>
                          Tep dinh kem
                        </a>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{message.message}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-sky-100" : "text-slate-400"}`}>
                        {new Date(message.timestamp).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendText} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
                <span className="material-symbols-outlined">attach_file</span>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
              <textarea
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  socketRef.current?.emit("typing", {
                    roomId: room?.roomId,
                    isTyping: true,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendText(event);
                  }
                }}
                disabled={!room || isClosed}
                rows="1"
                className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                placeholder={isClosed ? "Cuoc chat da dong" : "Nhap tin nhan..."}
              />
              <button
                type="submit"
                disabled={!draft.trim() || !room || isClosed}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gui tin nhan"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            {status === "uploading" ? (
              <p className="mt-2 text-xs text-slate-500">Dang tai tep len...</p>
            ) : null}
          </form>
        </section>
      )}
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { askAiAssistant } from "../../api/aiApi";
import {
  createChatRoom,
  createChatSocket,
  emitChatEvent,
  emitChatEventNoAck,
  getRoomMessages,
  resolveAbsoluteChatUrl,
  uploadChatFile,
} from "../../api/chatApi";
import BrandLogo from "../BrandLogo.jsx";

function messageKey(message) {
  return message?.id || `${message?.senderId}-${message?.timestamp}`;
}

function normalizeUserId(user) {
  return String(user?.id || user?.userId || user?.accountId || "");
}

function isImageMessage(message) {
  const fileUrl = String(message?.fileUrl || "");
  const mimeType = String(message?.mimeType || "");
  return (
    message?.type === "image" ||
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileUrl)
  );
}

export default function ChatWidget({ user, onRequestLogin }) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      id: "ai-welcome",
      role: "assistant",
      message:
        "Xin chao, minh la tro ly AI cua DTPShop. Ban can tim san pham, don hang hay chinh sach nao?",
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
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const aiBottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const localTypingTimerRef = useRef(null);
  const roomIdRef = useRef("");
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

  const isClosed = room?.status === "closed" || status === "closed";

  const sendTypingState = useCallback((isTyping) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit("typing", {
      roomId: roomIdRef.current,
      isTyping,
    });
  }, []);

  const handleDraftChange = useCallback(
    (value) => {
      setDraft(value);
      if (!roomIdRef.current || isClosed) return;

      sendTypingState(true);
      window.clearTimeout(localTypingTimerRef.current);
      localTypingTimerRef.current = window.setTimeout(() => {
        sendTypingState(false);
      }, 1200);
    },
    [isClosed, sendTypingState],
  );

  useEffect(() => {
    roomIdRef.current = room?.roomId || "";
  }, [room?.roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, open]);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [aiMessages.length, aiOpen]);

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
        socket.on("connect", async () => {
          try {
            await emitChatEventNoAck(socket, "join_room", {
              roomId: activeRoom.roomId,
            });
            setStatus(activeRoom.status === "closed" ? "closed" : "ready");
            setError("");
          } catch (err) {
            setError(err.message || "Khong tham gia duoc phong chat");
            setStatus("error");
          }
        });
        socket.on("message", (message) => {
          if (message.roomId === roomIdRef.current) {
            appendMessage(message);
          }
        });
        socket.on("typing", (event) => {
          if (event.userType !== "admin") return;
          window.clearTimeout(typingTimerRef.current);
          if (event.isTyping) {
            setTypingUser("Admin dang soan tin...");
            typingTimerRef.current = window.setTimeout(
              () => setTypingUser(""),
              1800,
            );
          } else {
            setTypingUser("");
          }
        });
        socket.on("room_closed", () => {
          setRoom((prev) => (prev ? { ...prev, status: "closed" } : prev));
          setStatus("closed");
        });
        socket.on("room_reopened", async (roomData) => {
          try {
            if (roomData?.roomId && roomIdRef.current === roomData.roomId) {
              // Re-join the reopened room and reload messages so the widget becomes usable again
              await emitChatEventNoAck(socket, "join_room", {
                roomId: roomData.roomId,
              });
              const history = await getRoomMessages(roomData.roomId);
              setMessages(history.messages || []);
              setRoom((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "active",
                      closedAt: null,
                      updatedAt: roomData.updatedAt || prev.updatedAt,
                    }
                  : prev,
              );
              setStatus("ready");
              setError("");
            } else {
              setRoom((prev) => (prev ? { ...prev, status: "active" } : prev));
              setStatus("ready");
              setError("");
            }
          } catch (err) {
            setError(
              err?.response?.data?.message ||
                err.message ||
                "Khong mo duoc chat",
            );
            setStatus("error");
          }
        });
        socket.on("chat_error", (event) =>
          setError(event.message || "Chat bi loi"),
        );
        socket.connect();
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || err.message || "Khong mo duoc chat",
          );
          setStatus("error");
        }
      }
    }

    startChat();

    return () => {
      cancelled = true;
      window.clearTimeout(typingTimerRef.current);
      window.clearTimeout(localTypingTimerRef.current);
      sendTypingState(false);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [appendMessage, canChat, open, sendTypingState]);

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

  async function sendText(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !room || isClosed || sending) return;
    window.clearTimeout(localTypingTimerRef.current);
    sendTypingState(false);
    setDraft("");
    setSending(true);
    try {
      await emitChatEvent(socketRef.current, "message", {
        roomId: room.roomId,
        message: text,
        type: "text",
      });
      setError("");
    } catch (err) {
      setDraft(text);
      setError(err.message || "Khong gui duoc tin nhan");
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !room || isClosed) return;

    try {
      setStatus("uploading");
      const uploaded = await uploadChatFile(file);
      await emitChatEvent(socketRef.current, "message", {
        roomId: room.roomId,
        message: file.name,
        type: uploaded.type,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
      });
      setStatus("ready");
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Upload that bai",
      );
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
      setAiError(
        err?.response?.data?.message ||
          err.message ||
          "Khong goi duoc tro ly AI",
      );
      setAiDraft(text);
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

  const closedMessage = useMemo(() => {
    if (status === "closed") {
      return "Cuoc tro chuyen nay da duoc dong. Khi admin mo lai, ban se dung lai duoc o day.";
    }
    return "Chat dang tam dong. Khi admin mo lai cuoc chat, giao dien se tu chuyen ve che do nhan tin.";
  }, [status]);

  return (
    <>
      {!open && !aiOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          <button
            type="button"
            onClick={handleAiOpen}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-[#ffd6c4] bg-white text-[#ff4500] shadow-[0_16px_44px_-18px_rgba(255,69,0,0.7)] transition hover:-translate-y-0.5 hover:bg-[#fff1e8]"
            aria-label="Chat voi AI"
            title="Chat voi AI"
          >
            <span className="material-symbols-outlined text-3xl">
              smart_toy
            </span>
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff4500] text-white shadow-[0_18px_50px_-18px_rgba(255,69,0,0.75)] transition hover:-translate-y-0.5 hover:bg-[#e63e00] hover:shadow-[0_22px_60px_-18px_rgba(255,69,0,0.9)]"
            aria-label="Mo chat ho tro"
            title="Chat voi admin"
          >
            <span className="material-symbols-outlined text-3xl">
              support_agent
            </span>
          </button>
        </div>
      )}

      {aiOpen && (
        <section className="fixed bottom-5 right-5 z-50 flex h-[min(620px,calc(100svh-2.5rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-[#ffd6c4] bg-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-[#e63e00] bg-[#ff4500] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="material-symbols-outlined text-3xl">
                smart_toy
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">
                  Tro ly AI DTPShop
                </p>
                <p className="truncate text-xs text-[#ffe5d8]">
                  Goi ai-service qua API gateway
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              className="rounded-full p-2 text-white hover:bg-white/10"
              aria-label="Dong chat AI"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          {aiError ? (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {aiError}
            </div>
          ) : null}

          <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,#fff1e8,#ffffff_55%,#fff8f4_100%)] px-4 py-4">
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
                        ? "bg-[#ff4500] text-white"
                        : "border border-[#ffd6c4] bg-white text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap wrap-break-word">
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
            {aiStatus === "thinking" ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[#ffd6c4] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500] [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500] [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500]" />
                  </span>
                  <span>AI dang tra loi...</span>
                </div>
              </div>
            ) : null}
            <div ref={aiBottomRef} />
          </div>

          <form
            onSubmit={sendAiText}
            className="border-t border-[#ffd6c4] bg-white p-3"
          >
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
                className="min-h-11 flex-1 resize-none rounded-xl border border-[#ffd6c4] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
                placeholder="Hoi AI ve san pham, don hang..."
              />
              <button
                type="submit"
                disabled={!aiDraft.trim() || aiStatus === "thinking"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff4500] text-white transition hover:bg-[#e63e00] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gui cau hoi cho AI"
              >
                <span className="material-symbols-outlined">
                  {aiStatus === "thinking" ? "hourglass_top" : "send"}
                </span>
              </button>
            </div>
          </form>
        </section>
      )}

      {open && (
        <section className="fixed bottom-5 right-5 z-50 flex h-[min(680px,calc(100svh-2.5rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-[#e63e00] bg-[#ff4500] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo className="h-12 w-44 shrink-0 object-contain object-left" />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{title}</p>
                <p className="truncate text-xs text-slate-300">
                  {typingUser || room?.roomId || "Hỗ trợ"}
                </p>
              </div>
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

          {isClosed ? (
            <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,247,237,1),rgba(255,237,213,1)_42%,rgba(255,247,237,1)_100%)] px-5 py-8">
              <div className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-[#ffd6c4]/70 blur-2xl" />
              <div className="pointer-events-none absolute bottom-6 right-3 h-28 w-28 rounded-full bg-[#ffb38f]/50 blur-2xl" />

              <div className="relative w-full max-w-sm overflow-hidden rounded-4xl border border-[#ffd6c4] bg-white/95 p-6 text-center shadow-[0_20px_60px_-20px_rgba(255,69,0,0.28)] backdrop-blur">
                <BrandLogo className="mx-auto mb-4 h-20 w-full max-w-72 object-contain" />

                <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-[#fff1e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff4500]">
                  <span className="h-2 w-2 rounded-full bg-[#ff4500]" />
                  Da dong
                </div>

                <p className="text-lg font-extrabold tracking-tight text-[#111111]">
                  Cuoc chat da dong
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {closedMessage}
                </p>

                <div className="mt-5 rounded-2xl border border-[#ffd6c4] bg-[#fff1e8] px-4 py-3 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff4500]">
                    Trang thai hien tai
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#111111]">
                    {room?.roomId || "Khong xac dinh room"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Chi can admin mo lai, khung chat se tu chuyen ve che do nhan
                    tin.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-[#ffd6c4] bg-white px-4 py-3 text-sm font-semibold text-[#ff4500] transition hover:bg-[#fff1e8]"
                  >
                    Dong khung chat
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                              ? "bg-[#ff4500] text-white"
                              : "border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          {isImageMessage(message) && fileUrl ? (
                            <img
                              src={fileUrl}
                              alt={message.message || "Chat image"}
                              className="mb-2 max-h-48 rounded-lg object-cover"
                            />
                          ) : null}
                          {!isImageMessage(message) && fileUrl ? (
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
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {message.message}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${mine ? "text-[#ffe5d8]" : "text-slate-400"}`}
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
                  })
                )}
                {typingUser ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500] [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500] [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff4500]" />
                      </span>
                      <span>{typingUser}</span>
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={sendText}
                className="border-t border-slate-200 bg-white p-3"
              >
                <div className="flex items-end gap-2">
                  <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#fff1e8] text-[#ff4500] hover:bg-[#ffe5d8]">
                    <span className="material-symbols-outlined">
                      attach_file
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  <textarea
                    value={draft}
                    onChange={(event) => handleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (!sending) {
                          sendText(event);
                        }
                      }
                    }}
                    onBlur={() => {
                      window.clearTimeout(localTypingTimerRef.current);
                      sendTypingState(false);
                    }}
                    disabled={!room || isClosed}
                    rows="1"
                    className="min-h-11 flex-1 resize-none rounded-xl border border-[#ffd6c4] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
                    placeholder="Nhap tin nhan..."
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || !room || isClosed || sending}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff4500] text-white transition hover:bg-[#e63e00] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={sending ? "Dang gui tin nhan" : "Gui tin nhan"}
                  >
                    <span className="material-symbols-outlined">
                      {sending ? "hourglass_top" : "send"}
                    </span>
                  </button>
                </div>
                {status === "uploading" ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Dang tai tep len...
                  </p>
                ) : null}
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}

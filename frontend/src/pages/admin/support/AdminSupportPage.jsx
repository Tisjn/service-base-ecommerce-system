import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closeChatRoom,
  createChatSocket,
  emitChatEvent,
  emitChatEventNoAck,
  getChatRooms,
  getRoomMessages,
  reopenChatRoom,
  resolveAbsoluteChatUrl,
  uploadChatFile,
} from "../../../api/chatApi";
import BrandLogo from "../../../components/BrandLogo.jsx";

function messageKey(message) {
  return message?.id || `${message?.senderId}-${message?.timestamp}`;
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
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

export default function AdminSupportPage({ user }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [notice, setNotice] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const localTypingTimerRef = useRef(null);
  const selectedRoomIdRef = useRef(selectedRoomId);
  const statusFilterRef = useRef(statusFilter);

  const userId = String(user?.id || user?.userId || user?.accountId || "");
  const selectedRoom =
    rooms.find((room) => room.roomId === selectedRoomId) || null;
  const displayedRooms = useMemo(
    () =>
      statusFilter
        ? rooms.filter((room) => room.status === statusFilter)
        : rooms,
    [rooms, statusFilter],
  );

  const roomStats = useMemo(
    () => ({
      total: rooms.length,
      active: rooms.filter((room) => room.status === "active").length,
      closed: rooms.filter((room) => room.status === "closed").length,
    }),
    [rooms],
  );

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await getChatRooms(statusFilter || undefined);
      const nextRooms = Array.isArray(data) ? data : [];
      // keep only one room per customer (most recently updated)
      const sorted = nextRooms
        .slice()
        .sort((a, b) =>
          String(b.updatedAt || b.createdAt).localeCompare(
            String(a.updatedAt || a.createdAt),
          ),
        );
      const byCustomer = new Map();
      for (const r of sorted) {
        if (!byCustomer.has(String(r.customerId))) {
          byCustomer.set(String(r.customerId), r);
        }
      }
      const uniqueRooms = Array.from(byCustomer.values());
      setRooms(uniqueRooms);
      if (!selectedRoomId && nextRooms[0]?.roomId) {
        setSelectedRoomId(nextRooms[0].roomId);
      }
    } catch (error) {
      setNotice(
        error?.response?.data?.message ||
          error.message ||
          "Không tải được phòng chat",
      );
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedRoomId, statusFilter]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Create a single socket connection and use a ref to know which room is
  // currently selected. This avoids handler closures reading stale
  // `selectedRoomId` and prevents messages leaking between rooms when
  // switching.
  useEffect(() => {
    const socket = createChatSocket();
    socketRef.current = socket;

    socket.on("connect", () => setNotice(""));

    socket.on("new_room", (room) => {
      setRooms((prev) =>
        prev.some((item) => item.roomId === room.roomId)
          ? prev
          : [room, ...prev],
      );
    });

    socket.on("new_message", (message) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.roomId === message.roomId
            ? {
                ...room,
                lastMessage: message.message,
                lastMessageAt: message.timestamp,
                updatedAt: message.timestamp,
              }
            : room,
        ),
      );
      // Append only if admin currently viewing this room
      if (message.roomId === selectedRoomIdRef.current) {
        appendMessage(message);
      }
    });

    socket.on("message", (message) => {
      if (message.roomId === selectedRoomIdRef.current) {
        appendMessage(message);
      }
    });

    socket.on("typing", (event) => {
      if (event.userType !== "customer") return;
      window.clearTimeout(typingTimerRef.current);
      if (event.isTyping) {
        setTypingUser("Khách hàng đang soạn tin...");
        typingTimerRef.current = window.setTimeout(
          () => setTypingUser(""),
          1800,
        );
      } else {
        setTypingUser("");
      }
    });

    socket.on("room_closed", (room) => {
      setRooms((prev) =>
        prev.map((item) =>
          item.roomId === room.roomId ? { ...item, status: "closed" } : item,
        ),
      );
      if (
        statusFilterRef.current !== "closed" &&
        selectedRoomIdRef.current === room.roomId
      ) {
        setStatusFilter("closed");
      }
    });

    socket.on("room_reopened", (room) => {
      setRooms((prev) =>
        prev.map((item) =>
          item.roomId === room.roomId
            ? {
                ...item,
                status: "active",
                closedAt: null,
                updatedAt: room.updatedAt,
              }
            : item,
        ),
      );
      if (
        statusFilterRef.current === "closed" &&
        selectedRoomIdRef.current === room.roomId
      ) {
        setStatusFilter("");
      }
    });

    socket.on("chat_error", (event) =>
      setNotice(event.message || "Socket bị lỗi"),
    );

    socket.connect();

    return () => {
      window.clearTimeout(typingTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendTypingState = useCallback((isTyping) => {
    if (!selectedRoomIdRef.current) return;
    socketRef.current?.emit("typing", {
      roomId: selectedRoomIdRef.current,
      isTyping,
    });
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return undefined;
    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);
      // Clear previous messages immediately to avoid showing the wrong room's
      // messages while the new room history loads.
      setMessages([]);
      try {
        await emitChatEventNoAck(socketRef.current, "join_room", {
          roomId: selectedRoomId,
        });
        const data = await getRoomMessages(selectedRoomId);
        if (!cancelled) {
          setMessages(data.messages || []);
          setNotice("");
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error?.response?.data?.message ||
              error.message ||
              "Không tải được tin nhắn",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
      window.clearTimeout(localTypingTimerRef.current);
      sendTypingState(false);
      socketRef.current?.emit("leave_room", { roomId: selectedRoomId });
    };
  }, [selectedRoomId, sendTypingState]);

  // keep ref in sync so socket handlers can read current selected room
  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selectedRoomId]);

  function appendMessage(message) {
    setMessages((prev) => {
      if (prev.some((item) => messageKey(item) === messageKey(message))) {
        return prev;
      }
      return [...prev, message];
    });
  }

  const handleDraftChange = useCallback(
    (value) => {
      setDraft(value);
      if (
        !selectedRoomIdRef.current ||
        !selectedRoom ||
        selectedRoom.status === "closed"
      ) {
        return;
      }

      sendTypingState(true);
      window.clearTimeout(localTypingTimerRef.current);
      localTypingTimerRef.current = window.setTimeout(() => {
        sendTypingState(false);
      }, 1200);
    },
    [selectedRoom, sendTypingState],
  );

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedRoom || selectedRoom.status === "closed" || sending)
      return;
    window.clearTimeout(localTypingTimerRef.current);
    sendTypingState(false);
    setDraft("");
    setSending(true);
    try {
      await emitChatEvent(socketRef.current, "message", {
        roomId: selectedRoom.roomId,
        message: text,
        type: "text",
      });
      setNotice("");
    } catch (error) {
      setDraft(text);
      setNotice(error.message || "Không gửi được tin nhắn");
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedRoom || selectedRoom.status === "closed") return;
    try {
      const uploaded = await uploadChatFile(file);
      await emitChatEvent(socketRef.current, "message", {
        roomId: selectedRoom.roomId,
        message: file.name,
        type: uploaded.type,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
      });
    } catch (error) {
      setNotice(
        error?.response?.data?.message || error.message || "Upload thất bại",
      );
    }
  }

  async function handleCloseRoom() {
    if (!selectedRoom || !window.confirm("Đóng cuộc chat này?")) return;
    try {
      const closed = await closeChatRoom(selectedRoom.roomId);
      setRooms((prev) =>
        prev.map((room) => (room.roomId === closed.roomId ? closed : room)),
      );
      setSelectedRoomId(closed.roomId);
      if (statusFilter !== "closed") {
        setStatusFilter("closed");
      }
    } catch (error) {
      setNotice(
        error?.response?.data?.message ||
          error.message ||
          "Không đóng được phòng chat",
      );
    }
  }

  async function handleReopenRoom() {
    if (!selectedRoom) return;
    try {
      const reopened = await reopenChatRoom(selectedRoom.roomId);
      setRooms((prev) =>
        prev.map((room) => (room.roomId === reopened.roomId ? reopened : room)),
      );
      setSelectedRoomId(reopened.roomId);
      if (statusFilter === "closed") {
        setStatusFilter("");
      }
    } catch (error) {
      setNotice(
        error?.response?.data?.message ||
          error.message ||
          "Không mở lại được phòng chat",
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <BrandLogo className="h-24 w-full max-w-140 object-contain object-left sm:h-28" />
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#ff4500]">
              Support
            </p>
            <h2 className="font-[Manrope,system-ui,sans-serif] text-4xl font-extrabold tracking-tight text-[#111111]">
              Hỗ trợ khách hàng
            </h2>
            <p className="mt-2 text-[#434655]">
              Quản lý các phòng chat realtime giữa admin và customer.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(event) => {
              setSelectedRoomId("");
              setStatusFilter(event.target.value);
            }}
            className="azure-input w-44"
          >
            <option value="closed">Đã đóng</option>
            <option value="">Tất cả</option>
          </select>
          <button
            type="button"
            onClick={loadRooms}
            className="azure-button-muted"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Tải lại
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <SupportStat label="Tổng room" value={roomStats.total} />
        <SupportStat label="Đang mở" value={roomStats.active} />
        <SupportStat label="Đã đóng" value={roomStats.closed} />
      </div>

      {notice ? (
        <div className="mb-4 rounded-xl border border-[#ffd6c4] bg-[#fff1e8] px-4 py-3 text-sm text-[#b83200]">
          {notice}
        </div>
      ) : null}

      <section className="grid min-h-170 overflow-hidden rounded-3xl border border-[#ffd6c4] bg-white shadow-[0_16px_50px_-20px_rgba(255,69,0,0.16)] lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-[#ffd6c4] bg-[linear-gradient(180deg,#fff8f4,#fff1e8)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#ffd6c4] px-5 py-4">
            <h3 className="font-extrabold text-[#111111]">Phong chat</h3>
            <p className="mt-1 text-sm text-[#737686]">
              {loadingRooms
                ? "Đang tải..."
                : `${displayedRooms.length} cuộc hội thoại`}
            </p>
          </div>
          <div className="max-h-155 overflow-y-auto p-3">
            {displayedRooms.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-sm text-[#737686]">
                Chưa có phòng chat phù hợp.
              </p>
            ) : (
              displayedRooms.map((room) => (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => setSelectedRoomId(room.roomId)}
                  className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                    selectedRoomId === room.roomId
                      ? "border-[#ff4500] bg-white shadow-sm"
                      : "border-transparent bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-extrabold text-[#111111]">
                      {room.customerName ||
                        room.customerEmail ||
                        `Customer #${room.customerId}`}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        room.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {room.status === "active" ? "Đang mở" : "Đã đóng"}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-[#434655]">
                    {room.lastMessage || "Chưa có tin nhắn"}
                  </p>
                  <p className="mt-2 text-xs text-[#737686]">
                    {formatTime(room.lastMessageAt || room.updatedAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex h-150 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-[#ffd6c4] px-5 py-4">
            <div className="min-w-0">
              <h3 className="truncate font-extrabold text-[#111111]">
                {selectedRoom
                  ? `${selectedRoom.customerName || selectedRoom.customerEmail || `Customer #${selectedRoom.customerId}`}`
                  : "Chọn room để chat"}
              </h3>
              <p className="truncate text-sm text-[#737686]">
                {typingUser || selectedRoom?.roomId || "Realtime Socket.io"}
              </p>
            </div>
            {selectedRoom ? (
              <div className="flex items-center gap-2">
                {selectedRoom.status === "closed" ? (
                  <button
                    type="button"
                    onClick={handleReopenRoom}
                    className="azure-button"
                  >
                    <span className="material-symbols-outlined text-lg">
                      reply
                    </span>
                    Mở lại chat
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseRoom}
                    className="azure-button-muted"
                  >
                    <span className="material-symbols-outlined text-lg">
                      lock
                    </span>
                    Đóng chat
                  </button>
                )}
              </div>
            ) : null}
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,#fff1e8,#ffffff_55%,#fff8f4_100%)] px-5 py-5">
            {loadingMessages ? (
              <p className="text-sm text-[#737686]">Đang tải lịch sử chat...</p>
            ) : messages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#c3c6d7] bg-white p-5 text-sm text-[#737686]">
                Chưa có tin nhắn trong room này.
              </p>
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
                      className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm ${
                        mine
                          ? "bg-[#ff4500] text-white"
                          : "border border-[#ffd6c4] bg-white text-[#111111]"
                      }`}
                    >
                      {isImageMessage(message) && fileUrl ? (
                        <img
                          src={fileUrl}
                          alt={message.message || "Chat image"}
                          className="mb-2 max-h-56 rounded-lg object-cover"
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
                          Tệp đính kèm
                        </a>
                      ) : null}
                      <p className="whitespace-pre-wrap wrap-break-word">
                        {message.message}
                      </p>
                      <p
                        className={`mt-1 text-[10px] ${mine ? "text-[#ffe5d8]" : "text-[#737686]"}`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {typingUser ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[#ffd6c4] bg-white px-4 py-3 text-sm text-[#434655] shadow-sm">
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
            onSubmit={sendMessage}
            className="border-t border-[#ffd6c4] bg-white/95 p-4"
          >
            <div className="flex items-end gap-3">
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-[#fff1e8] text-[#ff4500] hover:bg-[#ffe5d8]">
                <span className="material-symbols-outlined">attach_file</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <textarea
                rows="1"
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!sending) {
                      sendMessage(event);
                    }
                  }
                }}
                onBlur={() => {
                  window.clearTimeout(localTypingTimerRef.current);
                  sendTypingState(false);
                }}
                disabled={!selectedRoom || selectedRoom.status === "closed"}
                className="min-h-11 flex-1 resize-none rounded-lg border border-[#ffd6c4] px-4 py-3 text-sm text-[#111111] outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
                placeholder={
                  selectedRoom?.status === "closed"
                    ? "Room đã đóng"
                    : "Nhập phản hồi cho khách hàng..."
                }
              />
              <button
                type="submit"
                disabled={
                  !draft.trim() ||
                  !selectedRoom ||
                  selectedRoom.status === "closed" ||
                  sending
                }
                className="h-11 px-4 rounded-lg bg-[#ff4500] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(255,69,0,0.7)] transition hover:bg-[#e63e00] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">
                  {sending ? "hourglass_top" : "send"}
                </span>
                {sending ? "Đang gửi" : "Gửi"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function SupportStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#ffd6c4] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-[#ff4500]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-extrabold text-[#111111] font-[Manrope,system-ui,sans-serif]">
        {value}
      </p>
    </div>
  );
}

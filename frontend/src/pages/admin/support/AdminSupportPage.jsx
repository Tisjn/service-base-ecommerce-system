import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closeChatRoom,
  createChatSocket,
  getChatRooms,
  getRoomMessages,
  joinChatRoom,
  resolveAbsoluteChatUrl,
  uploadChatFile,
} from "../../../api/chatApi";

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

export default function AdminSupportPage({ user }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [notice, setNotice] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);

  const userId = String(user?.id || user?.userId || user?.accountId || "");
  const selectedRoom = rooms.find((room) => room.roomId === selectedRoomId) || null;

  const roomStats = useMemo(
    () => ({
      total: rooms.length,
      active: rooms.filter((room) => room.status === "active").length,
      closed: rooms.filter((room) => room.status === "closed").length,
      unassigned: rooms.filter((room) => !room.adminId).length,
    }),
    [rooms],
  );

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await getChatRooms(statusFilter || undefined);
      setRooms(Array.isArray(data) ? data : []);
      if (!selectedRoomId && data?.[0]?.roomId) {
        setSelectedRoomId(data[0].roomId);
      }
    } catch (error) {
      setNotice(error?.response?.data?.message || error.message || "Khong tai duoc room");
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedRoomId, statusFilter]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    const socket = createChatSocket();
    socketRef.current = socket;

    socket.on("connect", () => setNotice(""));
    socket.on("new_room", (room) => {
      setRooms((prev) =>
        prev.some((item) => item.roomId === room.roomId) ? prev : [room, ...prev],
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
    });
    socket.on("message", (message) => {
      if (message.roomId === selectedRoomId) {
        appendMessage(message);
      }
    });
    socket.on("typing", (event) => {
      if (event.userType === "customer" && event.isTyping) {
        setTypingUser("Khach hang dang nhap...");
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = window.setTimeout(() => setTypingUser(""), 1500);
      }
    });
    socket.on("room_closed", (room) => {
      setRooms((prev) =>
        prev.map((item) =>
          item.roomId === room.roomId ? { ...item, status: "closed" } : item,
        ),
      );
    });
    socket.on("chat_error", (event) => setNotice(event.message || "Socket bi loi"));
    socket.connect();

    return () => {
      window.clearTimeout(typingTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) return undefined;
    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        await joinChatRoom(selectedRoomId);
        socketRef.current?.emit("join_room", { roomId: selectedRoomId });
        const data = await getRoomMessages(selectedRoomId);
        if (!cancelled) {
          setMessages(data.messages || []);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(error?.response?.data?.message || error.message || "Khong tai duoc tin nhan");
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
      socketRef.current?.emit("leave_room", { roomId: selectedRoomId });
    };
  }, [selectedRoomId]);

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

  function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() || !selectedRoom || selectedRoom.status === "closed") return;
    socketRef.current?.emit("message", {
      roomId: selectedRoom.roomId,
      message: draft.trim(),
      type: "text",
    });
    setDraft("");
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedRoom || selectedRoom.status === "closed") return;
    try {
      const uploaded = await uploadChatFile(file);
      socketRef.current?.emit("message", {
        roomId: selectedRoom.roomId,
        message: file.name,
        type: uploaded.type,
        fileUrl: uploaded.fileUrl,
      });
    } catch (error) {
      setNotice(error?.response?.data?.message || error.message || "Upload that bai");
    }
  }

  async function handleCloseRoom() {
    if (!selectedRoom || !window.confirm("Dong cuoc chat nay?")) return;
    try {
      const closed = await closeChatRoom(selectedRoom.roomId);
      setRooms((prev) =>
        prev.map((room) => (room.roomId === closed.roomId ? closed : room)),
      );
    } catch (error) {
      setNotice(error?.response?.data?.message || error.message || "Khong dong duoc room");
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#004ac6]">
            DTPShop Support
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            Ho tro khach hang
          </h2>
          <p className="mt-2 text-[#434655]">
            Quan ly cac phong chat realtime giua admin va customer.
          </p>
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
            <option value="active">Dang mo</option>
            <option value="closed">Da dong</option>
            <option value="">Tat ca</option>
          </select>
          <button type="button" onClick={loadRooms} className="azure-button-muted">
            <span className="material-symbols-outlined text-lg">refresh</span>
            Tai lai
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <SupportStat label="Tong room" value={roomStats.total} />
        <SupportStat label="Dang mo" value={roomStats.active} />
        <SupportStat label="Chua co admin" value={roomStats.unassigned} />
        <SupportStat label="Da dong" value={roomStats.closed} />
      </div>

      {notice ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <section className="grid min-h-[680px] overflow-hidden rounded-2xl border border-[#c3c6d7]/20 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-[#c3c6d7]/20 bg-[#f3f3fe] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#c3c6d7]/20 px-5 py-4">
            <h3 className="font-extrabold text-[#191b23]">Phong chat</h3>
            <p className="mt-1 text-sm text-[#737686]">
              {loadingRooms ? "Dang tai..." : `${rooms.length} cuoc hoi thoai`}
            </p>
          </div>
          <div className="max-h-[620px] overflow-y-auto p-3">
            {rooms.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-sm text-[#737686]">
                Chua co phong chat phu hop.
              </p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => setSelectedRoomId(room.roomId)}
                  className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                    selectedRoomId === room.roomId
                      ? "border-[#004ac6] bg-white shadow-sm"
                      : "border-transparent bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-extrabold text-[#191b23]">
                      Customer #{room.customerId}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        room.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-[#434655]">
                    {room.lastMessage || "Chua co tin nhan"}
                  </p>
                  <p className="mt-2 text-xs text-[#737686]">
                    {formatTime(room.lastMessageAt || room.updatedAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-[680px] flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-[#c3c6d7]/20 px-5 py-4">
            <div className="min-w-0">
              <h3 className="truncate font-extrabold text-[#191b23]">
                {selectedRoom ? `Customer #${selectedRoom.customerId}` : "Chon room de chat"}
              </h3>
              <p className="truncate text-sm text-[#737686]">
                {typingUser || selectedRoom?.roomId || "Realtime Socket.io"}
              </p>
            </div>
            {selectedRoom ? (
              <button
                type="button"
                onClick={handleCloseRoom}
                disabled={selectedRoom.status === "closed"}
                className="azure-button-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">lock</span>
                Dong chat
              </button>
            ) : null}
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#faf8ff] px-5 py-5">
            {loadingMessages ? (
              <p className="text-sm text-[#737686]">Dang tai lich su chat...</p>
            ) : messages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#c3c6d7] bg-white p-5 text-sm text-[#737686]">
                Chua co tin nhan trong room nay.
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
                          ? "bg-[#004ac6] text-white"
                          : "border border-[#c3c6d7]/25 bg-white text-[#191b23]"
                      }`}
                    >
                      {message.type === "image" && fileUrl ? (
                        <img
                          src={fileUrl}
                          alt={message.message || "Chat image"}
                          className="mb-2 max-h-56 rounded-lg object-cover"
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
                      <p className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-[#737686]"}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-[#c3c6d7]/20 p-4">
            <div className="flex items-end gap-3">
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-[#ededf9] text-[#434655] hover:bg-[#e1e2ed]">
                <span className="material-symbols-outlined">attach_file</span>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
              <textarea
                rows="1"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  socketRef.current?.emit("typing", {
                    roomId: selectedRoom?.roomId,
                    isTyping: true,
                  });
                }}
                disabled={!selectedRoom || selectedRoom.status === "closed"}
                className="min-h-11 flex-1 resize-none rounded-lg border border-[#c3c6d7]/45 px-4 py-3 text-sm text-[#191b23] outline-none focus:border-[#004ac6] focus:ring-4 focus:ring-[#004ac6]/10"
                placeholder={
                  selectedRoom?.status === "closed"
                    ? "Room da dong"
                    : "Nhap phan hoi cho khach hang..."
                }
              />
              <button
                type="submit"
                disabled={!draft.trim() || !selectedRoom || selectedRoom.status === "closed"}
                className="azure-button h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                Gui
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
    <div className="rounded-xl border border-[#c3c6d7]/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-extrabold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
        {value}
      </p>
    </div>
  );
}

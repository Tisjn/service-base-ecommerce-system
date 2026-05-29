import { useEffect, useMemo, useRef, useState } from "react";
import {
  askAiAssistant,
  confirmAiAgent,
  getAiAgentHistory,
  getAiErrorMessage,
  getAiRetryAfterSeconds,
  planAiAgent,
} from "../../api/aiApi";
import ProductImageUpload from "../ProductImageUpload";

const initialMessages = [
  {
    id: "admin-ai-welcome",
    role: "assistant",
    message:
      "Xin chào, mình là trợ lý AI quản trị DTPShop. Bạn có thể hỏi thông tin vận hành hoặc chuyển sang tab Agent để tạo kế hoạch thao tác có xác nhận.",
    timestamp: Date.now(),
  },
];

const examples = [
  "Ẩn sản phẩm #12",
  "Đổi trạng thái đơn #45 sang DELIVERED",
  "Tạo danh mục phụ kiện công nghệ slug phu-kien-cong-nghe",
];

const orderStatusOptions = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const productStatusOptions = ["ACTIVE", "HIDDEN"];
const AGENT_EXECUTED_EVENT = "dtpshop:agent-executed";
const numericFieldKeys = [
  "price",
  "purchasePrice",
  "stockQuantity",
  "categoryId",
  "productId",
  "orderId",
];

const fieldLabels = {
  productId: "ID sản phẩm",
  categoryId: "ID danh mục",
  orderId: "ID đơn hàng",
  name: "Tên",
  slug: "Slug",
  description: "Mô tả",
  price: "Giá bán",
  purchasePrice: "Giá nhập",
  stockQuantity: "Tồn kho",
  status: "Trạng thái",
  imageUrl: "Ảnh chính",
  descriptionImageUrls: "Ảnh mô tả",
  reason: "Lý do",
  payload: "Nội dung cập nhật",
};

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.username || "Admin";
}

function riskClass(level) {
  if (level === "high") return "border-red-200 bg-red-50 text-red-700";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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

function clonePlan(plan) {
  return plan ? JSON.parse(JSON.stringify(plan)) : plan;
}

function coerceInputValue(value) {
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join("\n");
  if (value == null) return "";
  return String(value);
}

function parseFieldValue(rawValue, previousValue, fieldKey = "") {
  if (Array.isArray(previousValue)) {
    return rawValue
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (
    typeof previousValue === "number" ||
    numericFieldKeys.includes(fieldKey)
  ) {
    const next = Number(rawValue);
    return rawValue === "" ? "" : Number.isFinite(next) ? next : "";
  }
  return rawValue;
}

function labelForField(key) {
  return fieldLabels[key] || key;
}

function normalizePlanForEditing(plan) {
  const nextPlan = clonePlan(plan);
  if (!Array.isArray(nextPlan?.actions)) return nextPlan;

  nextPlan.actions = nextPlan.actions.map((action) => {
    if (action.tool === "updateProduct") {
      const args = action.args || {};
      const {
        payload: rawPayload,
        name,
        description,
        price,
        purchasePrice,
        stockQuantity,
        categoryId,
        status,
        imageUrl,
        descriptionImageUrls,
        ...restArgs
      } = args;
      const payload = {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(purchasePrice !== undefined ? { purchasePrice } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(descriptionImageUrls !== undefined ? { descriptionImageUrls } : {}),
        ...(rawPayload || {}),
      };
      return {
        ...action,
        args: {
          productId: "",
          ...restArgs,
          payload: {
            name: "",
            description: "",
            price: "",
            purchasePrice: "",
            stockQuantity: "",
            categoryId: "",
            status: "",
            imageUrl: "",
            descriptionImageUrls: [],
            ...payload,
          },
        },
      };
    }

    if (action.tool !== "createProduct") return action;
    const args = action.args || {};
    return {
      ...action,
      args: {
        name: "",
        description: "",
        price: 0,
        purchasePrice: 0,
        stockQuantity: 0,
        categoryId: "",
        status: "ACTIVE",
        imageUrl: "",
        descriptionImageUrls: [],
        ...args,
      },
    };
  });

  return nextPlan;
}

export default function AdminAiChatWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("agent");
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [agentDraft, setAgentDraft] = useState("");
  const [plan, setPlan] = useState(null);
  const [execution, setExecution] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const bottomRef = useRef(null);
  const adminName = getDisplayName(user);
  const rateLimited = retrySeconds > 0;

  const canConfirm = useMemo(
    () =>
      plan &&
      plan.status !== "needs_review" &&
      Array.isArray(plan.actions) &&
      plan.actions.length > 0 &&
      status !== "confirming",
    [plan, status],
  );

  useEffect(() => {
    if (open && activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, open, activeTab, status]);

  useEffect(() => {
    if (!open || activeTab !== "history") return;
    loadHistory();
  }, [open, activeTab]);

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
      if (secondsLeft === 0) setRetryUntil(0);
    };

    updateRetrySeconds();
    const timer = window.setInterval(updateRetrySeconds, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  async function sendQuestion(event) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || status === "thinking" || rateLimited) return;

    setMessages((current) => [
      ...current,
      {
        id: `admin-user-${Date.now()}`,
        role: "user",
        message: question,
        timestamp: Date.now(),
      },
    ]);
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

  async function createPlan(event) {
    event.preventDefault();
    const input = agentDraft.trim();
    if (!input || status === "planning" || rateLimited) return;
    setError("");
    setPlan(null);
    setExecution(null);
    setStatus("planning");

    try {
      const data = await planAiAgent(input);
      setPlan(normalizePlanForEditing(data));
    } catch (err) {
      const retryAfterSeconds = getAiRetryAfterSeconds(err);
      if (retryAfterSeconds > 0) {
        setRetryUntil(Date.now() + retryAfterSeconds * 1000);
      }
      setError(getAiErrorMessage(err));
    } finally {
      setStatus("idle");
    }
  }

  async function confirmPlan() {
    if (!canConfirm) return;
    setError("");
    setStatus("confirming");
    try {
      const data = await confirmAiAgent(plan.planId, plan.actions || []);
      setExecution(data);
      dispatchAgentExecuted(data);
      await loadHistory();
    } catch (err) {
      setError(getAiErrorMessage(err));
    } finally {
      setStatus("idle");
    }
  }

  function dispatchAgentExecuted(data) {
    const results = Array.isArray(data?.results) ? data.results : [];
    const successfulTools = results
      .filter((result) => result.status === "success")
      .map((result) => result.tool);
    if (successfulTools.length === 0) return;

    window.dispatchEvent(
      new CustomEvent(AGENT_EXECUTED_EVENT, {
        detail: {
          planId: data?.planId,
          status: data?.status,
          tools: successfulTools,
          results,
        },
      }),
    );
  }

  async function loadHistory() {
    try {
      const data = await getAiAgentHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
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
        <section className="fixed bottom-24 right-8 z-50 flex h-[min(720px,calc(100svh-8rem))] w-[min(520px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#ffd6c4] bg-white shadow-2xl">
          <header className="border-b border-[#e63e00] bg-[#ff4500] px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <span className="material-symbols-outlined text-3xl">
                    smart_toy
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">
                    AI Agent quản trị
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
                <span className="material-symbols-outlined text-xl">
                  close
                </span>
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 rounded-xl bg-white/15 p-1">
              <TabButton
                active={activeTab === "agent"}
                icon="rule_settings"
                label="Agent"
                onClick={() => setActiveTab("agent")}
              />
              <TabButton
                active={activeTab === "chat"}
                icon="chat"
                label="Chat"
                onClick={() => setActiveTab("chat")}
              />
              <TabButton
                active={activeTab === "history"}
                icon="history"
              label="Audit"
                onClick={() => setActiveTab("history")}
              />
            </div>
          </header>

          {error ? (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {activeTab === "agent" ? (
          <AgentPanel
              agentDraft={agentDraft}
              setAgentDraft={setAgentDraft}
              status={status}
              rateLimited={rateLimited}
              retrySeconds={retrySeconds}
              plan={plan}
              setPlan={setPlan}
              execution={execution}
              canConfirm={canConfirm}
              onCreatePlan={createPlan}
              onConfirmPlan={confirmPlan}
              onReset={() => {
                setPlan(null);
                setExecution(null);
                setAgentDraft("");
                setError("");
              }}
            />
          ) : activeTab === "chat" ? (
            <ChatPanel
              messages={messages}
              status={status}
              draft={draft}
              setDraft={setDraft}
              rateLimited={rateLimited}
              retrySeconds={retrySeconds}
              onSubmit={sendQuestion}
              bottomRef={bottomRef}
            />
          ) : (
            <HistoryPanel history={history} onRefresh={loadHistory} />
          )}
        </section>
      )}
    </>
  );
}

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition ${
        active ? "bg-white text-[#ff4500]" : "text-white hover:bg-white/10"
      }`}
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
      {label}
    </button>
  );
}

function AgentPanel({
  agentDraft,
  setAgentDraft,
  status,
  rateLimited,
  retrySeconds,
  plan,
  setPlan,
  execution,
  canConfirm,
  onCreatePlan,
  onConfirmPlan,
  onReset,
}) {
  function updateActionArg(actionIndex, path, value) {
    setPlan((currentPlan) => {
      const nextPlan = clonePlan(currentPlan);
      const action = nextPlan?.actions?.[actionIndex];
      if (!action) return currentPlan;
      let target = action.args || {};
      action.args = target;
      for (let i = 0; i < path.length - 1; i += 1) {
        const segment = path[i];
        target[segment] = target[segment] || {};
        target = target[segment];
      }
      const key = path[path.length - 1];
      target[key] = parseFieldValue(value, target[key], key);
      return nextPlan;
    });
  }

  function updateActionDescription(actionIndex, value) {
    setPlan((currentPlan) => {
      const nextPlan = clonePlan(currentPlan);
      if (!nextPlan?.actions?.[actionIndex]) return currentPlan;
      nextPlan.actions[actionIndex].description = value;
      nextPlan.summary = nextPlan.actions.map(
        (action) => action.description || action.tool,
      );
      return nextPlan;
    });
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#fff8f4] p-4">
      <form onSubmit={onCreatePlan} className="rounded-xl border border-[#ffd6c4] bg-white p-4 shadow-sm">
        <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-500">
          Lệnh thao tác
        </label>
        <textarea
          value={agentDraft}
          onChange={(event) => setAgentDraft(event.target.value)}
          disabled={status === "planning" || status === "confirming" || rateLimited}
          rows="4"
          className="mt-2 w-full resize-none rounded-xl border border-[#ffd6c4] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
          placeholder={
            rateLimited
              ? `Chờ ${retrySeconds}s rồi thử lại...`
              : "Nhập lệnh, ví dụ: Ẩn sản phẩm #12"
          }
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => setAgentDraft(example)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Làm mới
          </button>
          <button
            type="submit"
            disabled={!agentDraft.trim() || status === "planning" || rateLimited}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff4500] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#e63e00] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              {status === "planning" ? "hourglass_top" : "schema"}
            </span>
            Tạo plan
          </button>
        </div>
      </form>

      {plan ? (
        <section className="mt-4 rounded-xl border border-[#ffd6c4] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Plan #{plan.planId}
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950">
                Xem trước thao tác
              </h3>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase ${riskClass(
                plan.riskLevel,
              )}`}
            >
              {plan.riskLevel}
            </span>
          </div>

          {plan.warnings?.length ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {plan.warnings.join(" ")}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {plan.actions?.map((action, index) => (
              <div
                key={`${action.tool}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                      Mô tả thao tác
                    </span>
                    <input
                      value={action.description || ""}
                      onChange={(event) =>
                        updateActionDescription(index, event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
                    />
                  </label>
                  <code className="rounded-lg bg-white px-2 py-1 text-xs text-[#ff4500]">
                    {action.tool}
                  </code>
                </div>
                <ActionArgsEditor
                  action={action}
                  actionIndex={index}
                  onChange={updateActionArg}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Hết hạn: {formatTime(plan.expiresAt)}
            </p>
            <button
              type="button"
              onClick={onConfirmPlan}
              disabled={!canConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {status === "confirming" ? "hourglass_top" : "verified"}
              </span>
              Xác nhận chạy
            </button>
          </div>
        </section>
      ) : null}

      {execution ? (
        <section className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-slate-950">
              Kết quả thực thi
            </h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
              {execution.status}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {execution.results?.map((result, index) => (
              <div
                key={`${result.tool}-${index}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div>
                  <p className="font-extrabold text-slate-950">
                    {result.tool}
                  </p>
                  <p className="mt-1 text-slate-600">{result.message}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    result.status === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {result.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ActionArgsEditor({ action, actionIndex, onChange }) {
  const args = action.args || {};
  const entries = Object.entries(args);

  if (entries.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
        Thao tác này chưa có tham số.
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3">
      {entries.map(([key, value]) =>
        value && typeof value === "object" && !Array.isArray(value) ? (
          <fieldset
            key={key}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <legend className="px-1 text-xs font-extrabold uppercase tracking-widest text-slate-500">
              {labelForField(key)}
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {Object.entries(value).map(([nestedKey, nestedValue]) => (
                <EditableArgField
                  key={`${key}.${nestedKey}`}
                  fieldKey={nestedKey}
                  value={nestedValue}
                  tool={action.tool}
                  onChange={(nextValue) =>
                    onChange(actionIndex, [key, nestedKey], nextValue)
                  }
                />
              ))}
            </div>
          </fieldset>
        ) : (
          <EditableArgField
            key={key}
            fieldKey={key}
            value={value}
            tool={action.tool}
            onChange={(nextValue) => onChange(actionIndex, [key], nextValue)}
          />
        ),
      )}
    </div>
  );
}

function EditableArgField({ fieldKey, value, tool, onChange }) {
  const label = labelForField(fieldKey);
  const inputValue = coerceInputValue(value);
  const isLongText =
    fieldKey === "description" ||
    fieldKey === "imageUrl" ||
    fieldKey === "descriptionImageUrls" ||
    fieldKey === "reason" ||
    String(inputValue).length > 80;

  if (fieldKey === "status") {
    const options = tool === "updateOrderStatus" ? orderStatusOptions : productStatusOptions;
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <select
          value={inputValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
        >
          {tool === "updateProduct" ? <option value="">Không đổi</option> : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (fieldKey === "imageUrl") {
    return (
      <div className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <input
          value={inputValue}
          onChange={(event) => onChange(event.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
          placeholder="URL ảnh sản phẩm"
        />
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
          <ProductImageUpload
            initialImage={inputValue || null}
            onImageUpload={(imageUrl) => onChange(imageUrl)}
          />
        </div>
      </div>
    );
  }

  if (isLongText) {
    return (
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <textarea
          value={inputValue}
          rows={fieldKey === "description" ? 3 : 2}
          onChange={(event) => onChange(event.target.value)}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <input
        value={inputValue}
        type={typeof value === "number" || numericFieldKeys.includes(fieldKey) ? "number" : "text"}
        min={typeof value === "number" || numericFieldKeys.includes(fieldKey) ? "0" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff4500] focus:ring-4 focus:ring-[#ff4500]/10"
      />
    </label>
  );
}

function ChatPanel({
  messages,
  status,
  draft,
  setDraft,
  rateLimited,
  retrySeconds,
  onSubmit,
  bottomRef,
}) {
  return (
    <>
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
                  {new Date(message.timestamp).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}

        {status === "thinking" ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-[#ffd6c4] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              <span className="material-symbols-outlined text-base text-[#ff4500]">
                hourglass_top
              </span>
              AI đang trả lời...
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-[#ffd6c4] bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit(event);
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
              {status === "thinking" || rateLimited ? "hourglass_top" : "send"}
            </span>
          </button>
        </div>
      </form>
    </>
  );
}

function HistoryPanel({ history, onRefresh }) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#fff8f4] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Nhật ký kiểm tra
          </p>
          <h3 className="text-lg font-black text-slate-950">
            Lịch sử agent
          </h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
          title="Tải lại"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>
      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Chưa có lịch sử thao tác agent.
          </div>
        ) : (
          history.map((item) => (
            <article
              key={item.planId}
              className="rounded-xl border border-[#ffd6c4] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-950">
                    {item.input}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTime(item.createdAt)} - {item.planId}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-xs font-extrabold uppercase ${riskClass(
                    item.riskLevel,
                  )}`}
                >
                  {item.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {(item.summary || []).slice(0, 3).map((line, index) => (
                  <p key={`${item.planId}-${index}`}>{line}</p>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

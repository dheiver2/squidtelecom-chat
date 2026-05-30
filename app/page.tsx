"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const SUGGESTIONS = [
  "Quais serviços a Alpha 1 oferece?",
  "O que é internet com velocidade simétrica?",
  "Como funciona o suporte técnico 24 horas?",
  "Quais as vantagens de IPs fixos e válidos?",
];

const STORAGE_KEY = "alpha1-conversations";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("`")) parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    else parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // load from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: Conversation[] = JSON.parse(raw);
        if (data.length) {
          setConversations(data);
          setCurrentId(data[0].id);
          return;
        }
      }
    } catch {}
    const fresh = { id: uid(), title: "Nova conversa", messages: [] as Message[] };
    setConversations([fresh]);
    setCurrentId(fresh.id);
  }, []);

  // persist
  useEffect(() => {
    if (conversations.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      } catch {}
    }
  }, [conversations]);

  const current = conversations.find((c) => c.id === currentId);
  const messages = current?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  function updateCurrent(updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === currentId ? updater(c) : c)));
  }

  function newChat() {
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setCurrentId(existingEmpty.id);
    } else {
      const fresh = { id: uid(), title: "Nova conversa", messages: [] as Message[] };
      setConversations((prev) => [fresh, ...prev]);
      setCurrentId(fresh.id);
    }
    setSidebarOpen(false);
    setError("");
  }

  function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = { id: uid(), title: "Nova conversa", messages: [] as Message[] };
        setCurrentId(fresh.id);
        return [fresh];
      }
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError("");

    const isFirst = messages.length === 0;
    const userMsg: Message = { role: "user", content };
    updateCurrent((c) => ({
      ...c,
      title: isFirst ? content.slice(0, 40) : c.title,
      messages: [...c.messages, userMsg],
    }));
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const history = [...messages, userMsg];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao contatar o assistente.");
      }

      updateCurrent((c) => ({ ...c, messages: [...c.messages, { role: "assistant", content: "" }] }));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        updateCurrent((c) => {
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = {
            role: "assistant",
            content: msgs[msgs.length - 1].content + chunk,
          };
          return { ...c, messages: msgs };
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      updateCurrent((c) => {
        const msgs = [...c.messages];
        if (msgs.length && msgs[msgs.length - 1].role === "assistant" && msgs[msgs.length - 1].content === "") {
          msgs.pop();
        }
        return { ...c, messages: msgs };
      });
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const waitingForFirstToken =
    loading && (messages.length === 0 || messages[messages.length - 1].role === "user");

  const composer = (
    <div className="composer">
      {error && <div className="error">{error}</div>}
      <div className="input-box">
        <textarea
          ref={textareaRef}
          value={input}
          placeholder="Envie uma mensagem para o Alpha1 Assistant"
          rows={1}
          onChange={(e) => {
            setInput(e.target.value);
            autoGrow();
          }}
          onKeyDown={onKeyDown}
        />
        <button className="send" onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Enviar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="disclaimer">Alpha1 Assistant pode cometer erros. Confira informações importantes.</div>
    </div>
  );

  return (
    <div className={`layout${sidebarOpen ? " sidebar-open" : ""}`}>
      <div className="overlay" onClick={() => setSidebarOpen(false)} />

      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <img src="/logo-alpha1.png" alt="Alpha 1" />
            <span>Alpha1 Assistant</span>
          </div>
          <button className="new-chat" onClick={newChat}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Nova conversa
          </button>
        </div>

        <div className="history">
          <div className="history-label">Conversas</div>
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`history-item${c.id === currentId ? " active" : ""}`}
              onClick={() => {
                setCurrentId(c.id);
                setSidebarOpen(false);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="title">{c.title || "Nova conversa"}</span>
              <span className="del" onClick={(e) => deleteChat(c.id, e)} aria-label="Excluir">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="user-pill">
            <span className="ava">A1</span>
            <span className="txt">
              Alpha 1 Consultoria
              <small>Telecom · Gestão · TI</small>
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="model">
            Alpha1 Assistant <small>llama3.2</small>
          </div>
        </header>

        {messages.length === 0 ? (
          <div className="greeting">
            <img src="/logo-alpha1.png" alt="Alpha 1" />
            <h1>Em que posso ajudar?</h1>
            <div className="composer-wrap">
              {composer}
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="scroll" ref={scrollRef}>
              <div className="thread">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div className="row user" key={i}>
                      <div className="bubble">{m.content}</div>
                    </div>
                  ) : (
                    <div className="row assistant" key={i}>
                      <div className="avatar">
                        <img src="/logo-alpha1.png" alt="A1" />
                      </div>
                      <div className="content">
                        <div className="name">Alpha1 Assistant</div>
                        {m.content === "" ? (
                          <span className="typing">
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : (
                          renderInline(m.content)
                        )}
                      </div>
                    </div>
                  )
                )}
                {waitingForFirstToken && (
                  <div className="row assistant">
                    <div className="avatar">
                      <img src="/logo-alpha1.png" alt="A1" />
                    </div>
                    <div className="content">
                      <div className="name">Alpha1 Assistant</div>
                      <span className="typing">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="composer-outer">{composer}</div>
          </>
        )}
      </main>
    </div>
  );
}

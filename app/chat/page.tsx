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

const OLLAMA = "http://localhost:11434";
const PREFERRED_MODEL = "llama3.2";
const SYSTEM_PROMPT =
  "Você é o Alpha1 Assistant, o assistente virtual inteligente da Alpha 1 Consultoria — " +
  "empresa de telecomunicações, gestão e tecnologia da informação que atende empresas em todo o Brasil. " +
  "Responda sempre em português do Brasil, de forma clara, profissional e prestativa. " +
  "Use markdown quando ajudar na leitura.";

const SUGGESTIONS = [
  "Quais serviços a Alpha 1 oferece?",
  "O que é internet com velocidade simétrica?",
  "Como funciona o suporte técnico 24 horas?",
  "Quais as vantagens de IPs fixos e válidos?",
];

const STORAGE_KEY = "alpha1-conversations";
const USER_KEY = "alpha1-user";

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

type OllamaStatus = "checking" | "online" | "offline";

export default function ChatPage() {
  const [user, setUser] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [status, setStatus] = useState<OllamaStatus>("checking");
  const [model, setModel] = useState(PREFERRED_MODEL);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // load user + conversations
  useEffect(() => {
    try {
      setUser(localStorage.getItem(USER_KEY));
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

  // check Ollama connection
  async function checkOllama() {
    setStatus("checking");
    try {
      const res = await fetch(`${OLLAMA}/api/tags`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const names: string[] = (data.models || []).map((m: { name: string }) => m.name);
      const chosen =
        names.find((n) => n.startsWith(PREFERRED_MODEL)) || names[0] || PREFERRED_MODEL;
      setModel(chosen.replace(/:latest$/, ""));
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  }

  useEffect(() => {
    checkOllama();
    const t = setInterval(checkOllama, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (existingEmpty) setCurrentId(existingEmpty.id);
    else {
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

  function login(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(USER_KEY, name);
    setUser(name);
  }

  function logout() {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    if (status !== "online") {
      setError("O Ollama não está conectado. Verifique se ele está rodando no seu computador.");
      return;
    }
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
      const res = await fetch(`${OLLAMA}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        }),
      });

      if (!res.ok || !res.body) throw new Error("Falha ao gerar resposta no Ollama.");

      updateCurrent((c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: "" }],
      }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content;
            if (token) {
              updateCurrent((c) => {
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = {
                  role: "assistant",
                  content: msgs[msgs.length - 1].content + token,
                };
                return { ...c, messages: msgs };
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
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

  // ---------- LOGIN SCREEN ----------
  if (user === null) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo-alpha1.png" alt="Alpha 1" />
          <h1>Entrar no Alpha1 Assistant</h1>
          <p>Use seu nome para começar. Suas conversas ficam salvas apenas neste navegador.</p>
          <form onSubmit={login}>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Seu nome"
              autoFocus
            />
            <button type="submit" disabled={!nameInput.trim()}>
              Entrar
            </button>
          </form>
          <div className={`login-status ${status}`}>
            <span className="dot" />
            {status === "checking" && "Procurando o Ollama..."}
            {status === "online" && `Ollama conectado (${model})`}
            {status === "offline" && "Ollama não detectado — instale e inicie para conversar"}
          </div>
          <a className="login-back" href="/">
            ← Ver instruções de instalação
          </a>
        </div>
      </div>
    );
  }

  const waitingForFirstToken =
    loading && (messages.length === 0 || messages[messages.length - 1].role === "user");
  const initial = user.trim().charAt(0).toUpperCase() || "U";

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
            <span className="ava">{initial}</span>
            <span className="txt">
              {user}
              <small>Conta local</small>
            </span>
            <button className="logout-btn" onClick={logout} aria-label="Sair">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
            Alpha1 Assistant <small>{status === "online" ? model : "offline"}</small>
          </div>
          <div className={`conn ${status}`} title="Status do Ollama">
            <span className="dot" />
            {status === "online" ? "Online" : status === "checking" ? "..." : "Offline"}
          </div>
        </header>

        {status === "offline" && (
          <div className="ollama-banner">
            <strong>Ollama não detectado.</strong> Para conversar, instale e inicie o Ollama no seu
            computador. <a href="/">Ver instruções</a>. Lembre de iniciar com{" "}
            <code>OLLAMA_ORIGINS=* ollama serve</code> e depois{" "}
            <button onClick={checkOllama}>tentar novamente</button>.
          </div>
        )}

        {messages.length === 0 ? (
          <div className="greeting">
            <img src="/logo-alpha1.png" alt="Alpha 1" />
            <h1>Olá, {user.split(" ")[0]} 👋</h1>
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

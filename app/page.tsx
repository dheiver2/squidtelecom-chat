"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}

const SUGGESTIONS = [
  "Quais serviços a Alpha 1 oferece?",
  "Explique o que é internet com velocidade simétrica.",
  "Como funciona o suporte técnico 24 horas?",
  "Quais as vantagens de IPs fixos e válidos?",
];

function renderInline(text: string) {
  // minimal markdown: `code`, **bold**
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError("");
    const next = [...messages, { role: "user" as Role, content }];
    setMessages(next);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao contatar o assistente.");
      }

      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setMessages((m) =>
        m.length && m[m.length - 1].role === "assistant" && m[m.length - 1].content === ""
          ? m.slice(0, -1)
          : m
      );
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

  const lastIsEmptyAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content === "";

  return (
    <div className="app">
      <header className="header">
        <img className="logo" src="/logo-alpha1.png" alt="Alpha 1" />
        <div className="titles">
          <h1>Alpha1 Assistant</h1>
          <p>Telecom · Gestão · Tecnologia da Informação</p>
        </div>
        {messages.length > 0 && (
          <button className="new-chat" onClick={() => setMessages([])}>
            Nova conversa
          </button>
        )}
      </header>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <img src="/logo-alpha1.png" alt="Alpha 1" />
            <h2>Como posso ajudar você hoje?</h2>
            <p>
              Sou o assistente virtual da Alpha 1 Consultoria. Pergunte sobre nossos serviços de
              telecomunicações, gestão e TI.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className="avatar">
                {m.role === "assistant" ? (
                  <img src="/logo-alpha1.png" alt="A1" />
                ) : (
                  "Você"
                )}
              </div>
              <div className="bubble">
                {m.content === "" && loading && i === messages.length - 1 ? (
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
          ))
        )}
        {loading && !lastIsEmptyAssistant && messages[messages.length - 1]?.role === "user" && (
          <div className="msg assistant">
            <div className="avatar">
              <img src="/logo-alpha1.png" alt="A1" />
            </div>
            <div className="bubble">
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        {error && <div className="error">{error}</div>}
        <div className="input-row">
          <textarea
            ref={textareaRef}
            value={input}
            placeholder="Envie uma mensagem para o Alpha1 Assistant..."
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={onKeyDown}
          />
          <button
            className="send"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            aria-label="Enviar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <div className="hint">Alpha1 Assistant pode cometer erros. Confira informações importantes.</div>
      </div>
    </div>
  );
}

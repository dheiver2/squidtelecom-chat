"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import hljs from "highlight.js/lib/common";
import { ENGINE_NAME } from "../lib/mangaba";

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

// Histórico fica no dispositivo de cada usuário, com chave por usuário.
const storageKeyFor = (user: string) => `alpha1-conversations:${user}`;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseInline(text: string, kp: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex =
    /(\*\*[^*]+\*\*|__[^_]+__|\*(?!\s)[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("`")) {
      nodes.push(<code key={`${kp}-${k++}`}>{t.slice(1, -1)}</code>);
    } else if (t.startsWith("**") || t.startsWith("__")) {
      nodes.push(<strong key={`${kp}-${k++}`}>{t.slice(2, -2)}</strong>);
    } else if (t.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(t)!;
      const href = mm[2];
      // Bloqueia javascript: e outros esquemas não-HTTP para evitar XSS
      if (!href.startsWith("http://") && !href.startsWith("https://")) break;
      nodes.push(
        <a key={`${kp}-${k++}`} href={href} target="_blank" rel="noreferrer noopener">
          {mm[1]}
        </a>
      );
    } else {
      nodes.push(<em key={`${kp}-${k++}`}>{t.slice(1, -1)}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      if (lang && hljs.getLanguage(lang)) {
        el.innerHTML = hljs.highlight(code, { language: lang }).value;
      } else {
        el.innerHTML = hljs.highlightAuto(code).value;
      }
    } catch {
      el.textContent = code;
    }
  }, [code, lang]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <span className="code-lang">{lang || "código"}</span>
        <button className="code-copy" onClick={copy} type="button">
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 15V5a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
      <pre>
        <code ref={ref} className="hljs">
          {code}
        </code>
      </pre>
    </div>
  );
}

const splitRow = (s: string) =>
  s
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function renderMarkdown(src: string): React.ReactNode[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
  const isUl = (l: string) => /^\s*[-*+]\s+/.test(l);
  const isOl = (l: string) => /^\s*\d+[.)]\s+/.test(l);
  const isQuote = (l: string) => /^>\s?/.test(l);
  const isHr = (l: string) => /^(-{3,}|\*{3,}|_{3,})$/.test(l.trim());
  const isFence = (l: string) => /^```/.test(l.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (isFence(line)) {
      const lang = (/^```([\w+-]*)/.exec(line.trim())?.[1] || "").toLowerCase();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        buf.push(lines[i]);
        i++;
      }
      i++; // pula o fechamento (se houver)
      blocks.push(<CodeBlock key={key++} code={buf.join("\n")} lang={lang} />);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(h[1].length + 1, 6);
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      blocks.push(<Tag key={key}>{parseInline(h[2], `h${key++}`)}</Tag>);
      i++;
      continue;
    }

    if (isHr(line)) {
      blocks.push(<hr key={key++} />);
      i++;
      continue;
    }

    // tabela (GFM)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const tk = key++;
      blocks.push(
        <div className="table-wrap" key={tk}>
          <table>
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th key={ci}>{parseInline(c, `th${tk}-${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci}>{parseInline(c, `td${tk}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (isQuote(line)) {
      const buf: string[] = [];
      while (i < lines.length && isQuote(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(<blockquote key={key++}>{renderMarkdown(buf.join("\n"))}</blockquote>);
      continue;
    }

    if (isUl(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        if (isUl(lines[i])) {
          const item = lines[i].replace(/^\s*[-*+]\s+/, "");
          items.push(<li key={items.length}>{parseInline(item, `ul${key}-${items.length}`)}</li>);
          i++;
        } else if (lines[i].trim() === "" && i + 1 < lines.length && isUl(lines[i + 1])) {
          i++; // linha em branco entre itens (lista "solta") — mesma lista
        } else {
          break;
        }
      }
      blocks.push(<ul key={key++}>{items}</ul>);
      continue;
    }

    if (isOl(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        if (isOl(lines[i])) {
          const item = lines[i].replace(/^\s*\d+[.)]\s+/, "");
          items.push(<li key={items.length}>{parseInline(item, `ol${key}-${items.length}`)}</li>);
          i++;
        } else if (lines[i].trim() === "" && i + 1 < lines.length && isOl(lines[i + 1])) {
          i++; // linha em branco entre itens (lista "solta") — mesma lista
        } else {
          break;
        }
      }
      blocks.push(<ol key={key++}>{items}</ol>);
      continue;
    }

    // parágrafo
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isFence(lines[i]) &&
      !isHeading(lines[i]) &&
      !isUl(lines[i]) &&
      !isOl(lines[i]) &&
      !isQuote(lines[i]) &&
      !isHr(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    const pk = key++;
    const inlineNodes: React.ReactNode[] = [];
    para.forEach((p, idx) => {
      if (idx > 0) inlineNodes.push(<br key={`br${pk}-${idx}`} />);
      inlineNodes.push(...parseInline(p, `p${pk}-${idx}`));
    });
    blocks.push(<p key={pk}>{inlineNodes}</p>);
  }

  return blocks;
}

// Memoizado: só re-renderiza a mensagem cujo conteúdo mudou (durante o stream,
// evita reprocessar o markdown de todas as mensagens a cada token).
const MessageContent = memo(function MessageContent({ content }: { content: string }) {
  return <>{renderMarkdown(content)}</>;
});

type EngineStatus = "checking" | "online" | "offline";

export default function ChatPage() {
  const [user, setUser] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [password2Input, setPassword2Input] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [status, setStatus] = useState<EngineStatus>("checking");
  const [modelLabel, setModelLabel] = useState("Mangaba 1");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Aborta a geração em curso (botão parar).
  const abortRef = useRef<AbortController | null>(null);
  // Auto-scroll só quando o usuário está perto do fim do histórico.
  const autoScrollRef = useRef(true);

  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Tema escuro
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // Arquivo anexado
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tema: carrega preferência salva e aplica no <html>
  useEffect(() => {
    const saved = localStorage.getItem("a1-theme") as "light" | "dark" | null;
    const preferred = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("a1-theme", next);
  }

  // restaura sessão (cookie httpOnly) no carregamento
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  // carrega as conversas do usuário (isoladas por usuário, no dispositivo dele)
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setCurrentId("");
      return;
    }
    try {
      const raw = localStorage.getItem(storageKeyFor(user));
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
  }, [user]);

  // Verifica a conexão com o serviço de IA via rota server-side (/api/status),
  // que fala com o Ollama na VPS (atrás de proxy HTTPS + chave). A chave nunca
  // chega ao navegador — fica só nas variáveis de ambiente do servidor.
  async function checkEngine() {
    setStatus("checking");
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          if (data.model) setModelLabel(data.model);
          setStatus("online");
          return;
        }
      }
    } catch {
      // cai para offline abaixo
    }
    setStatus("offline");
  }

  useEffect(() => {
    if (!user) return;
    checkEngine();
    const t = setInterval(checkEngine, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user && conversations.length) {
      try {
        localStorage.setItem(storageKeyFor(user), JSON.stringify(conversations));
      } catch {}
    }
  }, [conversations, user]);

  const current = conversations.find((c) => c.id === currentId);
  const messages = current?.messages ?? [];

  useEffect(() => {
    if (autoScrollRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  function onThreadScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    autoScrollRef.current = nearBottom;
    setShowScrollDown(!nearBottom);
  }

  function scrollToBottom() {
    autoScrollRef.current = true;
    setShowScrollDown(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

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

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput;
    if (!username || !password || loggingIn) return;
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setLoginError(d.error || "Não foi possível entrar.");
        return;
      }
      const d = await res.json();
      setPasswordInput("");
      setUser(d.user);
    } catch {
      setLoginError("Falha de conexão. Tente novamente.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setUsernameInput("");
    setPasswordInput("");
    setPassword2Input("");
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput;
    if (!username || !password || loggingIn) return;
    if (password !== password2Input) {
      setLoginError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setLoginError("Senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setLoginError(d.error || "Erro ao criar conta."); return; }
      // Cadastro ok → faz login automático
      const res2 = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d2 = await res2.json().catch(() => ({}));
      if (!res2.ok) { setAuthMode("login"); setLoginError("Conta criada! Faça login."); return; }
      setPasswordInput("");
      setPassword2Input("");
      setUser(d2.user);
    } catch {
      setLoginError("Falha de conexão. Tente novamente.");
    } finally {
      setLoggingIn(false);
    }
  }

  // Núcleo da geração: recebe o histórico (terminando numa msg do usuário),
  // anexa a resposta do assistente e faz o streaming. Usado por send/regenerar/editar.
  async function runCompletion(history: Message[]) {
    setError("");
    setLoading(true);
    autoScrollRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fala com a rota server-side, que faz proxy autenticado para o serviço de
      // IA (Ollama na VPS). Não enviamos system prompt nem chave: a rota cuida disso.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let msg = `Falha ao gerar resposta no ${ENGINE_NAME}.`;
        try {
          const e = await res.json();
          if (e?.error) msg = e.error;
        } catch {}
        throw new Error(msg);
      }

      updateCurrent((c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: "" }],
      }));

      const appendToken = (token: string) =>
        updateCurrent((c) => {
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = {
            role: "assistant",
            content: msgs[msgs.length - 1].content + token,
          };
          return { ...c, messages: msgs };
        });

      // A rota /api/chat devolve os tokens em TEXTO PURO (já parseou o SSE do
      // upstream), então é só decodificar e anexar cada pedaço.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) appendToken(chunk);
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      }
      // remove a resposta do assistente se ela ficou vazia (erro ou parada imediata)
      updateCurrent((c) => {
        const msgs = [...c.messages];
        if (msgs.length && msgs[msgs.length - 1].role === "assistant" && msgs[msgs.length - 1].content === "") {
          msgs.pop();
        }
        return { ...c, messages: msgs };
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function send(text: string) {
    const rawContent = text.trim();
    if ((!rawContent && !attachedFile) || loading) return;
    if (status !== "online") {
      setError(`O ${ENGINE_NAME} não está conectado.`);
      return;
    }
    // Injeta conteúdo do arquivo no início da mensagem
    const content = attachedFile
      ? `Arquivo: ${attachedFile.name}\n\`\`\`\n${attachedFile.content.slice(0, 24_000)}\n\`\`\`\n\n${rawContent || "Resuma o conteúdo acima."}`
      : rawContent;

    const isFirst = messages.length === 0;
    const userMsg: Message = { role: "user", content };
    const history = [...messages, userMsg];
    updateCurrent((c) => ({
      ...c,
      title: isFirst ? (rawContent || attachedFile?.name || "Arquivo").slice(0, 40) : c.title,
      messages: [...c.messages, userMsg],
    }));
    setInput("");
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    runCompletion(history);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function regenerate() {
    if (loading || status !== "online") return;
    let lastUser = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUser = i;
        break;
      }
    }
    if (lastUser === -1) return;
    const history = messages.slice(0, lastUser + 1);
    updateCurrent((c) => ({ ...c, messages: history }));
    runCompletion(history);
  }

  function startEdit(index: number, content: string) {
    setEditingIndex(index);
    setEditText(content);
  }

  function submitEdit(index: number) {
    const content = editText.trim();
    if (!content || loading || status !== "online") return;
    const history: Message[] = [...messages.slice(0, index), { role: "user", content }];
    updateCurrent((c) => ({ ...c, messages: history }));
    setEditingIndex(null);
    runCompletion(history);
  }

  async function copyMessage(index: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsg(index);
      setTimeout(() => setCopiedMsg((v) => (v === index ? null : v)), 1600);
    } catch {}
  }

  function commitRename(id: string) {
    const t = renameText.trim();
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: t || c.title } : c)));
    setRenamingId(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  // ---- Atalhos de teclado globais ----
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA";

    // Esc → parar geração
    if (e.key === "Escape" && loading) {
      stop();
      return;
    }
    // ↑ → editar última mensagem do usuário (só quando input vazio e sem foco em campo)
    if (e.key === "ArrowUp" && !inInput && !loading && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          startEdit(i, messages[i].content);
          break;
        }
      }
      return;
    }
    // Ctrl/Cmd+K → foca busca da sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      const search = document.querySelector<HTMLInputElement>(".history-search input");
      if (search) { setSidebarOpen(true); setTimeout(() => search.focus(), 80); }
    }
  }, [loading, messages]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  // ---- Exportar conversa ----
  function exportMarkdown() {
    if (!current) return;
    const lines = [`# ${current.title}\n`];
    for (const m of current.messages) {
      lines.push(m.role === "user" ? `**Você:** ${m.content}` : `**Alpha1 Assistant:** ${m.content}`);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${current.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPrint() {
    window.print();
  }

  // ---- Anexar arquivo ----
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;

    setFileLoading(true);
    try {
      const content = await extractFileContent(file);
      setAttachedFile({ name: file.name, content });
    } catch {
      setAttachedFile({ name: file.name, content: `[Não foi possível extrair o conteúdo de ${file.name}]` });
    } finally {
      setFileLoading(false);
    }
  }

  async function extractFileContent(file: File): Promise<string> {
    const textTypes = [
      "text/", "application/json", "application/xml",
      "application/javascript", "application/typescript",
    ];
    // Arquivos de texto
    if (textTypes.some(t => file.type.startsWith(t)) || /\.(txt|md|csv|json|xml|js|ts|py|html|css|sql|yaml|yml|sh|log)$/i.test(file.name)) {
      return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsText(file);
      });
    }
    // PDF
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      return extractPdfText(file);
    }
    throw new Error("Tipo não suportado");
  }

  async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    // Importação dinâmica para não bloquear o bundle inicial
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    const maxPages = Math.min(pdf.numPages, 30); // limita 30 páginas
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" "));
    }
    return pages.join("\n\n");
  }

  // ---------- LOGIN SCREEN ----------
  if (authChecking) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo-alpha1.png" alt="Alpha 1" />
          <p>Carregando…</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo-alpha1.png" alt="Alpha 1" />
          <h1>{authMode === "login" ? "Entrar" : "Criar conta"}</h1>
          <p>
            {authMode === "login"
              ? "Entre com seu usuário e senha para usar o Alpha1 Assistant."
              : "Crie sua conta gratuita para usar o Alpha1 Assistant."}
          </p>
          <form onSubmit={authMode === "login" ? login : register}>
            <input
              value={usernameInput}
              onChange={(e) => { setUsernameInput(e.target.value); setLoginError(""); }}
              placeholder="Usuário"
              autoComplete="username"
              autoFocus
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setLoginError(""); }}
              placeholder="Senha"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
            />
            {authMode === "register" && (
              <input
                type="password"
                value={password2Input}
                onChange={(e) => { setPassword2Input(e.target.value); setLoginError(""); }}
                placeholder="Confirmar senha"
                autoComplete="new-password"
              />
            )}
            <button
              type="submit"
              disabled={
                !usernameInput.trim() || !passwordInput ||
                (authMode === "register" && !password2Input) || loggingIn
              }
            >
              {loggingIn
                ? authMode === "login" ? "Entrando…" : "Criando conta…"
                : authMode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          {loginError && <div className="login-error">{loginError}</div>}
          <div className="login-switch">
            {authMode === "login" ? (
              <>Não tem conta?{" "}
                <button onClick={() => { setAuthMode("register"); setLoginError(""); setPasswordInput(""); setPassword2Input(""); }}>
                  Criar conta
                </button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button onClick={() => { setAuthMode("login"); setLoginError(""); setPasswordInput(""); setPassword2Input(""); }}>
                  Entrar
                </button>
              </>
            )}
          </div>
          <a className="login-back" href="/">← Voltar ao início</a>
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
      {fileLoading && (
        <div className="file-loading">
          <span className="typing"><span/><span/><span/></span>
          Extraindo conteúdo do arquivo…
        </div>
      )}
      {attachedFile && (
        <div className="file-chip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span>{attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} aria-label="Remover arquivo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
      <div className="input-box">
        {/* Botão anexar arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.xml,.js,.ts,.py,.html,.css,.sql,.yaml,.yml,.sh,.log,.pdf"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          aria-label="Anexar arquivo"
          title="Anexar arquivo (PDF, texto, CSV…)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          placeholder={attachedFile ? "Adicione uma pergunta ou envie para resumir…" : "Envie uma mensagem para o Alpha1 Assistant"}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value);
            autoGrow();
          }}
          onKeyDown={onKeyDown}
        />
        {loading ? (
          <button className="send stop" onClick={stop} aria-label="Parar geração">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button className="send" onClick={() => send(input)} disabled={!input.trim() && !attachedFile} aria-label="Enviar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="disclaimer">Alpha1 Assistant pode cometer erros. Confira informações importantes.</div>
      <div className="kbd-hint">
        <span><kbd>↑</kbd> editar última mensagem</span>
        <span><kbd>Esc</kbd> parar</span>
        <span><kbd>⌘K</kbd> buscar</span>
      </div>
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
          <div className="history-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Buscar conversas"
            />
            {convSearch && (
              <button className="clear" onClick={() => setConvSearch("")} aria-label="Limpar busca">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="history-label">Conversas</div>
          {conversations
            .filter((c) =>
              (c.title || "Nova conversa").toLowerCase().includes(convSearch.trim().toLowerCase())
            )
            .map((c) =>
              renamingId === c.id ? (
                <div className="history-item renaming" key={c.id}>
                  <input
                    className="history-rename"
                    value={renameText}
                    autoFocus
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={() => commitRename(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename(c.id);
                      } else if (e.key === "Escape") {
                        setRenamingId(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  key={c.id}
                  className={`history-item${c.id === currentId ? " active" : ""}`}
                  onClick={() => {
                    setCurrentId(c.id);
                    setSidebarOpen(false);
                  }}
                  onDoubleClick={() => {
                    setRenamingId(c.id);
                    setRenameText(c.title || "");
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="title">{c.title || "Nova conversa"}</span>
                  <span
                    className="rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(c.id);
                      setRenameText(c.title || "");
                    }}
                    aria-label="Renomear"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="del" onClick={(e) => deleteChat(c.id, e)} aria-label="Excluir">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              )
            )}
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
            Alpha1 Assistant <small>{status === "online" ? modelLabel : "offline"}</small>
          </div>
          <div className={`conn ${status}`} title={`Status do ${ENGINE_NAME}`}>
            <span className="dot" />
            {status === "online" ? "Online" : status === "checking" ? "..." : "Offline"}
          </div>

          {/* Exportar (só quando há mensagens) */}
          {messages.length > 0 && (
            <div style={{ display: "flex", gap: 2 }}>
              <button className="export-btn" onClick={exportMarkdown} title="Exportar como Markdown">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                .md
              </button>
              <button className="export-btn" onClick={exportPrint} title="Exportar como PDF">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                PDF
              </button>
            </div>
          )}

          {/* Toggle tema */}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Alternar tema" title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </header>

        {status === "offline" && (
          <div className="engine-banner">
            <strong>O serviço de IA está indisponível no momento.</strong> Pode ser uma
            instabilidade temporária do servidor. Tente novamente em instantes; se persistir,
            avise o suporte de TI.
            <span className="engine-retry">
              <button onClick={checkEngine}>Tentar novamente</button>
            </span>
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
            <div className="scroll" ref={scrollRef} onScroll={onThreadScroll}>
              <div className="thread">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div className="row user" key={i}>
                      {editingIndex === i ? (
                        <div className="msg-edit">
                          <textarea
                            value={editText}
                            autoFocus
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                submitEdit(i);
                              } else if (e.key === "Escape") {
                                setEditingIndex(null);
                              }
                            }}
                          />
                          <div className="msg-edit-actions">
                            <button className="ghost" onClick={() => setEditingIndex(null)}>
                              Cancelar
                            </button>
                            <button className="primary" onClick={() => submitEdit(i)} disabled={!editText.trim()}>
                              Enviar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bubble">{m.content}</div>
                          {!loading && (
                            <button
                              className="msg-action edit"
                              onClick={() => startEdit(i, m.content)}
                              aria-label="Editar mensagem"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
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
                          <>
                            <MessageContent content={m.content} />
                            {loading && i === messages.length - 1 && (
                              <span className="stream-caret" aria-hidden="true" />
                            )}
                            {!loading && (
                              <div className="msg-actions">
                                <button
                                  className="msg-action"
                                  onClick={() => copyMessage(i, m.content)}
                                  aria-label="Copiar resposta"
                                >
                                  {copiedMsg === i ? (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      Copiado
                                    </>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                        <path d="M5 15V5a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      </svg>
                                      Copiar
                                    </>
                                  )}
                                </button>
                                {i === messages.length - 1 && (
                                  <button className="msg-action" onClick={regenerate} aria-label="Regenerar resposta">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Regenerar
                                  </button>
                                )}
                              </div>
                            )}
                          </>
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
            {showScrollDown && (
              <button className="scroll-down" onClick={scrollToBottom} aria-label="Rolar para o fim">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div className="composer-outer">{composer}</div>
          </>
        )}
      </main>
    </div>
  );
}

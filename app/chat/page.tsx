"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import hljs from "highlight.js/lib/common";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { APP_BUILD } from "../lib/build";

type Role = "user" | "assistant";
interface Source { title: string; url: string; }
interface Message {
  role: Role;
  content: string;
  /** Fontes da web usadas nesta resposta (quando a busca foi acionada). */
  sources?: Source[];
}
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model?: string; // modelo específico desta conversa
}

// Sugestões de ações do dia a dia — variam conforme o agente selecionado.
const SUGGESTIONS_BY_AGENT: Record<string, string[]> = {
  geral: [
    "Quais serviços a Squid Telecom oferece?",
    "Como funciona o suporte 24 horas?",
    "Como falar com um atendente humano?",
    "Quero indicar a Squid para um amigo",
  ],
  suporte: [
    "Minha internet está lenta hoje",
    "Minha internet caiu, e agora?",
    "Como deixar meu Wi-Fi mais forte?",
    "Como reiniciar o roteador do jeito certo?",
  ],
  comercial: [
    "Tem cobertura no meu endereço?",
    "Quais planos de fibra vocês têm?",
    "Quero fazer upgrade do meu plano",
    "Qual a diferença entre link dedicado e banda larga?",
  ],
  financeiro: [
    "Como tiro a 2ª via da minha fatura?",
    "Quando vence a minha fatura?",
    "Quais as formas de pagamento?",
    "Posso mudar a data de vencimento?",
  ],
  documentos: [
    "Monte uma proposta comercial de internet",
    "Planilha comparando 3 planos de fibra",
    "Gere um contrato de prestação de serviço",
    "Vou anexar um PDF; faça um resumo dele",
  ],
};
const suggestionsForAgent = (id: string) => SUGGESTIONS_BY_AGENT[id] || SUGGESTIONS_BY_AGENT.geral;

// Agentes especializados — o id é enviado ao /api/chat e foca o atendimento.
const AGENTS: { id: string; name: string; desc: string; icon: JSX.Element }[] = [
  {
    id: "geral", name: "Luna Geral", desc: "Dúvidas e atendimento geral",
    icon: (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  },
  {
    id: "suporte", name: "Suporte Técnico", desc: "Internet lenta, quedas, Wi-Fi",
    icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M3 8.5C6 6 9 4.8 12 4.8S18 6 21 8.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M6 12c2-1.8 4-2.6 6-2.6s4 .8 6 2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M9 15.5c1-.9 2-1.3 3-1.3s2 .4 3 1.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></svg>),
  },
  {
    id: "comercial", name: "Comercial", desc: "Planos, contratação e cobertura",
    icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M4 9l8-5 8 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  },
  {
    id: "financeiro", name: "Financeiro", desc: "Faturas, 2ª via e pagamento",
    icon: (<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M3 10h18" stroke="currentColor" strokeWidth="1.7"/><path d="M7 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>),
  },
  {
    id: "documentos", name: "Documentos", desc: "Planilhas e propostas na hora",
    icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 3v4h4M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  },
];

// Diferenciais da Luna vs. concorrentes (foco em resolver o dia a dia na hora).
const DIFERENCIAIS: { label: string; icon: JSX.Element }[] = [
  // Sem espera / sem fila (≠ call center)
  { label: "Resolve na hora, sem fila", icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>) },
  // 24h, todo dia (≠ horário comercial)
  { label: "24h, todos os dias", icon: (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
  // Conversa natural (≠ robô de menu/URA)
  { label: "Sem robô de menu", icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 4V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>) },
  // Autoatendimento (≠ precisar ligar e esperar)
  { label: "Resolve sem precisar ligar", icon: (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
];

// Histórico fica no dispositivo de cada usuário, com chave por usuário.
const storageKeyFor = (user: string) => `squid-conversations:${user}`;

function uid() {
  // ID criptograficamente único — evita colisão entre usuários (que, com a
  // proteção de IDOR no servidor, causaria no-op silencioso de sync).
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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

// Renderização de markdown com paridade big-tech:
// react-markdown + GFM (tabelas, listas de tarefas, ~strike~) + KaTeX (equações)
// + CodeBlock custom (highlight.js + botão copiar). Memoizado para não reparsear
// todas as mensagens a cada token durante o streaming.
// Cartão de planilha: detecta o bloco ```squid-sheet, mostra prévia e botão de
// download (.xlsx gerado em /api/spreadsheet). Durante o streaming o JSON pode
// estar incompleto — nesse caso mostramos "preparando".
function SheetCard({ json }: { json: string }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");

  let spec: { title?: string; sheets?: Array<{ name?: string; columns?: string[]; rows?: unknown[][] }> } | null = null;
  try { spec = JSON.parse(json); } catch { spec = null; }

  if (!spec || !Array.isArray(spec.sheets) || !spec.sheets.length) {
    return (
      <div className="sheet-card pending">
        <span className="typing"><span/><span/><span/></span>
        Preparando planilha…
      </div>
    );
  }

  const first = spec.sheets[0];
  const cols = first.columns || [];
  const previewRows = (first.rows || []).slice(0, 5);

  async function download() {
    setErr("");
    setDownloading(true);
    try {
      const res = await fetch("/api/spreadsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao gerar a planilha.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(spec!.title || "planilha").replace(/[^a-z0-9_\-]+/gi, "_").toLowerCase()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sheet-card">
      <div className="sheet-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
        <span className="sheet-title">{spec.title || "Planilha"}</span>
        <button className="sheet-dl" onClick={download} disabled={downloading} type="button">
          {downloading ? "Gerando…" : "Baixar .xlsx"}
        </button>
      </div>
      {cols.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {previewRows.map((r, ri) => (
                <tr key={ri}>{(r as unknown[]).map((v, ci) => <td key={ci}>{String(v)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(first.rows?.length || 0) > previewRows.length && (
        <div className="sheet-more">+{(first.rows!.length - previewRows.length)} linha(s) na planilha completa</div>
      )}
      {err && <div className="error">{err}</div>}
    </div>
  );
}

// Cartão de documento Word: detecta o bloco ```squid-doc, mostra prévia e
// botão de download (.docx gerado em /api/document).
function DocCard({ json }: { json: string }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");

  let spec: { title?: string; blocks?: Array<{ type?: string; text?: string; items?: string[]; columns?: string[] }> } | null = null;
  try { spec = JSON.parse(json); } catch { spec = null; }

  if (!spec || !Array.isArray(spec.blocks) || !spec.blocks.length) {
    return (
      <div className="sheet-card pending">
        <span className="typing"><span/><span/><span/></span>
        Preparando documento…
      </div>
    );
  }

  const blocks = spec.blocks;
  const headings = blocks.filter((b) => b.type === "heading").length;
  const tables = blocks.filter((b) => b.type === "table").length;

  async function download() {
    setErr("");
    setDownloading(true);
    try {
      const res = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao gerar o documento.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(spec!.title || "documento").replace(/[^a-z0-9_\-]+/gi, "_").toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sheet-card">
      <div className="sheet-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span className="sheet-title">{spec.title || "Documento"}</span>
        <button className="sheet-dl" onClick={download} disabled={downloading} type="button">
          {downloading ? "Gerando…" : "Baixar .docx"}
        </button>
      </div>
      <div className="sheet-more">
        {blocks.length} bloco(s){headings ? ` · ${headings} título(s)` : ""}{tables ? ` · ${tables} tabela(s)` : ""}
      </div>
      {err && <div className="error">{err}</div>}
    </div>
  );
}

/** Fecha cercas de código (```) ainda abertas durante o streaming, para o bloco
 *  não "piscar" entre inline e bloco enquanto o fechamento não chegou. */
function balanceCodeFences(text: string): string {
  const fences = (text.match(/```/g) || []).length;
  return fences % 2 === 1 ? text + "\n```" : text;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Divide um texto em nós, trocando [n] (n válido) por um link <a> para a fonte.
function splitCitations(text: string, sources: Source[]): any[] {
  const out: any[] = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= sources.length) {
      if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
      out.push({
        type: "element",
        tagName: "a",
        properties: {
          href: sources[n - 1].url,
          target: "_blank",
          rel: "noreferrer noopener",
          className: ["cite-ref"],
          title: sources[n - 1].title,
        },
        children: [{ type: "text", value: `[${n}]` }],
      });
      last = m.index + m[0].length;
    }
  }
  if (out.length === 0) return [{ type: "text", value: text }];
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

// Plugin rehype: ancora as citações [n] às fontes, sem tocar em código/links.
function rehypeCitations(sources?: Source[]) {
  return (tree: any) => {
    if (!sources || !sources.length) return;
    const walk = (node: any, skip: boolean) => {
      if (!node || !Array.isArray(node.children)) return;
      const next: any[] = [];
      for (const child of node.children) {
        if (child.type === "element") {
          const childSkip = skip || ["code", "pre", "a"].includes(child.tagName);
          walk(child, childSkip);
          next.push(child);
        } else if (child.type === "text" && !skip && /\[\d+\]/.test(child.value)) {
          next.push(...splitCitations(child.value, sources));
        } else {
          next.push(child);
        }
      }
      node.children = next;
    };
    walk(tree, false);
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const MessageContent = memo(function MessageContent({ content, sources }: { content: string; sources?: Source[] }) {
  const safe = balanceCodeFences(content);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeCitations(sources)]}
      components={{
        // Bloco de código → CodeBlock (com header de linguagem + copiar);
        // código inline → <code> normal.
        pre: ({ children }) => <>{children}</>,
        code({ className, children, ...rest }) {
          const match = /language-([\w-]+)/.exec(className || "");
          const text = String(children).replace(/\n$/, "");
          // Blocos especiais → cartões com prévia + download.
          if (match?.[1] === "squid-sheet") {
            return <SheetCard json={text} />;
          }
          if (match?.[1] === "squid-doc") {
            return <DocCard json={text} />;
          }
          if (match || text.includes("\n")) {
            return <CodeBlock code={text} lang={match?.[1] || ""} />;
          }
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        },
        // Links: sempre abrem em nova aba, sem vazar referrer.
        a: ({ href, children, className }) => {
          const ok = href && (href.startsWith("http://") || href.startsWith("https://"));
          return ok ? (
            <a href={href} className={className as string | undefined} target="_blank" rel="noreferrer noopener">{children}</a>
          ) : (
            <span>{children}</span>
          );
        },
        // Tabelas com wrapper para scroll horizontal.
        table: ({ children }) => (
          <div className="table-wrap"><table>{children}</table></div>
        ),
      }}
    >
      {safe}
    </ReactMarkdown>
  );
});

// Bloco "Fontes" estilo big-tech: chips numerados clicáveis com o domínio.
function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  const domain = (u: string) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
  };
  return (
    <div className="sources">
      <div className="sources-label">Fontes</div>
      <div className="sources-list">
        {sources.map((s, i) => (
          <a key={i} className="source-chip" href={s.url} target="_blank" rel="noreferrer noopener" title={s.title}>
            <span className="source-num">{i + 1}</span>
            <span className="source-domain">{domain(s.url)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

type EngineStatus = "checking" | "online" | "offline";

export default function ChatPage() {
  const [user, setUser] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(""); // nome de exibição do funcionário
  const [authChecking, setAuthChecking] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [status, setStatus] = useState<EngineStatus>("checking");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // colapso no desktop
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
  // Aviso de falha de sincronização com o servidor (some sozinho).
  const [syncWarning, setSyncWarning] = useState(false);
  // Nova versão publicada detectada → recarrega quando ocioso (ou via aviso).
  const [updateReady, setUpdateReady] = useState(false);

  // Tema escuro
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // Arquivo anexado
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webSearch, setWebSearch] = useState(false);
  // Ditado por voz (Web Speech API).
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // Agente especializado selecionado (foco do atendimento).
  const [agentId, setAgentId] = useState<string>("geral");
  // Modelo padrão (interno, não exposto ao usuário).
  const [globalModel, setGlobalModel] = useState<string>("");
  // Sync de conversas — um timer de debounce POR conversa (evita que edições
  // rápidas em conversas diferentes cancelem o sync umas das outras).
  const syncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Id da conversa que está gerando no momento (escrita direcionada + abort ao trocar).
  const generatingIdRef = useRef<string | null>(null);

  // Tema: carrega preferência salva e aplica no <html>
  useEffect(() => {
    const saved = localStorage.getItem("a1-theme") as "light" | "dark" | null;
    const preferred = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
    // Estado de colapso da sidebar (desktop)
    setSidebarCollapsed(localStorage.getItem("a1-sidebar-collapsed") === "1");
    // Agente selecionado anteriormente
    const savedAgent = localStorage.getItem("squid-agent");
    if (savedAgent && AGENTS.some((a) => a.id === savedAgent)) setAgentId(savedAgent);
  }, []);

  // Persiste o agente selecionado.
  useEffect(() => {
    localStorage.setItem("squid-agent", agentId);
  }, [agentId]);

  // Detecta suporte a ditado por voz (Web Speech API) e limpa ao desmontar.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  // Some o aviso de sync automaticamente após alguns segundos.
  useEffect(() => {
    if (!syncWarning) return;
    const t = setTimeout(() => setSyncWarning(false), 6000);
    return () => clearTimeout(t);
  }, [syncWarning]);

  // Auto-atualização: detecta quando há um build novo publicado comparando o
  // build do servidor (/api/version) com o build embutido neste bundle.
  useEffect(() => {
    let stop = false;
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!stop && data.build && data.build !== APP_BUILD) setUpdateReady(true);
      } catch { /* offline — ignora */ }
    }
    check();
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(check, 5 * 60 * 1000); // a cada 5 min
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  // Quando há versão nova E o usuário está ocioso (sem gerar, sem texto
  // digitado), recarrega sozinho — limpa o bundle antigo sem atrapalhar.
  useEffect(() => {
    if (updateReady && !loading && !input.trim()) {
      const t = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(t);
    }
  }, [updateReady, loading, input]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("a1-theme", next);
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("a1-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  // restaura sessão (cookie httpOnly) no carregamento
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => { setUser(d.user ?? null); setUserName(d.name || ""); })
      .catch(() => setUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  // Carrega conversas: servidor (fonte de verdade) com fallback para localStorage
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setCurrentId("");
      return;
    }
    async function loadConversations() {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const serverConvs: Conversation[] = (data.conversations || []).map(
            (c: { id: string; title: string; messages: Message[]; model?: string }) => ({
              id: c.id, title: c.title, messages: c.messages || [], model: c.model,
            })
          );
          if (serverConvs.length > 0) {
            setConversations(serverConvs);
            setCurrentId(serverConvs[0].id);
            // Atualiza cache local
            try { localStorage.setItem(storageKeyFor(user!), JSON.stringify(serverConvs)); } catch {}
            return;
          }
        }
      } catch { /* ignora erros de rede */ }
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(storageKeyFor(user!));
        if (raw) {
          const data: Conversation[] = JSON.parse(raw);
          if (data.length) { setConversations(data); setCurrentId(data[0].id); return; }
        }
      } catch {}
      const fresh = { id: uid(), title: "Nova conversa", messages: [] as Message[] };
      setConversations([fresh]);
      setCurrentId(fresh.id);
    }
    loadConversations();
  }, [user]);

  // Verifica a conexão com o serviço de IA via rota server-side (/api/status),
  // que fala com o provedor compatível com OpenAI (Hugging Face). A chave nunca
  // chega ao navegador — fica só nas variáveis de ambiente do servidor.
  async function checkEngine() {
    setStatus("checking");
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          // Nome do modelo NÃO é armazenado nem exibido.
          // Modelo padrão (não exposto ao usuário — sem troca de modelo).
          setGlobalModel((prev) => prev || data.defaultModelId || data.models?.[0]?.id || "");
          setStatus("online");
          return;
        }
      }
    } catch { /* cai para offline abaixo */ }
    setStatus("offline");
  }

  useEffect(() => {
    if (!user) return;
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (t) return;
      checkEngine();
      t = setInterval(checkEngine, 8000);
    };
    const stop = () => {
      if (t) { clearInterval(t); t = null; }
    };
    // Pausa o polling quando a aba está oculta (economiza requests ao provedor).
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Salva no localStorage (cache) e sincroniza com o servidor (debounced)
  useEffect(() => {
    if (user && conversations.length) {
      try { localStorage.setItem(storageKeyFor(user), JSON.stringify(conversations)); } catch {}
    }
  }, [conversations, user]);

  // POST/PATCH com 1 retry (backoff curto): reduz perda silenciosa de dados em
  // falhas transitórias de rede. Persiste o aviso só se o retry também falhar.
  async function persistConversation(url: string, method: "POST" | "PATCH", body: unknown) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) return true;
      } catch { /* tenta de novo */ }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }
    setSyncWarning(true);
    return false;
  }

  function syncConversationToServer(conv: Conversation) {
    const timers = syncTimersRef.current;
    const existing = timers.get(conv.id);
    if (existing) clearTimeout(existing);
    timers.set(
      conv.id,
      setTimeout(() => {
        timers.delete(conv.id);
        persistConversation(`/api/conversations/${conv.id}`, "PATCH", {
          title: conv.title, messages: conv.messages, model: conv.model ?? null,
        });
      }, 800)
    );
  }

  function createConversationOnServer(conv: Conversation) {
    persistConversation("/api/conversations", "POST", {
      id: conv.id, title: conv.title, messages: conv.messages, model: conv.model ?? null,
    });
  }

  function deleteConversationOnServer(id: string) {
    fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(() => {});
  }

  const current = conversations.find((c) => c.id === currentId);
  const messages = current?.messages ?? [];

  // Ao trocar de conversa enquanto uma geração está em curso, aborta o stream:
  // evita UI "travada em carregando" na conversa nova e streams órfãs em background.
  useEffect(() => {
    if (generatingIdRef.current && generatingIdRef.current !== currentId) {
      abortRef.current?.abort();
    }
  }, [currentId]);

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

  // Atualiza uma conversa por id explícito — usado durante o streaming para que
  // os tokens sempre caiam na conversa CORRETA, mesmo que o usuário troque de
  // conversa no meio da geração.
  function updateConv(id: string, updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function newChat() {
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) { setCurrentId(existingEmpty.id); }
    else {
      const fresh: Conversation = { id: uid(), title: "Nova conversa", messages: [], model: globalModel || undefined };
      setConversations((prev) => [fresh, ...prev]);
      setCurrentId(fresh.id);
      createConversationOnServer(fresh);
    }
    setSidebarOpen(false);
    setError("");
  }

  function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteConversationOnServer(id);
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh: Conversation = { id: uid(), title: "Nova conversa", messages: [] };
        setCurrentId(fresh.id);
        createConversationOnServer(fresh);
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
      setUserName(d.name || "");
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
    // Aborta geração pendente e limpa o cache local de conversas — em dispositivo
    // compartilhado, o próximo usuário não deve conseguir ler o histórico deste.
    abortRef.current?.abort();
    if (user) { try { localStorage.removeItem(storageKeyFor(user)); } catch {} }
    setConversations([]);
    setCurrentId("");
    setUser(null);
    setUserName("");
    setUsernameInput("");
    setPasswordInput("");
  }

  // Núcleo da geração: recebe o histórico (terminando numa msg do usuário),
  // anexa a resposta do assistente e faz o streaming. Usado por send/regenerar/editar.
  async function runCompletion(history: Message[], modelOverride?: string) {
    setError("");
    setLoading(true);
    autoScrollRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    // Conversa-alvo fixada no início: todos os tokens caem aqui, mesmo que o
    // usuário troque de conversa durante o streaming.
    const targetId = currentId;
    generatingIdRef.current = targetId;
    // Modelo da conversa atual (ou seletor global)
    const modelId = modelOverride || current?.model || globalModel || undefined;

    try {
      // Se busca na web ativa: o servidor planeja sub-queries a partir da
      // pergunta, busca em paralelo, deduplica e lê as páginas.
      let searchResults: Array<{ title: string; url: string; description: string; content?: string }> = [];
      let searchQuery = "";
      if (webSearch) {
        const lastUser = [...history].reverse().find((m) => m.role === "user");
        if (lastUser) {
          // Envia a pergunta mais completa (o planejador usa o contexto inteiro).
          searchQuery = lastUser.content.replace(/```[\s\S]*?```/g, "").trim().slice(0, 500);
          try {
            const sr = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
              signal: controller.signal,
            });
            if (sr.ok) {
              const sd = await sr.json();
              searchResults = sd.results || [];
            }
          } catch { /* falha silenciosa — chat continua sem busca */ }
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, model: modelId, searchResults, searchQuery, agent: agentId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let msg = "Falha ao gerar a resposta. Tente novamente.";
        try {
          const e = await res.json();
          if (e?.error) msg = e.error;
        } catch {}
        throw new Error(msg);
      }

      // Fontes (título + url) anexadas à resposta para exibir as citações.
      const sources: Source[] = searchResults
        .filter((r) => r.url)
        .map((r) => ({ title: r.title || r.url, url: r.url }));
      updateConv(targetId, (c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: "", ...(sources.length ? { sources } : {}) }],
      }));

      // Buffer de tokens com flush via requestAnimationFrame: em vez de um
      // setState (e re-parse de markdown) por token, acumulamos e aplicamos no
      // máximo ~1x por frame. Reduz lag/flicker em respostas longas com código.
      let pending = "";
      let rafId: number | null = null;
      const flush = () => {
        rafId = null;
        if (!pending) return;
        const add = pending;
        pending = "";
        updateConv(targetId, (c) => {
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (!last || last.role !== "assistant") return c;
          // Preserva campos como `sources` (citações) ao anexar tokens.
          msgs[msgs.length - 1] = { ...last, content: last.content + add };
          return { ...c, messages: msgs };
        });
      };
      const scheduleFlush = () => {
        if (rafId != null) return;
        rafId =
          typeof requestAnimationFrame !== "undefined"
            ? requestAnimationFrame(flush)
            : (setTimeout(flush, 16) as unknown as number);
      };

      // A rota /api/chat devolve os tokens em TEXTO PURO (já parseou o SSE do
      // upstream), então é só decodificar e anexar cada pedaço.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) { pending += chunk; scheduleFlush(); }
        }
      } finally {
        // Garante que o último pedaço seja aplicado.
        if (rafId != null && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(rafId);
        flush();
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      }
      // remove a resposta do assistente se ela ficou vazia (erro ou parada imediata)
      updateConv(targetId, (c) => {
        const msgs = [...c.messages];
        if (msgs.length && msgs[msgs.length - 1].role === "assistant" && msgs[msgs.length - 1].content === "") {
          msgs.pop();
        }
        return { ...c, messages: msgs };
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
      generatingIdRef.current = null;
      // Sync da conversa-alvo (não a "atual", que pode ter mudado durante o stream)
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === targetId);
        if (conv) syncConversationToServer(conv);
        return prev;
      });
    }
  }

  function send(text: string) {
    const rawContent = text.trim();
    if ((!rawContent && !attachedFile) || loading) return;
    if (status !== "online") {
      setError("A Luna está offline no momento. Tente novamente em instantes.");
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
    setConversations((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, title: t || c.title };
      syncConversationToServer(updated);
      return updated;
    }));
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
      lines.push(m.role === "user" ? `**Você:** ${m.content}` : `**Luna:** ${m.content}`);
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
    // Word (.docx)
    if (/\.docx$/i.test(file.name) ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return extractDocxText(file);
    }
    // Excel (.xlsx)
    if (/\.xlsx$/i.test(file.name) ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return extractXlsxText(file);
    }
    throw new Error("Tipo não suportado");
  }

  // Lê .docx → texto puro (mammoth, build de browser para não puxar deps Node).
  async function extractDocxText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  // Lê .xlsx → cada aba vira uma tabela markdown (exceljs, build de browser).
  async function extractXlsxText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const ExcelJS = (await import("exceljs")).default as typeof import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const MAX_ROWS = 200; // teto por aba para não estourar o contexto
    const out: string[] = [];
    wb.eachSheet((ws) => {
      const rows: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        if (rows.length >= MAX_ROWS) return;
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value as unknown;
          let text = "";
          if (v == null) text = "";
          else if (typeof v === "object" && "text" in (v as Record<string, unknown>)) {
            text = String((v as { text: unknown }).text ?? "");
          } else if (typeof v === "object" && "result" in (v as Record<string, unknown>)) {
            text = String((v as { result: unknown }).result ?? ""); // fórmula → valor
          } else {
            text = String(v);
          }
          cells.push(text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim());
        });
        rows.push(cells);
      });
      if (!rows.length) return;
      out.push(`## ${ws.name}`);
      const width = Math.max(...rows.map((r) => r.length));
      const pad = (r: string[]) => { while (r.length < width) r.push(""); return r; };
      const header = pad([...rows[0]]);
      out.push(`| ${header.join(" | ")} |`);
      out.push(`| ${header.map(() => "---").join(" | ")} |`);
      for (const r of rows.slice(1)) out.push(`| ${pad([...r]).join(" | ")} |`);
      out.push("");
    });
    return out.join("\n") || "[Planilha vazia]";
  }

  async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    // Importação dinâmica para não bloquear o bundle inicial
    const pdfjsLib = await import("pdfjs-dist");
    // Worker servido localmente a partir de /public (same-origin) — sem CDN
    // externa, funciona offline e sob CSP estrita. O arquivo é copiado de
    // node_modules/pdfjs-dist/build/pdf.worker.min.mjs (ver scripts/sync-pdf-worker).
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
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
          <img src="/logo-squid.png" alt="Squid Telecom" />
          <p>Carregando…</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo-squid.png" alt="Squid Telecom" />
          <h1>Entrar</h1>
          <p>Entre com seu e-mail e senha para usar a Luna.</p>
          <form onSubmit={login}>
            <input
              type="email"
              value={usernameInput}
              onChange={(e) => { setUsernameInput(e.target.value); setLoginError(""); }}
              placeholder="E-mail"
              autoComplete="email"
              autoFocus
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setLoginError(""); }}
              placeholder="Senha"
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={!usernameInput.trim() || !passwordInput || loggingIn}
            >
              {loggingIn ? "Entrando…" : "Entrar"}
            </button>
          </form>
          {loginError && <div className="login-error">{loginError}</div>}
          <p className="login-help">
            Acesso restrito aos funcionários da Squid Telecom. Sem acesso? Fale com o administrador.
          </p>
          <a className="login-back" href="/manual">📘 Como usar a Squid (manual)</a>
          <a className="login-back" href="/">← Voltar ao início</a>
        </div>
      </div>
    );
  }

  const waitingForFirstToken =
    loading && (messages.length === 0 || messages[messages.length - 1].role === "user");
  const displayLabel = userName || user;
  const firstName = (userName || user).split(/[\s@.]/)[0];
  const initial = displayLabel.trim().charAt(0).toUpperCase() || "U";

  // Liga/desliga o ditado por voz. Transcreve para o campo de mensagem em pt-BR.
  function toggleVoice() {
    if (listening) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    // Texto já digitado é preservado; a fala é anexada a ele.
    const base = input.trim() ? input.trim() + " " : "";
    rec.onstart = () => setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (ev: any) => {
      setListening(false);
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
        setError("Permita o acesso ao microfone para usar o ditado por voz.");
      }
    };
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(base + transcript);
      requestAnimationFrame(autoGrow);
    };
    try { rec.start(); } catch { /* já iniciado */ }
  }

  const agentBar = (
    <div className="agent-bar" aria-label="Escolha o agente">
      {AGENTS.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`agent-pill${agentId === a.id ? " active" : ""}`}
          onClick={() => setAgentId(a.id)}
          title={a.desc}
          aria-pressed={agentId === a.id}
        >
          <span className="agent-pill-ico">{a.icon}</span>
          {a.name}
        </button>
      ))}
    </div>
  );

  const composer = (
    <div className="composer">
      {agentBar}
      {error && <div className="error">{error}</div>}
      {fileLoading && (
        <div className="file-loading">
          <span className="typing"><span/><span/><span/></span>
          Extraindo conteúdo do arquivo…
        </div>
      )}
      {webSearch && (
        <div className="web-search-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Busca na web ativa — a próxima resposta incluirá resultados da internet
          <button onClick={() => setWebSearch(false)}>✕</button>
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
          accept=".txt,.md,.csv,.json,.xml,.js,.ts,.py,.html,.css,.sql,.yaml,.yml,.sh,.log,.pdf,.docx,.xlsx"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        {/* Botão busca na web */}
        <button
          className={`attach-btn${webSearch ? " active" : ""}`}
          onClick={() => setWebSearch((v) => !v)}
          disabled={loading}
          aria-label="Buscar na internet"
          title={webSearch ? "Busca na web ativa — clique para desativar" : "Ativar busca na web"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Botão de voz (ditado) — só quando o navegador suporta */}
        {voiceSupported && (
          <button
            className={`attach-btn${listening ? " listening" : ""}`}
            onClick={toggleVoice}
            disabled={loading}
            aria-label={listening ? "Parar ditado" : "Falar a mensagem"}
            aria-pressed={listening}
            title={listening ? "Ouvindo… clique para parar" : "Falar a mensagem (ditado por voz)"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Botão anexar arquivo */}
        <button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          aria-label="Anexar arquivo"
          title="Anexar arquivo (PDF, Word, Excel, texto, CSV…)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          placeholder={attachedFile ? "Adicione uma pergunta ou envie para resumir…" : "Envie uma mensagem para a Luna"}
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
      <div className="disclaimer">A Luna pode cometer erros. Confira informações importantes.</div>
      <div className="kbd-hint">
        <span><kbd>↑</kbd> editar última mensagem</span>
        <span><kbd>Esc</kbd> parar</span>
        <span><kbd>⌘K</kbd> buscar</span>
      </div>
    </div>
  );

  return (
    <div className={`layout${sidebarOpen ? " sidebar-open" : ""}${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <div className="overlay" onClick={() => setSidebarOpen(false)} />

      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <img src="/logo-squid.png" alt="Squid Telecom" />
            <span>Luna</span>
            <button
              className="collapse-btn"
              onClick={toggleSidebarCollapsed}
              aria-label="Recolher menu"
              title="Recolher menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M9 4v16" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M14 9l-2 3 2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
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
              <span className="name-line" title={displayLabel}>{displayLabel}</span>
              <small title={userName ? user : undefined}>{userName ? user : "Funcionário Squid Telecom"}</small>
            </span>
            <button className="logout-btn" onClick={logout} aria-label="Sair" title="Sair">
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
          {/* Reabrir sidebar quando colapsada (desktop) */}
          <button className="icon-btn expand-toggle" onClick={toggleSidebarCollapsed} aria-label="Expandir menu" title="Expandir menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M9 4v16" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 9l2 3-2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="model">
            <span className="brand-name">Luna</span>
            {/* Nome do modelo NÃO é exibido — apenas o status de conexão. */}
            <small>{status === "online" ? "Online" : "Offline"}</small>
          </div>
          <div className={`conn ${status}`} title="Status da conexão">
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
                <span className="btn-label">.md</span>
              </button>
              <button className="export-btn" onClick={exportPrint} title="Exportar como PDF">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                <span className="btn-label">PDF</span>
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

        {syncWarning && (
          <div className="engine-banner" role="status">
            <strong>Não foi possível salvar no servidor.</strong> Sua conversa está
            guardada neste dispositivo e tentaremos sincronizar novamente.
          </div>
        )}

        {updateReady && (
          <div className="engine-banner" role="status">
            <strong>Nova versão disponível.</strong> Será atualizada automaticamente
            quando você terminar.
            <span className="engine-retry">
              <button onClick={() => window.location.reload()}>Atualizar agora</button>
            </span>
          </div>
        )}

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
            <img src="/logo-squid.png" alt="Squid Telecom" />
            <h1>Olá, {firstName}</h1>
            <p className="greeting-sub">Como a Luna pode ajudar você hoje?</p>
            <div className="diferenciais">
              {DIFERENCIAIS.map((d) => (
                <span className="dif-badge" key={d.label}>
                  <span className="dif-ico">{d.icon}</span>
                  {d.label}
                </span>
              ))}
            </div>
            <div className="composer-wrap">
              {composer}
              <div className="chips">
                {suggestionsForAgent(agentId).map((s) => (
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
                        <img src="/logo-squid.png" alt="A1" />
                      </div>
                      <div className="content">
                        <div className="name">Luna</div>
                        {m.content === "" ? (
                          <span className="typing">
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : (
                          <>
                            <MessageContent content={m.content} sources={m.sources} />
                            {m.sources && m.sources.length > 0 && <Sources sources={m.sources} />}
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
                      <img src="/logo-squid.png" alt="A1" />
                    </div>
                    <div className="content">
                      <div className="name">Luna</div>
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

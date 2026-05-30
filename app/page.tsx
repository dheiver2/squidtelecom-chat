"use client";

import { useState } from "react";
import { ENGINE_NAME, ENGINE_DOWNLOAD_URL, setupCommands } from "./lib/mangaba";

function CodeLine({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-line">
      <code>{cmd}</code>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(cmd);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

export default function Landing() {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://alpha1-chat.vercel.app";
  const cmd = setupCommands(origin);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-brand">
          <img src="/logo-alpha1.png" alt="Alpha 1" />
          <span>Alpha1 Assistant</span>
        </div>
        <a className="lp-btn-outline" href="/chat">
          Entrar
        </a>
      </header>

      <section className="lp-hero">
        <div className="lp-badge">IA 100% gratuita e local com {ENGINE_NAME}</div>
        <h1>
          Seu assistente de IA, <span>privado</span> e sem custos
        </h1>
        <p>
          O Alpha1 Assistant roda na sua própria máquina com o {ENGINE_NAME}. Suas conversas nunca
          saem do seu computador. Sem mensalidade, sem chave de API, sem limites.
        </p>
        <div className="lp-cta">
          <a className="lp-btn" href="#instalar">
            Como começar
          </a>
          <a className="lp-btn-ghost" href="/chat">
            Já instalei, entrar →
          </a>
        </div>
      </section>

      <section className="lp-features">
        <div className="lp-card">
          <div className="lp-ico">🔒</div>
          <h3>Privado</h3>
          <p>A IA roda localmente. Nenhuma mensagem é enviada para servidores externos.</p>
        </div>
        <div className="lp-card">
          <div className="lp-ico">💸</div>
          <h3>Gratuito</h3>
          <p>Sem assinatura e sem chave de API paga. O {ENGINE_NAME} é open-source e grátis.</p>
        </div>
        <div className="lp-card">
          <div className="lp-ico">⚡</div>
          <h3>Sem limites</h3>
          <p>Converse à vontade. A velocidade depende apenas do seu computador.</p>
        </div>
      </section>

      <section className="lp-steps" id="instalar">
        <h2>Comece em 3 passos</h2>
        <p className="lp-sub">Você só precisa fazer isso uma vez.</p>

        <div className="lp-step">
          <div className="lp-num">1</div>
          <div className="lp-step-body">
            <h3>Instale o {ENGINE_NAME}</h3>
            <p>Disponível para macOS, Windows e Linux. É rápido e gratuito.</p>
            <a className="lp-btn" href={ENGINE_DOWNLOAD_URL} target="_blank" rel="noreferrer">
              Baixar o {ENGINE_NAME}
            </a>
            <p className="lp-hint">
              O {ENGINE_NAME} é executado pelo motor open-source <code>Ollama</code>.
            </p>
          </div>
        </div>

        <div className="lp-step">
          <div className="lp-num">2</div>
          <div className="lp-step-body">
            <h3>Baixe o modelo Mangaba 1</h3>
            <p>Abra o Terminal (ou Prompt de Comando) e rode:</p>
            <CodeLine cmd={cmd.pull} />
            <CodeLine cmd={cmd.brand} />
          </div>
        </div>

        <div className="lp-step">
          <div className="lp-num">3</div>
          <div className="lp-step-body">
            <h3>Inicie o {ENGINE_NAME} liberando o acesso do navegador</h3>
            <p>
              Para que a plataforma converse com o {ENGINE_NAME} no seu computador, inicie-o assim
              (mantenha esse terminal aberto enquanto usar):
            </p>
            <CodeLine cmd={cmd.serve} />
            <p className="lp-hint">
              No Windows (PowerShell): <code>{cmd.serveWindows}</code>
            </p>
          </div>
        </div>

        <div className="lp-finish">
          <a className="lp-btn lp-btn-lg" href="/chat">
            Entrar na plataforma →
          </a>
          <p>A plataforma detecta o {ENGINE_NAME} automaticamente assim que ele estiver rodando.</p>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-brand">
          <img src="/logo-alpha1.png" alt="Alpha 1" />
          <span>Alpha 1 Consultoria</span>
        </div>
        <p>Telecomunicações · Gestão · Tecnologia da Informação — atendimento em todo o Brasil.</p>
        <p className="lp-copy">© 2026 Alpha 1. Assistente de IA com tecnologia {ENGINE_NAME}.</p>
      </footer>
    </div>
  );
}

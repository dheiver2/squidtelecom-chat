"use client";

import { useEffect, useState } from "react";

const SITE = "https://www.instagram.com/squidtelecom/";
const WHATSAPP = "https://wa.me/5511999999999";
const INSTAGRAM = "https://www.instagram.com/squidtelecom/";
const LINKEDIN = "https://www.linkedin.com/company/squidtelecom/";

// Persona do assistente apresentado na landing.
const ASSISTENTE = "Luna";
const ASSISTENTE_FULL = "Luna";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={`site${menuOpen ? " menu-active" : ""}`}>
      <header className="site-header">
        <nav className="site-navbar">
          <button
            className="nav-toggle"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="hamburger" />
          </button>

          <a href={SITE} className="navbar-logo">
            <img src="/logo-squid.svg" alt="Squid Telecom" className="logo-img" />
          </a>

          <ul className="nav-list">
            <li className="nav-item">
              <a href={`${SITE}/index.html`} className="nav-link">
                Home
              </a>
            </li>
            <li className="nav-item">
              <a href={`${SITE}/servicos.html`} className="nav-link">
                Nossos Serviços
              </a>
            </li>
            <li className="nav-item">
              <a href={`${SITE}/sobre.html`} className="nav-link">
                Sobre
              </a>
            </li>
            <li className="nav-item">
              <a href={`${SITE}/contato.html`} className="nav-link">
                Contato
              </a>
            </li>
            <li className="nav-item">
              <a href="/manual" className="nav-link">
                Manual
              </a>
            </li>
            <li className="nav-item">
              <a href="/chat" className="nav-link nav-link-cta">
                Entrar
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="hero">
        <div className="hero-decor" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="grid-overlay" />
        </div>

        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-badge">
              <span className="hero-badge-dot" />
              {ASSISTENTE} · Assistente de IA da Squid Telecom
            </span>

            <h1 className="hero-title">
              Conheça a <span className="hero-highlight">{ASSISTENTE}</span>, a assistente de IA da Squid Telecom
            </h1>

            <p className="hero-lead">
              A {ASSISTENTE} é a inteligência artificial da Squid Telecom: treinada no universo de
              telecomunicações, gestão e tecnologia da informação da empresa. Ela atende a sua equipe e
              os seus clientes em linguagem natural — privada, especializada e disponível 24 horas.
            </p>

            <div className="hero-cta">
              <a className="btn-primary btn-lg" href="/chat">
                Conversar com a {ASSISTENTE}
                <span className="btn-arrow">→</span>
              </a>
              <a className="btn-ghost btn-lg" href={WHATSAPP} target="_blank" rel="noreferrer">
                Falar com a Squid Telecom
              </a>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">24h</span>
                <span className="hero-stat-label">Disponível sempre</span>
              </div>
              <span className="hero-stat-sep" />
              <div className="hero-stat">
                <span className="hero-stat-num">100%</span>
                <span className="hero-stat-label">Privado e seguro</span>
              </div>
              <span className="hero-stat-sep" />
              <div className="hero-stat">
                <span className="hero-stat-num">Sob medida</span>
                <span className="hero-stat-label">Para a Squid Telecom</span>
              </div>
            </div>
          </div>

          {/* Mockup de conversa */}
          <div className="hero-visual">
            <div className="chat-mock">
              <div className="chat-mock-bar">
                <span className="chat-mock-dots">
                  <i /><i /><i />
                </span>
                <span className="chat-mock-title">{ASSISTENTE_FULL}</span>
                <span className="chat-mock-online">
                  <span className="dot" /> Online
                </span>
              </div>
              <div className="chat-mock-body">
                <div className="mock-bubble mock-bot">
                  Oi! Sou a {ASSISTENTE}, assistente da Squid Telecom. Como posso ajudar você hoje?
                </div>
                <div className="mock-bubble mock-user">
                  Quais serviços de telecom a Squid Telecom oferece?
                </div>
                <div className="mock-bubble mock-bot mock-typing">
                  <span className="typing">
                    <i /><i /><i />
                  </span>
                </div>
              </div>
              <div className="chat-mock-input">
                <span>Pergunte alguma coisa…</span>
                <span className="chat-mock-send">→</span>
              </div>
            </div>
            <div className="mock-float mock-float-1">
              <span className="mock-float-icon">🔒</span> Dados privados
            </div>
            <div className="mock-float mock-float-2">
              <span className="mock-float-icon">⚡</span> Resposta instantânea
            </div>
          </div>
        </div>
      </section>

      <main className="site-main">
        {/* ===================== CONHEÇA A MARINA ===================== */}
        <section className="marina reveal">
          <div className="marina-photo">
            <img
              src="/logo-squid.svg"
              alt="Luna, assistente virtual da Squid Telecom"
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
                img.parentElement?.classList.add("no-img");
              }}
            />
            <span className="marina-photo-fallback" aria-hidden="true">L</span>
            <span className="marina-photo-badge">
              <span className="dot" /> Online agora
            </span>
          </div>

          <div className="marina-copy">
            <p className="eyebrow">Quem é a {ASSISTENTE}</p>
            <h2 className="titulo-secao">
              Sua especialista virtual na <span>Squid Telecom</span>
            </h2>
            <p className="marina-lead">
              A {ASSISTENTE} é a assistente de inteligência artificial da Squid Telecom. Ela conhece
              os serviços de telecomunicações, gestão e TI da empresa e responde em português, de forma
              clara e profissional — como uma colega de equipe que nunca tira folga.
            </p>
            <ul className="marina-list">
              <li>Tira dúvidas sobre serviços, processos e atendimento</li>
              <li>Pesquisa na web e cita as fontes</li>
              <li>Gera planilhas (.xlsx) e documentos (.docx) na hora</li>
              <li>Lê PDFs, Word e Excel que você anexar</li>
            </ul>
            <a className="btn-primary btn-lg" href="/chat">
              Conversar com a {ASSISTENTE} <span className="btn-arrow">→</span>
            </a>
          </div>
        </section>

        {/* ===================== VANTAGENS ===================== */}
        <section className="vantagens reveal">
          <p className="eyebrow">Por que a {ASSISTENTE}</p>
          <h2 className="titulo-secao">
            Uma assistente <span>feita sob medida</span> para a Squid Telecom
          </h2>

          <div className="vantagens-lista">
            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V5l7-3z"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Privado e seguro</h3>
              <p>As conversas ficam no ambiente da Squid Telecom, sem expor dados a serviços de terceiros.</p>
            </div>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3l2.09 4.26L18.8 8l-3.4 3.32.8 4.68L12 13.8 7.8 16l.8-4.68L5.2 8l4.71-.74L12 3z"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Personalizada</h3>
              <p>A {ASSISTENTE} é treinada com o conhecimento, os serviços e a linguagem da Squid Telecom.</p>
            </div>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8" />
                  <path
                    d="M12 7v5l3.5 2"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Disponível 24h</h3>
              <p>A {ASSISTENTE} responde sua equipe e seus clientes com rapidez e especialização, a qualquer hora.</p>
            </div>
          </div>
        </section>

        {/* ===================== COMO FUNCIONA ===================== */}
        <section className="passos reveal" id="como-funciona">
          <p className="eyebrow">Simples assim</p>
          <h2 className="titulo-secao">
            Como <span>funciona</span>
          </h2>
          <p className="passos-sub">Sem instalação. Você entra e já começa a conversar.</p>

          <div className="passos-lista">
            <div className="passo">
              <div className="passo-num">1</div>
              <div className="passo-body">
                <h3>Acesse a plataforma</h3>
                <p>Entre com o seu usuário e senha. Não é preciso instalar nada nem configurar chaves.</p>
              </div>
            </div>

            <div className="passo">
              <div className="passo-num">2</div>
              <div className="passo-body">
                <h3>Pergunte à {ASSISTENTE}</h3>
                <p>
                  Fale sobre serviços, processos e atendimento da Squid Telecom em linguagem natural — a{" "}
                  {ASSISTENTE} entende o contexto do seu negócio e ainda gera planilhas e documentos.
                </p>
              </div>
            </div>

            <div className="passo">
              <div className="passo-num">3</div>
              <div className="passo-body">
                <h3>Receba respostas especializadas</h3>
                <p>Orientações claras e contextualizadas, prontas para usar com a sua equipe e clientes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== TELAS / EM AÇÃO ===================== */}
        <section className="screens reveal">
          <p className="eyebrow">Veja a Luna em ação</p>
          <h2 className="titulo-secao">
            Do pedido à <span>entrega pronta</span>
          </h2>

          <div className="browser-frame">
            <div className="browser-bar">
              <span className="bdot r" /><span className="bdot y" /><span className="bdot g" />
              <span className="burl">squid-ia.online/chat</span>
            </div>
            <div className="browser-body">
              <div className="sc-row sc-user"><div className="sc-bubble">Monte uma planilha de custos do projeto com 3 itens e total.</div></div>
              <div className="sc-row sc-bot">
                <span className="sc-ava">L</span>
                <div className="sc-content">
                  <p>Claro! Segue a planilha de custos com os itens e o total calculado:</p>
                  <div className="sc-card">
                    <div className="sc-card-head">
                      <span className="sc-card-ico">▦</span>
                      <span className="sc-card-title">Custos do Projeto</span>
                      <span className="sc-card-btn">Baixar .xlsx</span>
                    </div>
                    <table className="sc-table">
                      <thead><tr><th>Item</th><th>Qtd</th><th>Valor Unit</th><th>Total</th></tr></thead>
                      <tbody>
                        <tr><td>Notebook</td><td>2</td><td>R$ 3.500</td><td>R$ 7.000</td></tr>
                        <tr><td>Switch 24p</td><td>1</td><td>R$ 1.200</td><td>R$ 1.200</td></tr>
                        <tr><td>Licença SW</td><td>5</td><td>R$ 200</td><td>R$ 1.000</td></tr>
                        <tr className="sc-total"><td>TOTAL</td><td></td><td></td><td>R$ 9.200</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="screens-feats">
            <span>📊 Planilhas .xlsx</span>
            <span>📄 Documentos .docx</span>
            <span>🔎 Busca com fontes</span>
            <span>📎 Lê PDF, Word e Excel</span>
          </div>
        </section>

        {/* ===================== CTA BAND ===================== */}
        <section className="cta-band reveal">
          <div className="cta-band-decor" aria-hidden="true">
            <span className="orb orb-3" />
          </div>
          <div className="cta-band-inner">
            <h2>Pronto para conversar com a {ASSISTENTE}?</h2>
            <p>A assistente de IA da Squid Telecom, sempre que você precisar.</p>
            <a className="btn-light btn-lg" href="/chat">
              Conversar com a {ASSISTENTE} <span className="btn-arrow">→</span>
            </a>
          </div>
        </section>
      </main>

      <a
        href={WHATSAPP}
        className="whatsapp-button"
        target="_blank"
        rel="noreferrer"
        title="Fale conosco no WhatsApp"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.13h-.01c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 01-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01s-.43.06-.66.31c-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
        </svg>
      </a>

      <footer className="site-footer">
        <div className="footer-info">
          <div className="footer-brand">
            <img src="/logo-squid.svg" alt="Squid Telecom" />
          </div>
          <p className="footer-tagline">
            Telecomunicações · Gestão · Tecnologia da Informação — atendimento em todo o Brasil.
          </p>
          <div className="social-links">
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="social-link" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="1.8" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
              </svg>
            </a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="social-link" aria-label="WhatsApp">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.52 11.97c-.21.58-1.2 1.11-1.68 1.18-.43.06-.97.09-1.56-.1-.36-.11-.82-.26-1.41-.52-2.49-1.07-4.12-3.57-4.24-3.74-.12-.16-1.01-1.34-1.01-2.56 0-1.22.63-1.82.86-2.07.23-.25.5-.31.66-.31s.34 0 .48.01c.15.01.36-.05.56.43.2.5.7 1.72.76 1.84.06.12.1.26.02.43-.09.16-.13.27-.25.41-.12.14-.26.32-.37.43-.12.13-.25.26-.11.51.15.25.64 1.06 1.38 1.72.94.84 1.74 1.11 1.99 1.23.25.13.4.11.54-.06.14-.16.62-.72.78-.97.17-.25.33-.21.56-.13.22.09 1.44.69 1.69.81.25.12.41.18.47.28.07.11.07.6-.14 1.18z" />
              </svg>
            </a>
            <a href={LINKEDIN} target="_blank" rel="noreferrer" className="social-link" aria-label="LinkedIn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M4.98 3.5a2.5 2.5 0 11-.02 5.01A2.5 2.5 0 014.98 3.5zM3 8.98h4V21H3V8.98zM9.5 8.98h3.84v1.64h.05c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.14V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21h-4V8.98z" />
              </svg>
            </a>
          </div>
          <p className="footer-copy">© 2026 Squid Telecom. {ASSISTENTE_FULL} — assistente de IA corporativa.</p>
        </div>
      </footer>
    </div>
  );
}

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
            <img src="/logo-squid.png" alt="Squid Telecom" className="logo-img" />
          </a>

          <ul className="nav-list">
            <li className="nav-item">
              <a href="#home" className="nav-link" onClick={() => setMenuOpen(false)}>
                Home
              </a>
            </li>
            <li className="nav-item">
              <a href="#servicos" className="nav-link" onClick={() => setMenuOpen(false)}>
                Nossos Serviços
              </a>
            </li>
            <li className="nav-item">
              <a href="#sobre" className="nav-link" onClick={() => setMenuOpen(false)}>
                Sobre
              </a>
            </li>
            <li className="nav-item">
              <a href="#contato" className="nav-link" onClick={() => setMenuOpen(false)}>
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
      <section className="hero" id="home">
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
              Converse com a <span className="hero-highlight">{ASSISTENTE}</span>, a IA da Squid Telecom
            </h1>

            <p className="hero-lead">
              A inteligência artificial da Squid Telecom. Atende sua equipe e seus clientes em
              linguagem natural — privada, especializada e disponível 24 horas.
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
              <span className="mock-float-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              Dados privados
            </div>
            <div className="mock-float mock-float-2">
              <span className="mock-float-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </span>
              Resposta instantânea
            </div>
          </div>
        </div>
      </section>

      <main className="site-main">
        {/* ===================== CONHEÇA A MARINA ===================== */}
        <section className="marina reveal">
          <div className="marina-photo">
            <img
              src="/logo-squid.png"
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

        {/* ===================== NOSSOS SERVIÇOS ===================== */}
        <section className="vantagens reveal" id="servicos">
          <p className="eyebrow">Nossos serviços</p>
          <h2 className="titulo-secao">
            Internet e conectividade <span>de verdade, em Alagoas</span>
          </h2>
          <p className="passos-sub">
            Fibra óptica e conectividade corporativa para residências e empresas de Alagoas.
          </p>

          <div className="vantagens-lista">
            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M2 8.5C5.5 5 9.5 3.5 12 3.5S18.5 5 22 8.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M5 12c2.5-2.3 5-3.3 7-3.3s4.5 1 7 3.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M8.5 15.5c1.4-1.2 2.4-1.6 3.5-1.6s2.1.4 3.5 1.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="12" cy="19" r="1.3" fill="#fff" />
                </svg>
              </div>
              <h3>Internet via fibra óptica</h3>
              <p>Banda larga em fibra para casa e empresa, com alta velocidade e baixa latência.</p>
            </div>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19V9m5 10V5m5 14v-7m5 7V8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Links dedicados</h3>
              <p>Conexão dedicada de alta disponibilidade para empresas que não podem ficar fora do ar.</p>
            </div>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="13" rx="2" stroke="#fff" strokeWidth="1.8" />
                  <path d="M7 9h6M7 12h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3>IP dedicado</h3>
              <p>Endereço IP fixo e exclusivo para servidores, câmeras, VPNs e aplicações corporativas.</p>
            </div>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8" />
                  <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3>VPN MPLS</h3>
              <p>Interligação segura de filiais e unidades em rede privada, com tráfego priorizado.</p>
            </div>

          </div>
        </section>

        {/* ===================== SOBRE ===================== */}
        <section className="vantagens reveal" id="sobre">
          <p className="eyebrow">Sobre a Squid Telecom</p>
          <h2 className="titulo-secao">
            Provedora alagoana de internet <span>desde 2011</span>
          </h2>
          <p className="passos-sub">
            Provedora de internet autorizada pela Anatel, com sede em Rio Largo e atendimento de quem é da região.
          </p>

          <div className="hero-stats" style={{ justifyContent: "center", marginTop: "8px" }}>
            <div className="hero-stat">
              <span className="hero-stat-num">2011</span>
              <span className="hero-stat-label">Fundada em Alagoas</span>
            </div>
            <span className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hero-stat-num">Rio Largo</span>
              <span className="hero-stat-label">Sede · AL</span>
            </div>
            <span className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="hero-stat-num">Anatel</span>
              <span className="hero-stat-label">Provedora autorizada</span>
            </div>
          </div>

          <div className="vantagens-lista">
            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="1.3" fill="#fff" />
                </svg>
              </div>
              <h3>Missão</h3>
              <p>Conectar pessoas e empresas de Alagoas com internet rápida, estável e confiável.</p>
            </div>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2.6" stroke="#fff" strokeWidth="1.8" />
                </svg>
              </div>
              <h3>Visão</h3>
              <p>Ser a provedora de internet referência em proximidade e qualidade na região.</p>
            </div>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Valores</h3>
              <p>Atendimento próximo, transparência e compromisso com a experiência do cliente.</p>
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
            <span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Planilhas .xlsx
            </span>
            <span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M14 3v4h4M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Documentos .docx
            </span>
            <span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Busca com fontes
            </span>
            <span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 11l-7.5 7.5a4 4 0 01-5.5-5.5L13 5.5a2.5 2.5 0 013.5 3.5L9 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Lê PDF, Word e Excel
            </span>
          </div>
        </section>

        {/* ===================== CONTATO ===================== */}
        <section className="vantagens reveal" id="contato">
          <p className="eyebrow">Fale com a gente</p>
          <h2 className="titulo-secao">
            Contato <span>Squid Telecom</span>
          </h2>
          <p className="passos-sub">
            Contratar, tirar dúvidas ou falar com o suporte — escolha o canal que preferir.
          </p>

          <div className="vantagens-lista">
            <a className="vantagem-item" href="tel:+558233525248" style={{ textDecoration: "none" }}>
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2.2 2A16 16 0 013 6.2 2 2 0 015 4z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Telefone</h3>
              <p>(82) 3352-5248</p>
            </a>

            <a className="vantagem-item" href="https://www.squidtelecom.com.br" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8" />
                  <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Site</h3>
              <p>squidtelecom.com.br</p>
            </a>

            <div className="vantagem-item">
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s-7-5-7-10a7 7 0 0114 0c0 5-7 10-7 10z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="12" cy="11" r="2.5" stroke="#fff" strokeWidth="1.8" />
                </svg>
              </div>
              <h3>Endereço</h3>
              <p>Rio Largo · Alagoas</p>
            </div>

            <a className="vantagem-item" href={INSTAGRAM} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <div className="icone-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="1.8" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
                </svg>
              </div>
              <h3>Instagram</h3>
              <p>@squidtelecom</p>
            </a>
          </div>

          <p className="footer-copy" style={{ textAlign: "center", marginTop: "18px" }}>
            Squid Net Telecomunicações Ltda · CNPJ 13.827.747/0001-60
          </p>
        </section>

        {/* ===================== FAQ ===================== */}
        <section className="faq reveal" id="faq">
          <p className="eyebrow">Perguntas frequentes</p>
          <h2 className="titulo-secao">
            Tudo sobre a <span>{ASSISTENTE}</span>
          </h2>

          <div className="faq-list">
            <details className="faq-item">
              <summary>O que é a {ASSISTENTE}?</summary>
              <p>
                É a assistente de inteligência artificial da Squid Telecom, treinada no universo
                de internet, telecom e atendimento da empresa. Ela responde em português, de forma
                clara e profissional, para a sua equipe e seus clientes.
              </p>
            </details>

            <details className="faq-item">
              <summary>A {ASSISTENTE} fica disponível quando?</summary>
              <p>24 horas por dia, 7 dias por semana — sem fila e sem horário comercial.</p>
            </details>

            <details className="faq-item">
              <summary>Minhas conversas são privadas?</summary>
              <p>
                Sim. As conversas ficam no ambiente da Squid Telecom e não são expostas a serviços
                de terceiros. A chave de acesso ao motor de IA fica somente no servidor.
              </p>
            </details>

            <details className="faq-item">
              <summary>A {ASSISTENTE} gera documentos e planilhas?</summary>
              <p>
                Sim. Ela cria planilhas (.xlsx) e documentos Word (.docx) na hora, e também lê
                arquivos PDF, Word e Excel que você anexar.
              </p>
            </details>

            <details className="faq-item">
              <summary>Ela pesquisa na internet?</summary>
              <p>Sim — quando útil, a {ASSISTENTE} busca na web e cita as fontes das informações.</p>
            </details>

            <details className="faq-item">
              <summary>Quem pode acessar a plataforma?</summary>
              <p>
                Apenas usuários autorizados pela Squid Telecom. O acesso é por e-mail e senha,
                liberado pelo administrador da empresa.
              </p>
            </details>
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
            <img src="/logo-squid.png" alt="Squid Telecom" />
          </div>
          <p className="footer-tagline">
            Provedora de internet via fibra óptica · Rio Largo, Alagoas · desde 2011.
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
          <p className="footer-powered">
            Powered by{" "}
            <a href="https://www.mangaba.ia.br/" target="_blank" rel="noreferrer">
              Mangaba.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

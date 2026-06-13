# Squid IA

Clone do ChatGPT com a identidade visual da **Squid Telecom**.
Paleta rosa-vermelho + roxo extraída da identidade oficial Squid.
Construído em **Next.js 14** (App Router) com respostas em streaming.
Usa **Mangaba** (IA 100% gratuita e local, mesmo fluxo do Ollama) por padrão.

## Paleta de cores

| Token | Cor |
|-------|-----|
| Rosa / Vermelho (gradiente) | `#D7265B` → `#FF003C` |
| Roxo (estrutural) | `#6C5CE7` |
| Preto | `#000000` |
| Branco | `#FFFFFF` |
| Cinza claro | `#F2F2F2` |

Fonte: **Inter** (sistema moderno).

## IA gratuita com Mangaba

O **Mangaba** é um framework brasileiro de orquestração multi-agente que roda na sua
máquina com o **mesmo fluxo do Ollama** (API OpenAI-compatible em `http://localhost:11434`).
Cada funcionário roda o Mangaba no próprio computador — os dados não saem da máquina.

### Instalação em 1 comando (Mac, Windows e Linux)

**macOS / Linux** (Terminal):

```bash
curl -fsSL https://mangaba-site.vercel.app/install.sh | bash
```

**Windows** (PowerShell):

```powershell
irm https://mangaba-site.vercel.app/install.ps1 | iex
```

## Rodar localmente

```bash
npm install
npm run dev
```

## Deploy na Vercel

Configure as variáveis de ambiente:
- `OPENAI_BASE_URL` = URL do seu provider (Mangaba local, Groq, etc.)
- `OPENAI_MODEL` = modelo desejado
- `OPENAI_API_KEY` = sua chave (se necessário)

## Estrutura

```
squidtelecom-chat/
├── app/
│   ├── api/chat/route.ts   # endpoint de streaming (Edge)
│   ├── globals.css         # paleta + estilos do chat
│   ├── layout.tsx
│   └── page.tsx            # interface do chat
├── public/logo-squid.svg   # logo oficial Squid
└── ...
```

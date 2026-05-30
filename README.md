# Alpha1 Assistant

Clone do ChatGPT com a identidade visual da **Alpha 1 Consultoria** (telecom, gestão e TI).
Paleta azul e branco extraída de [alpha1consultoria.com](http://alpha1consultoria.com).
Construído em **Next.js 14** (App Router) com respostas em streaming.
Usa **Mangaba** (IA 100% gratuita e local, mesmo fluxo do Ollama) por padrão.

## Paleta de cores

| Token | Cor |
|-------|-----|
| Azul escuro | `#254679` |
| Azul | `#2e5ba5` |
| Azul vivo | `#007bff` |
| Azul claro | `#e8f0fa` |
| Branco | `#ffffff` |

Fonte: **Open Sans** (mesma do site institucional).

## IA gratuita com Mangaba

O **Mangaba** é um framework brasileiro de orquestração multi-agente que roda na sua
máquina com o **mesmo fluxo do Ollama** (API OpenAI-compatible em `http://localhost:11434`).
Cada funcionário roda o Mangaba no próprio computador — os dados não saem da máquina.

### Instalação em 1 comando (Mac, Windows e Linux)

Os instaladores criam um ambiente isolado, baixam o modelo e já iniciam o servidor local.

**macOS / Linux** (Terminal):

```bash
curl -fsSL https://mangaba-site.vercel.app/install.sh | bash
```

**Windows** (PowerShell):

```powershell
irm https://mangaba-site.vercel.app/install.ps1 | iex
```

> Requer Python 3.8+ (no Windows o instalador tenta instalar via `winget`). O modelo
> padrão é o `mangaba-mini` (~470 MB, roda em CPU, sem GPU). O servidor sobe em
> `localhost:11434` e o app já vem configurado para falar com ele. Sem chave, sem custo.

### Safari (macOS)

O Safari bloqueia páginas `https` de chamarem `http://localhost` (mixed content), ao contrário
de Chrome e Edge. Por isso, **no macOS** o instalador usa o [mkcert](https://github.com/FiloSottile/mkcert)
para gerar um certificado local confiável e o motor passa a servir em **`https://localhost:11434`**.
Na primeira instalação o macOS pede sua senha **uma vez** para confiar nesse certificado (a chave
privada nunca sai da sua máquina). Depois disso, Safari, Chrome, Edge e Firefox conectam normalmente.
No Windows e Linux não há Safari, então o motor segue em `http://localhost:11434` (Chrome/Edge/Firefox
aceitam). O app tenta `https` e cai para `http` automaticamente.

### Manual (qualquer SO com Python)

```bash
pip install --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu \
  https://mangaba-site.vercel.app/dl/mangaba_mini-0.1.0-py3-none-any.whl
python -m mangaba_mini pull mangaba-mini
python -m mangaba_mini serve
```

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 (com o Mangaba rodando em paralelo).

## Deploy na Vercel

⚠️ **Importante:** o Mangaba roda na *sua máquina* (`localhost`). Uma função serverless
na Vercel **não enxerga o seu localhost**. Você tem 3 caminhos:

### Opção A — Mangaba exposto por túnel (mantém Mangaba + Vercel)
Exponha seu Mangaba na internet e aponte a Vercel para ele:

```bash
# exemplo com cloudflared (gratuito)
cloudflared tunnel --url http://localhost:11434
# copie a URL https gerada, ex.: https://algo.trycloudflare.com
```

Na Vercel → **Settings → Environment Variables**:
- `OPENAI_BASE_URL` = `https://algo.trycloudflare.com/v1`
- `OPENAI_MODEL` = `mangaba-pro`

Sua máquina precisa ficar ligada com `mangaba serve` + o túnel ativos.

### Opção B — Groq (gratuito e hospedado, recomendado para Vercel)
Não precisa deixar nada ligado. Crie uma chave em https://console.groq.com e configure:
- `OPENAI_BASE_URL` = `https://api.groq.com/openai/v1`
- `OPENAI_MODEL` = `llama-3.3-70b-versatile`
- `OPENAI_API_KEY` = sua chave Groq

### Opção C — Rodar 100% local
Não fazer deploy e usar apenas `npm run dev` com o Mangaba. Grátis e privado.

Passos do deploy em si:
1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com): **Add New → Project** → importe o repositório.
3. Configure as variáveis conforme a opção A ou B acima.
4. **Deploy**.

## Estrutura

```
alpha1-chat/
├── app/
│   ├── api/chat/route.ts   # endpoint de streaming (Edge)
│   ├── globals.css         # paleta + estilos do chat
│   ├── layout.tsx
│   └── page.tsx            # interface do chat
├── public/logo-alpha1.png  # logo oficial da Alpha 1
└── ...
```

## Provedores compatíveis

A API usa o formato OpenAI `chat/completions`. Funciona com qualquer endpoint compatível
ajustando `OPENAI_BASE_URL` e `OPENAI_MODEL` (ex.: Groq, Together, OpenRouter, LM Studio local).

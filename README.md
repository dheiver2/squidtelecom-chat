# Alpha1 Assistant

Clone do ChatGPT com a identidade visual da **Alpha 1 Consultoria** (telecom, gestão e TI).
Paleta azul e branco extraída de [alpha1consultoria.com](http://alpha1consultoria.com).
Construído em **Next.js 14** (App Router) com respostas em streaming.
Usa **Ollama** (IA 100% gratuita e local) por padrão.

## Paleta de cores

| Token | Cor |
|-------|-----|
| Azul escuro | `#254679` |
| Azul | `#2e5ba5` |
| Azul vivo | `#007bff` |
| Azul claro | `#e8f0fa` |
| Branco | `#ffffff` |

Fonte: **Open Sans** (mesma do site institucional).

## IA gratuita com Ollama

1. Instale o Ollama: https://ollama.com/download
2. Baixe um modelo e deixe o servidor rodando:

```bash
ollama pull llama3.2     # ~2 GB, rápido. (ou: mistral, qwen2.5, phi3...)
ollama serve             # expõe a API em http://localhost:11434
```

O app já vem configurado para falar com o Ollama (`.env.local`). Sem chave, sem custo.

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 (com o Ollama rodando em paralelo).

## Deploy na Vercel

⚠️ **Importante:** o Ollama roda na *sua máquina* (`localhost`). Uma função serverless
na Vercel **não enxerga o seu localhost**. Você tem 3 caminhos:

### Opção A — Ollama exposto por túnel (mantém Ollama + Vercel)
Exponha seu Ollama na internet e aponte a Vercel para ele:

```bash
# exemplo com cloudflared (gratuito)
cloudflared tunnel --url http://localhost:11434
# copie a URL https gerada, ex.: https://algo.trycloudflare.com
```

Na Vercel → **Settings → Environment Variables**:
- `OPENAI_BASE_URL` = `https://algo.trycloudflare.com/v1`
- `OPENAI_MODEL` = `llama3.2`

Sua máquina precisa ficar ligada com `ollama serve` + o túnel ativos.

### Opção B — Groq (gratuito e hospedado, recomendado para Vercel)
Não precisa deixar nada ligado. Crie uma chave em https://console.groq.com e configure:
- `OPENAI_BASE_URL` = `https://api.groq.com/openai/v1`
- `OPENAI_MODEL` = `llama-3.3-70b-versatile`
- `OPENAI_API_KEY` = sua chave Groq

### Opção C — Rodar 100% local
Não fazer deploy e usar apenas `npm run dev` com o Ollama. Grátis e privado.

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

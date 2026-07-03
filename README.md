# Squid IA (Luna)

Clone do ChatGPT com a identidade visual da **Squid Telecom** (provedor de internet
de Rio Largo/AL). O assistente é apresentado ao usuário como **Luna**, com respostas
em streaming, autenticação, histórico de conversas persistido em banco e suporte a
upload/geração de documentos (PDF, Word, planilhas).

Construído em **Next.js 14** (App Router).

## Stack

- **Next.js 14** (App Router, rotas API em Edge/Node conforme o caso)
- **React 18** + TypeScript (`strict: true`)
- **Supabase Postgres** (via `pg` / `@neondatabase/serverless`) para usuários e conversas
- **bcryptjs** para hash de senha, sessão via cookie assinado (`app/lib/auth.ts` / `auth-edge.ts`)
- **Hugging Face router** (endpoint compatível com OpenAI) como motor de IA, exposto ao
  usuário sob a marca **Mangaba AI** (`app/lib/mangaba.ts` traduz o id real do modelo
  para um nome de marca "Mangaba ...")
- **duck-duck-scrape** / Tavily (opcional) para busca na web
- Geração/leitura de documentos: `docx`, `exceljs`, `mammoth`, `pdfjs-dist`, `katex`,
  `react-markdown` + `rehype`/`remark`
- **Vitest** para testes unitários

## Paleta de cores

| Token | Cor |
|-------|-----|
| Rosa / Vermelho (gradiente) | `#D7265B` → `#FF003C` |
| Roxo (estrutural) | `#6C5CE7` |
| Preto | `#000000` |
| Branco | `#FFFFFF` |
| Cinza claro | `#F2F2F2` |

Fonte: **Inter**.

## Funcionalidades

- **Landing page** (`app/page.tsx`) com a apresentação da Luna/Squid Telecom.
- **Chat em streaming** (`app/chat/page.tsx` + `app/api/chat/route.ts`), com fallback
  entre modelos do Hugging Face configurados via `OPENAI_MODEL_FALLBACKS`.
- **Autenticação** — registro/login/logout com sessão em cookie (`app/api/register`,
  `app/api/login`, `app/api/logout`, `app/api/me`), senhas com hash `bcryptjs`,
  usuários persistidos no Postgres.
- **Histórico de conversas** sincronizado no servidor (`app/api/conversations`,
  `app/api/conversations/[id]`), com proteção contra sobrescrita entre usuários
  (checagem de dono na query de update).
- **Upload/leitura de documentos** — PDF (`pdfjs-dist`), Word (`mammoth`) e geração de
  Word/planilha (`docx`, `exceljs`) via `app/api/document` e `app/api/spreadsheet`.
- **Busca na web** (`app/api/search`) — Tavily quando configurado, senão DuckDuckGo.
- **Rate limiting** (`app/lib/ratelimit.ts`) — em memória por instância por padrão, ou
  global via Upstash Redis se configurado.
- **Página de manual** (`app/manual`) com exemplos de uso por área (financeiro,
  comercial, técnico etc).
- Rotas auxiliares: `app/api/status`, `app/api/version`, `app/api/admin/seed`
  (seed de usuário admin).

## Variáveis de ambiente

Definidas em `.env.local` (não versionado — veja `.env.example` para o template).
Nenhuma delas contém valor real neste repositório.

| Variável | Uso |
|----------|-----|
| `SESSION_SECRET` | Assinatura do cookie de sessão (`app/lib/auth.ts`/`auth-edge.ts`). Obrigatória em produção. |
| `POSTGRES_URL` | Connection string do Postgres (Supabase, via pooler/PgBouncer) — usuários e conversas (`app/lib/db.ts`). |
| `POSTGRES_URL_NON_POOLING` | Fallback de conexão direta ao Postgres, sem pooler. |
| `OPENAI_BASE_URL` | Endpoint compatível com OpenAI usado como motor de IA. Hoje: `https://router.huggingface.co/v1` (Hugging Face). |
| `OPENAI_MODEL` | Modelo padrão de texto servido pelo router (ex.: `meta-llama/Llama-3.3-70B-Instruct`). |
| `OPENAI_API_KEY` | Chave do provedor (token Hugging Face `hf_...`). |
| `OPENAI_VISION_MODEL` | Modelo usado quando o usuário envia uma imagem. |
| `OPENAI_MODEL_FALLBACKS` | Lista opcional de modelos HF alternativos, separados por vírgula, usados se o modelo principal falhar. |
| `TAVILY_API_KEY` | Opcional — habilita busca via Tavily em `app/api/search`; sem ela, cai para DuckDuckGo (`duck-duck-scrape`). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Opcionais — habilitam rate limiting global via Redis; sem elas, o limite é em memória por instância. |

> **Nota importante:** apesar do app falar em "Mangaba AI" para o usuário final, o
> motor de IA real hoje é o **Hugging Face router** (`OPENAI_BASE_URL`/`OPENAI_MODEL`/
> `OPENAI_API_KEY`), não uma instância local do Mangaba/Ollama. O login e o histórico
> de conversas **dependem de um Postgres configurado** (`POSTGRES_URL`) — sem essa
> variável, as rotas de auth e conversas falham em runtime. Isso não impede o
> `next build` (que não acessa o banco em build-time), mas é necessário para rodar a
> aplicação de ponta a ponta.

## Rodar localmente

Gerenciador de pacotes: **npm** (há `package-lock.json` versionado).

```bash
npm install

# copie o template e preencha com valores reais (não versionar):
cp .env.example .env.local

npm run dev       # http://localhost:3000
```

### Build de produção

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

> O repositório não tem um `.eslintrc*` versionado, então `next lint` isolado pede
> configuração interativa na primeira execução (não roda de forma não-interativa/CI).
> O `npm run build` já roda lint + checagem de tipos do Next internamente e é a forma
> usada para validar o código no CI deste projeto.

### Testes

```bash
npm test          # vitest run
npm run test:watch
```

## Estrutura

```
squidtelecom-chat/
├── app/
│   ├── api/
│   │   ├── chat/route.ts            # streaming do chat (Mangaba AI / HF router)
│   │   ├── login|logout|register|me # autenticação por cookie de sessão
│   │   ├── conversations/           # histórico de conversas (CRUD, Postgres)
│   │   ├── document/                # leitura/geração de documentos (pdf/docx)
│   │   ├── spreadsheet/             # geração de planilhas (exceljs)
│   │   ├── search/                  # busca web (Tavily ou DuckDuckGo)
│   │   ├── admin/seed/              # seed de usuário admin
│   │   └── status|version/          # health/versão
│   ├── lib/                         # auth, db, rate limit, busca, documentos...
│   ├── chat/page.tsx                # interface do chat
│   ├── manual/page.tsx              # manual de uso
│   ├── page.tsx                     # landing
│   └── globals.css                  # paleta + estilos
├── scripts/                         # seed de usuários, sync do worker do pdf.js
├── tests/                           # suíte Vitest
└── public/                          # assets estáticos (logo etc.)
```

## Deploy (Vercel)

Configure as variáveis de ambiente da seção acima no projeto Vercel. No mínimo, para
o chat e autenticação funcionarem em produção: `SESSION_SECRET`, `POSTGRES_URL`,
`OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`.

## CI

O workflow em `.github/workflows/ci.yml` roda em cada push/PR para `main`:
`npm ci` → `npm run build` (compila, checa tipos e faz lint via Next) → `npm test`.
Não depende de Postgres/Hugging Face configurados, pois o build não acessa esses
serviços em build-time — só as rotas dependem deles em runtime.

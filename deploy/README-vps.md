# Servir a IA central na VPS (Ollama + Caddy) para a plataforma Alpha1

Arquitetura: **navegador → /api/chat (Vercel, autenticado por login) → VPS (Caddy HTTPS + Bearer) → Ollama (127.0.0.1)**.
A chave do serviço fica só nas variáveis de ambiente da Vercel — **nunca** chega ao navegador.

## 1) Instalar e configurar o Ollama (na VPS)

```bash
curl -fsSL https://ollama.com/install.sh | sh      # cria o serviço systemd "ollama"
ollama pull qwen2.5:3b                              # ou llama3.1:8b conforme RAM/GPU
```

O Ollama já escuta em `127.0.0.1:11434` por padrão — **deixe assim** (fechado à internet; quem expõe é o Caddy).

Ajustes para múltiplos usuários (drop-in do systemd):

```bash
sudo systemctl edit ollama
```
Cole:
```ini
[Service]
Environment="OLLAMA_NUM_PARALLEL=4"        # requisições simultâneas
Environment="OLLAMA_MAX_LOADED_MODELS=1"   # 1 modelo na memória
Environment="OLLAMA_KEEP_ALIVE=30m"        # não descarrega o modelo a cada request
```
```bash
sudo systemctl restart ollama
```

> Dimensionamento: um modelo 3B em CPU aguenta poucos usuários simultâneos; 8B confortável só com GPU.
> O gargalo é RAM/VRAM. Comece com 3B e meça.

## 2) Apontar o domínio

Crie um registro **A** (e AAAA se tiver IPv6) `ia.seudominio.com → IP_DA_VPS`.
Abra as portas **80** e **443** no firewall. A **11434 NÃO** deve ficar pública.

```bash
sudo ufw allow 80,443/tcp
sudo ufw deny 11434
```

## 3) Instalar o Caddy (HTTPS + auth)

```bash
# Debian/Ubuntu (pacote oficial)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Gere a chave e edite o Caddyfile:
```bash
openssl rand -hex 32          # copie o resultado = SUA chave
sudo nano /etc/caddy/Caddyfile   # cole o conteúdo de deploy/Caddyfile, trocando domínio + chave
sudo systemctl reload caddy
```

Teste (deve dar 401 sem chave e 200 com chave):
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ia.seudominio.com/v1/models
curl -s -H "Authorization: Bearer SUA_CHAVE" https://ia.seudominio.com/v1/models
```

## 4) Configurar a plataforma na Vercel

Em **alpha1-chat → Settings → Environment Variables** (Production):

| Variável | Valor |
|---|---|
| `OPENAI_BASE_URL` | `https://ia.seudominio.com/v1` |
| `OPENAI_MODEL` | `qwen2.5:3b` (o nome exato do `ollama pull`) |
| `OPENAI_API_KEY` | a chave gerada com `openssl rand -hex 32` |

Depois **redeploy** do alpha1-chat. Pronto: todos os funcionários logados usam a IA central, sem instalar nada.

## Checklist de segurança
- [ ] Ollama em `127.0.0.1` (não `0.0.0.0`); porta 11434 fechada no firewall.
- [ ] Chave forte (`openssl rand -hex 32`), guardada só na Vercel e no Caddyfile da VPS.
- [ ] Sem CORS aberto no Caddy (não é navegador-direto; é server-to-server).
- [ ] HTTPS válido (Caddy/Let's Encrypt) — o site é HTTPS, o upstream também precisa ser.

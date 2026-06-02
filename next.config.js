// Identificador único do build — usado para auto-atualização do cliente.
// Prioriza o SHA do commit (Vercel) e cai para git local / timestamp.
function resolveBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    return require("child_process").execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return String(Date.now());
  }
}
const BUILD_ID = resolveBuildId();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expõe o build ao cliente e amarra os assets a esse id.
  env: { NEXT_PUBLIC_BUILD: BUILD_ID },
  generateBuildId: async () => BUILD_ID,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      // Assets hasheados do Next (nome muda a cada build) → cache longo e imutável.
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Todo o resto (HTML/documentos e rotas) → nunca cachear: o navegador
      // sempre revalida e, num deploy novo, baixa o HTML novo (que referencia
      // os assets hasheados novos). Isso resolve o cache automaticamente em
      // cada deploy, sem hard reload manual.
      {
        source: "/((?!_next/static|_next/image).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

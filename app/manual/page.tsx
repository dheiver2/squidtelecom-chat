import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manual — Marina Assistente",
  description: "Guia de uso da Marina, a assistente de IA da Alpha 1 Consultoria.",
};

const AREAS: [string, string][] = [
  ["Financeiro", "“Monte uma planilha de custos do projeto X com itens, quantidade, valor unitário e total.”"],
  ["Comercial / Vendas", "“Faça uma proposta comercial em Word de internet dedicada para a empresa Y.”"],
  ["Relacionamento", "“Escreva um e-mail cordial avisando o cliente sobre manutenção programada.”"],
  ["Técnico / Redes", "“Crie um checklist de instalação de link dedicado e explique o que é IP fixo válido.”"],
  ["Gestão de Pessoas", "“Redija um comunicado interno sobre o novo horário de atendimento.”"],
  ["Inteligência / Dados", "“Pesquise tendências de telecom para PMEs em 2026 e cite as fontes.”"],
  ["Qualquer área", "“Resuma este PDF anexado e liste prazos e valores.”"],
];

export default function ManualPage() {
  return (
    <article className="manual">
      <header className="manual-head">
        <img src="/logo-alpha1.png" alt="Alpha 1" />
        <div>
          <h1>Manual da Marina Assistente</h1>
          <p className="manual-sub">Assistente de IA da Alpha 1 Consultoria — telecom, gestão e TI.</p>
        </div>
      </header>

      <a className="manual-cta" href="/chat">Abrir a Marina →</a>

      <section>
        <h2>1. O que é a Marina</h2>
        <p>
          A Marina é a assistente virtual da Alpha 1. Ela conversa em português, entende o contexto da
          empresa e ajuda no dia a dia: tira dúvidas, escreve textos, pesquisa na internet, lê arquivos e
          gera planilhas e documentos prontos para baixar.
        </p>
      </section>

      <div className="manual-note">
        <strong>Como a Marina trabalha — especificação primeiro.</strong> Antes de entregar
        algo (texto, planilha, documento, análise), a Marina define a <em>especificação</em>:
        objetivo, para quem/uso, requisitos e formato. Por isso, em pedidos vagos ela pode fazer
        de 1 a 3 perguntas antes de responder. Quanto mais detalhes você der de início, mais
        rápido e certeiro fica o resultado.
      </div>

      <section>
        <h2>2. Como acessar</h2>
        <ol>
          <li>Abra a plataforma: <strong>https://apha1-ia.online</strong></li>
          <li>Clique em <strong>Entrar</strong> e informe seu <strong>e-mail</strong> e a <strong>senha</strong> que recebeu.</li>
          <li>A senha diferencia maiúsculas de minúsculas — digite exatamente como recebeu.</li>
          <li>Para sair, clique no botão de logout ao lado do seu nome (canto inferior esquerdo).</li>
        </ol>
        <p className="muted">Acesso restrito aos funcionários cadastrados. A sessão dura ~12 horas.</p>
      </section>

      <section>
        <h2>3. Conversar</h2>
        <ul>
          <li>Digite sua pergunta no campo de mensagem e pressione <strong>Enter</strong>.</li>
          <li>As respostas saem em tempo real (listas, tabelas, código, fórmulas).</li>
          <li>Você pode <strong>Copiar</strong> a resposta ou pedir para <strong>Regenerar</strong>.</li>
          <li>Use <strong>Nova conversa</strong> para um novo assunto — o histórico fica salvo, pode ser renomeado, buscado ou excluído.</li>
        </ul>
      </section>

      <section>
        <h2>4. Gerar planilha (.xlsx)</h2>
        <p>Peça uma planilha financeira, de custos, orçamento ou cotação. A Marina monta a tabela com totais e mostra o botão <strong>“Baixar .xlsx”</strong>.</p>
        <p className="ex">Ex.: “Crie uma planilha de orçamento mensal com categorias, valor previsto e valor realizado.”</p>
      </section>

      <section>
        <h2>5. Gerar documento Word (.docx)</h2>
        <p>Peça uma proposta, relatório, carta, contrato ou comunicado. Aparece o botão <strong>“Baixar .docx”</strong>.</p>
        <p className="ex">Ex.: “Faça uma proposta comercial de internet 500MB simétrica para a empresa ACME.”</p>
      </section>

      <section>
        <h2>6. Anexar e ler arquivos</h2>
        <ul>
          <li>Clique no ícone de anexo e envie <strong>PDF, Word, Excel ou texto</strong>.</li>
          <li>Depois peça: resumir, extrair dados, analisar ou comparar.</li>
        </ul>
        <p className="ex">Ex.: “Analise esta planilha e aponte os três maiores gastos.”</p>
      </section>

      <section>
        <h2>7. Pesquisar na internet</h2>
        <ul>
          <li>Clique no ícone de <strong>busca (lupa)</strong> para ativar a pesquisa na web.</li>
          <li>A resposta usará resultados da internet e mostrará as <strong>Fontes</strong> (com links).</li>
        </ul>
        <p className="muted">Use para informações atuais. Pode levar alguns segundos a mais.</p>
      </section>

      <section>
        <h2>8. Exemplos por área</h2>
        <div className="manual-table">
          <table>
            <thead><tr><th>Área</th><th>Exemplo de pedido</th></tr></thead>
            <tbody>
              {AREAS.map(([a, ex]) => (
                <tr key={a}><td>{a}</td><td>{ex}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>9. Dicas para respostas melhores</h2>
        <ul>
          <li>Seja específico: diga o objetivo, o público e o formato (planilha, Word, lista…).</li>
          <li>Dê contexto: nomes, valores, prazos. Quanto mais detalhe, melhor.</li>
          <li>Se a Marina perguntar antes de responder, é o método “especificação primeiro” — responda as perguntas e ela entrega certinho.</li>
          <li>Peça ajustes: “deixe mais formal”, “adicione uma coluna de desconto”, “resuma em 5 itens”.</li>
        </ul>
      </section>

      <section>
        <h2>10. Limitações</h2>
        <ul>
          <li>A Marina pode errar — confira informações importantes antes de usar.</li>
          <li>Não acessa sistemas internos (ERP, base de clientes) nem envia e-mails sozinha.</li>
          <li>Cotação de passagem/material com preço real não é confiável só por busca na web.</li>
          <li>Não entende imagens nem áudio.</li>
        </ul>
        <p><strong>Em caso de problema de acesso, fale com o administrador da Alpha 1.</strong></p>
      </section>

      <footer className="manual-foot">
        <a className="manual-cta" href="/chat">Abrir a Marina →</a>
        <a className="manual-back" href="/">← Início</a>
      </footer>
    </article>
  );
}

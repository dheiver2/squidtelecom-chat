// Gera um arquivo .xlsx a partir de um SpreadsheetSpec (exceljs → Node.js).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import ExcelJS from "exceljs";
import { readSession } from "../../lib/auth";
import { validateSpreadsheetSpec } from "../../lib/spreadsheet";

export async function POST(req: Request) {
  // Apenas usuários autenticados podem gerar planilhas.
  if (!readSession(req.headers.get("cookie"))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  let spec;
  try {
    spec = validateSpreadsheetSpec(await req.json());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Squid IA";
    wb.created = new Date();

    for (const sheet of spec.sheets) {
      const ws = wb.addWorksheet(sheet.name);
      const currency = new Set(sheet.currencyColumns || []);

      // Cabeçalho
      const header = ws.addRow(sheet.columns);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6FEB" } };
        cell.alignment = { vertical: "middle" };
      });

      // Dados
      for (const r of sheet.rows) ws.addRow(r);

      // Formatação de colunas de moeda + larguras
      sheet.columns.forEach((col, idx) => {
        const column = ws.getColumn(idx + 1);
        column.width = Math.min(40, Math.max(12, String(col).length + 4));
        if (currency.has(idx)) column.numFmt = '"R$" #,##0.00';
      });

      // Linha de totais
      if (sheet.totals && currency.size && sheet.rows.length) {
        const firstDataRow = 2;
        const lastDataRow = sheet.rows.length + 1;
        const totalRow: Array<string | { formula: string }> = sheet.columns.map((_, idx) => {
          if (currency.has(idx)) {
            const letter = ws.getColumn(idx + 1).letter;
            return { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` };
          }
          return "";
        });
        // Rótulo "TOTAL" na 1ª coluna não-moeda
        const labelIdx = sheet.columns.findIndex((_, i) => !currency.has(i));
        if (labelIdx >= 0) totalRow[labelIdx] = "TOTAL";
        const added = ws.addRow(totalRow as unknown[]);
        added.font = { bold: true };
      }

      ws.views = [{ state: "frozen", ySplit: 1 }];
    }

    const buffer = await wb.xlsx.writeBuffer();
    const safeName = spec.title.replace(/[^a-z0-9_\-]+/gi, "_").toLowerCase() || "planilha";
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("spreadsheet error", e);
    return Response.json({ error: "Erro ao gerar a planilha." }, { status: 500 });
  }
}

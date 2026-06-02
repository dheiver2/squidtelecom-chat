// Gera um arquivo .docx a partir de um DocumentSpec (lib `docx` → Node.js).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  Document, Packer, Paragraph, HeadingLevel, TextRun,
  Table, TableRow, TableCell, WidthType,
} from "docx";
import { readSession } from "../../lib/auth";
import { validateDocumentSpec, type DocBlock } from "../../lib/document";

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];

function renderBlock(b: DocBlock): Array<Paragraph | Table> {
  switch (b.type) {
    case "heading":
      return [new Paragraph({ text: b.text, heading: HEADINGS[(b.level || 1) - 1] || HeadingLevel.HEADING_1 })];
    case "paragraph":
      return [new Paragraph({ children: [new TextRun(b.text)] })];
    case "bullets":
      return b.items.map((i) => new Paragraph({ text: i, bullet: { level: 0 } }));
    case "numbered":
      return b.items.map((i) => new Paragraph({ text: i, numbering: { reference: "num", level: 0 } }));
    case "table": {
      const header = new TableRow({
        children: b.columns.map((c) =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(c), bold: true })] })] })
        ),
      });
      const body = b.rows.map((r) =>
        new TableRow({
          children: b.columns.map((_, ci) =>
            new TableCell({ children: [new Paragraph(String(r[ci] ?? ""))] })
          ),
        })
      );
      return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] })];
    }
    default:
      return [];
  }
}

export async function POST(req: Request) {
  if (!readSession(req.headers.get("cookie"))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  let spec;
  try {
    spec = validateDocumentSpec(await req.json());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    const children: Array<Paragraph | Table> = [
      new Paragraph({ text: spec.title, heading: HeadingLevel.TITLE }),
    ];
    for (const b of spec.blocks) children.push(...renderBlock(b));

    const doc = new Document({
      creator: "Alpha1 Assistant",
      numbering: {
        config: [{
          reference: "num",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "start" }],
        }],
      },
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeName = spec.title.replace(/[^a-z0-9_\-]+/gi, "_").toLowerCase() || "documento";
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("document error", e);
    return Response.json({ error: "Erro ao gerar o documento." }, { status: 500 });
  }
}

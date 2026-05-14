/**
 * Export helpers for the Admin page.
 * CSV and JSON export work purely client-side.
 * Word export uses the `docx` npm package.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';

// ---- helpers ----

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- CSV ----

export function exportCSV(entries) {
  const headers = [
    'id', 'category', 'title', 'context', 'priority', 'status',
    'next_step', 'tags', 'occurred_on', 'created_at', 'updated_at',
    'contributor', 'last_edited_by',
  ];
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('; ') : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = entries.map((e) => [
    e.id, e.category, e.title, e.context, e.priority, e.status,
    e.next_step, e.tags,
    e.occurred_on, e.created_at, e.updated_at,
    e.profiles?.display_name ?? '',
    e.last_editor?.display_name ?? '',
  ].map(escape).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `poaa-entries-${today()}.csv`);
}

// ---- JSON ----

export function exportJSON(entries) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `poaa-entries-${today()}.json`);
}

// ---- Word ----

export async function exportWord(entries) {
  const categoryOrder = ['issue', 'tech', 'data', 'process', 'win', 'open_question'];
  const categoryLabels = {
    issue: 'Issues', tech: 'Tech Enhancements', data: 'Data Needs',
    process: 'Process Notes', win: 'Wins', open_question: 'Open Questions',
  };

  const sections = [];

  for (const cat of categoryOrder) {
    const group = entries.filter((e) => e.category === cat);
    if (!group.length) continue;

    sections.push(
      new Paragraph({
        text: categoryLabels[cat],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 100 },
      })
    );

    for (const entry of group) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: entry.title, bold: true }),
            new TextRun({ text: `  [${entry.priority} / ${entry.status}]`, color: '595959' }),
          ],
          spacing: { before: 200, after: 60 },
        })
      );
      if (entry.context) {
        sections.push(new Paragraph({ text: entry.context, spacing: { after: 60 } }));
      }
      if (entry.next_step) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Next step: ', bold: true }),
              new TextRun(entry.next_step),
            ],
            spacing: { after: 60 },
          })
        );
      }
      if (entry.tags?.length) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Tags: ', bold: true }),
              new TextRun(entry.tags.join(', ')),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ children: [
      new Paragraph({
        text: 'POAA Field Notes: Retrospective Export',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Exported ${today()}`,
        spacing: { after: 400 },
      }),
      ...sections,
    ]}],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `poaa-retrospective-${today()}.docx`);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

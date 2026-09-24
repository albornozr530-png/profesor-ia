import React from 'react';

/**
 * Renderizador Markdown ligero y seguro (sin dependencias externas).
 * Soporta: títulos, negritas, cursivas, código, listas, tablas simples,
 * saltos de línea y enlaces. Convierte el texto del profesor en HTML
 * legible en lugar de mostrar **asteriscos** crudos.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  // Orden: código -> negritas -> cursivas -> enlaces
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[13px] font-mono">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline">$1</a>');
  return out;
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split(/\r?\n/);
  const htmlParts: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const closeList = () => {
    if (listType) {
      htmlParts.push(`</${listType}>`);
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const headerCells = splitTableRow(tableBuffer[0]);
      const bodyRows = tableBuffer.slice(2);
      htmlParts.push('<div class="overflow-x-auto my-2"><table class="min-w-full text-[13px] border-collapse">');
      htmlParts.push('<thead><tr>');
      for (const cell of headerCells) {
        htmlParts.push(`<th class="border border-slate-200 dark:border-slate-700 px-2 py-1 bg-slate-50 dark:bg-slate-800 font-semibold text-left">${renderInline(cell)}</th>`);
      }
      htmlParts.push('</tr></thead><tbody>');
      for (const row of bodyRows) {
        htmlParts.push('<tr>');
        for (const cell of splitTableRow(row)) {
          htmlParts.push(`<td class="border border-slate-200 dark:border-slate-700 px-2 py-1">${renderInline(cell)}</td>`);
        }
        htmlParts.push('</tr>');
      }
      htmlParts.push('</tbody></table></div>');
    }
    tableBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Bloques de código ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        htmlParts.push(`<pre class="my-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-x-auto text-[12.5px] font-mono leading-relaxed"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushTable();
        closeList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Tablas
    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList();
      tableBuffer.push(line);
      continue;
    }
    flushTable();

    // Línea vacía
    if (!line.trim()) {
      closeList();
      continue;
    }

    // Títulos
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const sizes = ['text-lg', 'text-base', 'text-sm', 'text-sm'];
      htmlParts.push(`<h${level} class="${sizes[level - 1]} font-bold mt-3 mb-1.5 text-slate-900 dark:text-white">${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // Separador horizontal
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      closeList();
      htmlParts.push('<hr class="my-2.5 border-slate-200 dark:border-slate-800" />');
      continue;
    }

    // Listas con viñetas
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        htmlParts.push('<ul class="list-disc pl-5 my-1.5 space-y-1">');
        listType = 'ul';
      }
      htmlParts.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    // Listas numeradas
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      if (listType !== 'ol') {
        closeList();
        htmlParts.push('<ol class="list-decimal pl-5 my-1.5 space-y-1">');
        listType = 'ol';
      }
      htmlParts.push(`<li>${renderInline(numbered[2])}</li>`);
      continue;
    }

    // Texto normal (párrafo)
    closeList();
    htmlParts.push(`<p class="my-1.5">${renderInline(line)}</p>`);
  }

  if (inCodeBlock && codeBuffer.length) {
    htmlParts.push(`<pre class="my-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-x-auto text-[12.5px] font-mono leading-relaxed"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
  }
  flushTable();
  closeList();

  return <div data-testid="markdown" dangerouslySetInnerHTML={{ __html: htmlParts.join('') }} />;
};

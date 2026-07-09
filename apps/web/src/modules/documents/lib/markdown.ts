// Robust markdown-to-HTML and HTML-to-markdown converters to allow
// seamless format switching between raw Markdown and the Rich Text Editor.

export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // Escaping HTML characters first
  const html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Pull fenced code blocks out before splitting on blank lines, since a code block
  // can legitimately contain blank lines that would otherwise be read as paragraph breaks.
  const codeBlocks: string[] = [];
  const withPlaceholders = html.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_match, code: string) => {
    const index = codeBlocks.push(code.replace(/\n$/, '')) - 1;
    return `CODEBLOCKPLACEHOLDER${index}END`;
  });

  // Split into paragraphs/blocks by double newline
  const blocks = withPlaceholders.split(/\n\n+/);
  const convertedBlocks = blocks.map((block) => {
    const line = block.trim();
    if (!line) return '';

    const codeBlockMatch = line.match(/^CODEBLOCKPLACEHOLDER(\d+)END$/);
    if (codeBlockMatch) {
      return `<pre><code>${codeBlocks[Number(codeBlockMatch[1])]}</code></pre>`;
    }

    // Headers
    if (line.startsWith('### ')) {
      return `<h3>${convertInlineMarkdown(line.slice(4))}</h3>`;
    }
    if (line.startsWith('## ')) {
      return `<h2>${convertInlineMarkdown(line.slice(3))}</h2>`;
    }
    if (line.startsWith('# ')) {
      return `<h1>${convertInlineMarkdown(line.slice(2))}</h1>`;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      return `<blockquote>${convertInlineMarkdown(line.slice(2))}</blockquote>`;
    }

    // List items (unordered list support)
    if (line.startsWith('- ')) {
      const items = line.split(/\n- /);
      const listContent = items
        .map((item, idx) => {
          const itemText = idx === 0 ? item.slice(2) : item;
          return `<li>${convertInlineMarkdown(itemText)}</li>`;
        })
        .join('');
      return `<ul>${listContent}</ul>`;
    }

    // Plain paragraph
    return `<p>${convertInlineMarkdown(line)}</p>`;
  });

  return convertedBlocks.filter(Boolean).join('');
}

function convertInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let text = html;

  // Code blocks (handled first: pre content should not go through the inline/paragraph rules below)
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_match, inner: string) => {
    let code = inner
      .replace(/<code[^>]*>/gi, '')
      .replace(/<\/code>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n');

    // Strip HTML tags until stable to avoid incomplete multi-character sanitization.
    let previousCode: string;
    do {
      previousCode = code;
      code = code.replace(/<[^>]+>/g, '');
    } while (code !== previousCode);

    // Decode standard HTML entities.
    code = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Strip again after decoding in case tags reappear.
    do {
      previousCode = code;
      code = code.replace(/<[^>]+>/g, '');
    } while (code !== previousCode);

    // Final hardening: remove any remaining angle brackets.
    code = code.replace(/[<>]/g, '');

    return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
  });

  // Blockquotes
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n');

  // Headers
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');

  // Bold / Strong / Italic / Em
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, '*$2*');

  // Code
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Lists and list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  text = text.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/(ul|ol)>/gi, '$2\n');

  // Paragraphs & Line Breaks
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Strip all other HTML tags (repeat until stable to avoid incomplete multi-character sanitization)
  let previous: string;
  do {
    previous = text;
    text = text.replace(/<[^>]+>/g, '');
  } while (text !== previous);

  // Decode standard HTML entities
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  // Cleanup newlines: collapse three or more newlines into double newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

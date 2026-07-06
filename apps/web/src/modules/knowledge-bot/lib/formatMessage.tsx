import type { ReactNode } from 'react';

// Chat content comes straight from the LLM, so this renders basic markdown
// (bold/italic/code/bullets) as React nodes directly — no
// dangerouslySetInnerHTML — so there's no HTML-injection surface no matter
// what the model outputs.
const INLINE_PATTERN = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;

function formatInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${index++}`;
    if (match[1] !== undefined) nodes.push(<strong key={key}>{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(<em key={key}>{match[2]}</em>);
    else if (match[3] !== undefined) nodes.push(<code key={key}>{match[3]}</code>);
    lastIndex = INLINE_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Renders chat message content: paragraphs, "- " bullet lists, and inline bold/italic/code spans.
export function formatChatMessage(content: string): ReactNode {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(<ul key={`list-${blocks.length}`}>{listItems}</ul>);
    listItems = [];
  }

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      listItems.push(<li key={`item-${lineIndex}`}>{formatInline(trimmed.slice(2), `li-${lineIndex}`)}</li>);
      return;
    }
    flushList();
    if (trimmed) blocks.push(<p key={`p-${lineIndex}`}>{formatInline(trimmed, `p-${lineIndex}`)}</p>);
  });
  flushList();

  return blocks;
}

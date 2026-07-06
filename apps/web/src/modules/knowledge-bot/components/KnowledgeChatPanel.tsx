import { Bot, Send } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@boilerplate/ui-common';
import type { KnowledgeMessage } from '../api';
import { formatChatMessage } from '../lib/formatMessage';

export function KnowledgeChatPanel({
  messages,
  model,
  models,
  message,
  isAsking,
  onModelChange,
  onMessageChange,
  onAsk,
}: {
  messages: KnowledgeMessage[];
  model: string;
  models: string[];
  message: string;
  isAsking: boolean;
  onModelChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onAsk: () => void;
}) {
  return (
    <main className="knowledge-chat">
      <div className="knowledge-chat__header">
        <div>
          <p>Tenant knowledge bot</p>
          <h1>Ask your workspace data</h1>
        </div>
        {models.length > 0 ? (
          <Select
            label="Ollama model"
            value={model}
            options={models.map((item) => ({ value: item, label: item }))}
            onChange={(event) => onModelChange(event.target.value)}
          />
        ) : (
          <Input label="Ollama model" value={model} onChange={(event) => onModelChange(event.target.value)} placeholder="qwen3:0.6b" />
        )}
      </div>

      <div className="knowledge-messages">
        {messages.length === 0 ? (
          <div className="knowledge-empty"><Bot size={36} /><h2>No chat yet</h2><p>Add a source, then ask a question.</p></div>
        ) : (
          messages.map((item) => (
            <article key={item.id} className={`knowledge-message knowledge-message--${item.role}`}>
              <strong>{item.role === 'assistant' ? 'Bot' : 'You'}</strong>
              <div className="knowledge-message__body">{formatChatMessage(item.content)}</div>
              {item.citations.length > 0 && (
                <div className="knowledge-citations">
                  {item.citations.map((citation) => <span key={`${item.id}-${citation.id}`}>{citation.name ?? citation.id}</span>)}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <form className="knowledge-composer" onSubmit={(event) => { event.preventDefault(); onAsk(); }}>
        <div className="knowledge-composer__inner">
          <Textarea
            aria-label="Message"
            value={message}
            rows={1}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="Ask about a tenant policy, process, or dataset..."
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (message.trim() && !isAsking) {
                  onAsk();
                }
              }
            }}
          />
          <Button
            variant="primary"
            type="submit"
            disabled={isAsking || !message.trim()}
            className="knowledge-composer__submit"
          >
            <Send size={16} />
            <span>{isAsking ? 'Asking...' : 'Send'}</span>
          </Button>
        </div>
      </form>
    </main>
  );
}

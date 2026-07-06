import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { 
  listKnowledgeMessages, 
  askKnowledgeBotStream, 
  type KnowledgeMessage 
} from '../../../modules/knowledge-bot/api';
import './ChatWidget.css';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<KnowledgeMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      listKnowledgeMessages()
        .then((items) => setMessages(sortMessages(items)))
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: KnowledgeMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      model: null,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    const tempId = Date.now().toString() + '-assistant';
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: 'assistant',
        content: '',
        model: null,
        citations: [],
        createdAt: new Date().toISOString(),
      }
    ]);

    try {
      let content = '';
      for await (const chunk of askKnowledgeBotStream(userMessage.content)) {
        content += chunk.delta;
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === tempId ? { ...msg, content, model: chunk.model ?? msg.model, citations: chunk.citations ?? msg.citations } : msg
          )
        );
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === tempId ? { ...msg, content: msg.content + '\n\n**Error:** Failed to get response.' } : msg
        )
      );
    } finally {
      setIsLoading(false);
      listKnowledgeMessages()
        .then((items) => {
          if (items.length > 0) setMessages(sortMessages(items));
        })
        .catch(console.error);
    }
  }

  return (
    <div className="chat-widget">
      {isOpen && (
        <div className="chat-widget__popover">
          <div className="chat-widget__header">
            <h3>AI Assistant</h3>
            <button type="button" onClick={() => setIsOpen(false)} className="chat-widget__close">
              <X size={20} />
            </button>
          </div>
          
          <div className="chat-widget__messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-widget__message chat-widget__message--${msg.role}`}>
                <div className={`chat-widget__message-bubble${!msg.content ? ' chat-widget__message-bubble--typing' : ''}`}>
                  {msg.content || 'Thinking...'}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="chat-widget__input-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything..."
              className="chat-widget__input"
              disabled={isLoading}
            />
            <button type="submit" disabled={!inputValue.trim() || isLoading} className="chat-widget__send-button">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      <button 
        type="button" 
        className="chat-widget__fab" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}

function sortMessages(messages: KnowledgeMessage[]) {
  return [...messages].sort((left, right) => (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  ));
}

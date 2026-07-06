import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog, useToast } from '@boilerplate/ui-common';
import { apiGetTenantSettings } from '../../../core/api-client';
import { KnowledgeChatPanel } from '../components/KnowledgeChatPanel';
import { KnowledgeSkillsPanel } from '../components/KnowledgeSkillsPanel';
import { KnowledgeSourcesPanel } from '../components/KnowledgeSourcesPanel';
import {
  askKnowledgeBotStream,
  createKnowledgeSkill,
  createKnowledgeSource,
  deleteKnowledgeSkill,
  deleteKnowledgeSource,
  listKnowledgeMessages,
  listKnowledgeModels,
  listKnowledgeSkills,
  listKnowledgeSources,
  type KnowledgeMessage,
  type KnowledgeSkill,
  type KnowledgeSource,
  type KnowledgeSourceKind,
} from '../api';

export function KnowledgeBotPage() {
  const { showToast } = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [skills, setSkills] = useState<KnowledgeSkill[]>([]);
  const [messages, setMessages] = useState<KnowledgeMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [sourceName, setSourceName] = useState('');
  const [sourceKind, setSourceKind] = useState<KnowledgeSourceKind>('text');
  const [sourceContent, setSourceContent] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillInstruction, setSkillInstruction] = useState('');
  const [model, setModel] = useState('');
  const [message, setMessage] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [pendingDeleteSource, setPendingDeleteSource] = useState<KnowledgeSource | null>(null);
  const [pendingDeleteSkill, setPendingDeleteSkill] = useState<KnowledgeSkill | null>(null);

  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const load = useCallback(async () => {
    const [nextSources, nextSkills, nextMessages] = await Promise.all([
      listKnowledgeSources(),
      listKnowledgeSkills(),
      listKnowledgeMessages(),
    ]);
    setSources(nextSources);
    setSkills(nextSkills);
    setMessages(nextMessages);
  }, []);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      try {
        await load();
      } catch (err) {
        if (active) showToast(err instanceof Error ? err.message : 'Could not load knowledge bot', 'error');
      }
    };
    void fetchAll();
    return () => { active = false; };
  }, [load, showToast]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listKnowledgeModels().catch((): string[] => []),
      apiGetTenantSettings().catch(() => null),
    ]).then(([nextModels, settings]) => {
      if (!active) return;
      setModels(nextModels);
      const tenantDefault = settings?.settings.integrations.aiModel;
      const fallback = nextModels[0] ?? 'qwen3:0.6b';
      const resolvedDefault: string =
        tenantDefault && (nextModels.length === 0 || nextModels.includes(tenantDefault))
          ? tenantDefault
          : fallback;
      setModel((current) => current || resolvedDefault);
    });
    return () => { active = false; };
     
  }, []);

  async function saveSource() {
    if (!sourceName.trim()) return;
    try {
      const source = await createKnowledgeSource({
        name: sourceName.trim(),
        kind: sourceKind,
        content: sourceContent.trim(),
      });
      setSources((current) => [source, ...current]);
      setSourceName('');
      setSourceContent('');
      showToast('Source added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add source', 'error');
    }
  }

  async function saveSkill() {
    if (!skillName.trim()) return;
    try {
      const skill = await createKnowledgeSkill({
        name: skillName.trim(),
        instruction: skillInstruction.trim(),
        enabled: true,
      });
      setSkills((current) => [skill, ...current]);
      setSkillName('');
      setSkillInstruction('');
      showToast('Skill added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add skill', 'error');
    }
  }

  async function confirmDeleteSource() {
    if (!pendingDeleteSource) return;
    try {
      await deleteKnowledgeSource(pendingDeleteSource.id);
      setSources((current) => current.filter((item) => item.id !== pendingDeleteSource.id));
      setPendingDeleteSource(null);
      showToast('Source deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete source', 'error');
    }
  }

  async function confirmDeleteSkill() {
    if (!pendingDeleteSkill) return;
    try {
      await deleteKnowledgeSkill(pendingDeleteSkill.id);
      setSkills((current) => current.filter((item) => item.id !== pendingDeleteSkill.id));
      setPendingDeleteSkill(null);
      showToast('Skill deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete skill', 'error');
    }
  }

  async function ask() {
    if (!message.trim()) return;
    const now = new Date().toISOString();
    const userMessage: KnowledgeMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      model: null,
      citations: [],
      createdAt: now,
    };
    const assistantMessageId = `local-assistant-${Date.now()}`;
    const assistantMessage: KnowledgeMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      model: null,
      citations: [],
      createdAt: now,
    };
    setMessages((current) => [assistantMessage, userMessage, ...current]);
    setMessage('');
    setIsAsking(true);
    try {
      for await (const chunk of askKnowledgeBotStream(userMessage.content, model)) {
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: item.content + chunk.delta,
                  model: chunk.model ?? item.model,
                  citations: chunk.citations ?? item.citations,
                }
              : item,
          ),
        );
      }
      // Replace the two locally-tracked messages with the persisted rows
      // (real ids, server timestamps) once the stream has fully landed.
      await load();
    } catch (err) {
      setMessages((current) =>
        current.filter((item) => item.id !== userMessage.id && item.id !== assistantMessageId),
      );
      showToast(err instanceof Error ? err.message : 'Could not reach the AI service', 'error');
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <section className="knowledge-page" aria-label="Knowledge bot">
      <div className="knowledge-sidebar">
        <KnowledgeSourcesPanel
          sources={sources}
          sourceName={sourceName}
          sourceKind={sourceKind}
          sourceContent={sourceContent}
          onSourceNameChange={setSourceName}
          onSourceKindChange={setSourceKind}
          onSourceContentChange={setSourceContent}
          onSaveSource={() => void saveSource()}
          onDeleteSource={setPendingDeleteSource}
        />

        <KnowledgeSkillsPanel
          skills={skills}
          skillName={skillName}
          skillInstruction={skillInstruction}
          onSkillNameChange={setSkillName}
          onSkillInstructionChange={setSkillInstruction}
          onSaveSkill={() => void saveSkill()}
          onDeleteSkill={setPendingDeleteSkill}
        />
      </div>

      <KnowledgeChatPanel
        messages={orderedMessages}
        model={model}
        models={models}
        message={message}
        isAsking={isAsking}
        onModelChange={setModel}
        onMessageChange={setMessage}
        onAsk={() => void ask()}
      />

      <ConfirmDialog
        isOpen={pendingDeleteSource !== null}
        title="Delete source?"
        message={pendingDeleteSource ? `Delete "${pendingDeleteSource.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDeleteSource()}
        onCancel={() => setPendingDeleteSource(null)}
      />
      <ConfirmDialog
        isOpen={pendingDeleteSkill !== null}
        title="Delete skill?"
        message={pendingDeleteSkill ? `Delete "${pendingDeleteSkill.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDeleteSkill()}
        onCancel={() => setPendingDeleteSkill(null)}
      />
    </section>
  );
}

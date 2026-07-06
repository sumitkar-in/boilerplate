import { Bot, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '@boilerplate/ui-common';
import type { KnowledgeSkill } from '../api';

export function KnowledgeSkillsPanel({
  skills,
  skillName,
  skillInstruction,
  onSkillNameChange,
  onSkillInstructionChange,
  onSaveSkill,
  onDeleteSkill,
}: {
  skills: KnowledgeSkill[];
  skillName: string;
  skillInstruction: string;
  onSkillNameChange: (value: string) => void;
  onSkillInstructionChange: (value: string) => void;
  onSaveSkill: () => void;
  onDeleteSkill: (skill: KnowledgeSkill) => void;
}) {
  return (
    <section className="knowledge-panel">
      <h2><Sparkles size={16} /> Skills</h2>
      <Input label="Name" value={skillName} onChange={(event) => onSkillNameChange(event.target.value)} placeholder="Answer policy questions" />
      <Textarea label="Instruction" value={skillInstruction} rows={4} onChange={(event) => onSkillInstructionChange(event.target.value)} />
      <Button variant="ghost" onClick={onSaveSkill}><Plus size={16} /> Add skill</Button>
      <div className="knowledge-list">
        {skills.map((skill) => (
          <p key={skill.id}>
            <Bot size={14} />
            <span>{skill.name}</span>
            <small>{skill.enabled ? 'enabled' : 'disabled'}</small>
            <Button variant="ghost" size="sm" onClick={() => onDeleteSkill(skill)} aria-label={`Delete ${skill.name}`}>
              <Trash2 size={14} />
            </Button>
          </p>
        ))}
      </div>
    </section>
  );
}

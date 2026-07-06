import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  KNOWLEDGE_SOURCE_KINDS,
  type KnowledgeSourceKind,
} from '../entities/knowledge-source';

export class CreateKnowledgeSourceDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsIn(KNOWLEDGE_SOURCE_KINDS)
  kind!: KnowledgeSourceKind;

  @IsString()
  @IsOptional()
  content?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

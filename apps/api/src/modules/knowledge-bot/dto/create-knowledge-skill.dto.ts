import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateKnowledgeSkillDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instruction?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

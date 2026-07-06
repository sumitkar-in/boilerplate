import { IsOptional, IsString, MaxLength } from 'class-validator';

export class KnowledgeChatDto {
  @IsString()
  message!: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  model?: string;
}

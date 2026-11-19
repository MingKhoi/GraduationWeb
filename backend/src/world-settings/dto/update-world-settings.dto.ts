import { IsDateString, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateWorldSettingsDto {
  @IsOptional() @IsString() @MaxLength(120) eventTitle?: string;
  @IsOptional() @IsDateString() eventDate?: string;
  @IsOptional() @IsString() @MaxLength(2000) eventDescription?: string;
  @IsOptional() @IsString() @MaxLength(1000) welcomeMessage?: string;
  @IsOptional() @IsString() @MaxLength(120) worldName?: string;
  @IsOptional() @IsUrl() @MaxLength(2000) musicUrl?: string;
  @IsOptional() @IsString() @MaxLength(50) environment?: string;
  @IsOptional() @IsString() @MaxLength(1000) announcement?: string;
}

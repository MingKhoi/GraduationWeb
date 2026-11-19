import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    nickname: string;

    @IsOptional()
    @IsUrl()
    avatarUrl?: string;
}
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    IsDateString,
    MaxLength,
} from 'class-validator';

export class CreateInvitationDto {
    @IsUUID()
    guestId: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    message?: string;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
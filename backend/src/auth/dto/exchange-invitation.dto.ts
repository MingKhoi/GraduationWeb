import {
    IsString,
    Length,
    Matches,
} from 'class-validator';

export class ExchangeInvitationDto {
    @IsString()
    @Length(64, 64)
    @Matches(/^[a-f0-9]{64}$/)
    token: string;
}
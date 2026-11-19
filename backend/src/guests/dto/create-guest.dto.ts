import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGuestDto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsOptional()
    @IsEmail()
    email?: string;
}
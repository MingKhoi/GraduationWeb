import { IsIn } from 'class-validator';

export class UpdateRsvpDto {
    @IsIn(['ATTENDING', 'NOT_ATTENDING'])
    status: 'ATTENDING' | 'NOT_ATTENDING';
}
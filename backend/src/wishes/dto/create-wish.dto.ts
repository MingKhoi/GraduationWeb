import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const WISH_PAPER_COLORS = [
  'pink',
  'yellow',
  'blue',
  'purple',
  'green',
] as const;

export type WishPaperColor = (typeof WISH_PAPER_COLORS)[number];

export class CreateWishDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  message!: string;

  @IsIn([...WISH_PAPER_COLORS])
  paperColor!: WishPaperColor;
}

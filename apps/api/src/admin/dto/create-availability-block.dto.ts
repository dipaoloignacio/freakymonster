import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAvailabilityBlockDto {
  @IsString()
  @IsNotEmpty()
  artistId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

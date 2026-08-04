import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class GetAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  artistId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  date: string;
}

import { IsNotEmpty } from 'class-validator';

export class ExtractReceiptDto {
  @IsNotEmpty()
  file: any; // Will be handled by Multer (NestJS file upload)
}
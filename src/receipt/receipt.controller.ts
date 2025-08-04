import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptService } from './receipt.service';

/**
 * Controller for receipt processing operations
 * Handles HTTP requests related to receipt extraction and processing
 */
@Controller('receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  /**
   * Extracts receipt details from uploaded image file
   * POST /receipt/extract-receipt-details
   * 
   * @param file - Uploaded receipt image file
   * @returns Extracted receipt data including items, totals, and metadata
   */
  @Post('extract-receipt-details')
  @UseInterceptors(FileInterceptor('file')) // Handle single file upload with 'file' field name
  async extractReceiptDetails(@UploadedFile() file: Express.Multer.File) {
    return await this.receiptService.extractReceiptDetails(file);
  }
}

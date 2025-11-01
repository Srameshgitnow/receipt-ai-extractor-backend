import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Receipt } from './entities/receipt.entity';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as Tesseract from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  async extractReceiptDetails(file: Express.Multer.File): Promise<Receipt> {
    // 1. Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      this.logger.warn(`Rejected file type: ${file.mimetype}`);
      throw new BadRequestException('Invalid file type');
    }

    // 2. Save image locally with unique filename
    const uploadsDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      this.logger.error('Failed to create uploads directory', err);
      throw new InternalServerErrorException('Failed to create uploads directory');
    }
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    const savePath = path.join(uploadsDir, uniqueName);
    try {
      await fs.writeFile(savePath, file.buffer);
    } catch (err) {
      this.logger.error('Failed to save image', err);
      throw new InternalServerErrorException('Failed to save image');
    }

    // 3. Use Tesseract to extract text
    let ocrResult;
    try {
      ocrResult = await Tesseract.recognize(savePath, 'eng');
      
    } catch (err) {
      this.logger.error('OCR extraction failed', err);
      throw new InternalServerErrorException('OCR extraction failed');
    }
    const text = ocrResult.data.text;

    // 4. Parse text for receipt details (simple regex-based parsing)
    const dateMatch = text.match(/\d{2,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/);
    const currencyMatch = text.match(/USD|SGD|EUR|INR|GBP|MYR|AUD|CAD|JPY|CNY/);
    const vendorMatch = text.split('\n')[0];
    const totalMatch = text.match(/Total\s*[:]?[\s$]*(\d+[\.\d]*)/i);
    const taxMatch = text.match(/(GST|Tax)\s*[:]?[\s$]*(\d+[\.\d]*)/i);

    // Items extraction (very basic, improve as needed)
    const itemRegex = /([A-Za-z0-9\s]+)\s+(\d+[\.\d]*)/g;
    let items: Array<{ item_name: string; item_cost: number }> = [];
    let itemMatch;
    while ((itemMatch = itemRegex.exec(text)) !== null) {
      items.push({ item_name: itemMatch[1].trim(), item_cost: parseFloat(itemMatch[2]) });
    }

    // 5. Build receipt object
    const receipt: Receipt = {
      id: uuidv4(),
      date: dateMatch ? dateMatch[0] : '',
      currency: currencyMatch ? currencyMatch[0] : '',
      vendor_name: vendorMatch ? vendorMatch.trim() : '',
      receipt_items: items,
      tax: taxMatch ? parseFloat(taxMatch[2]) : 0,
      total: totalMatch ? parseFloat(totalMatch[1]) : 0,
      image_url: `/uploads/${uniqueName}`,
    };

    // 6. Save receipt to local JSON file (async)
    const jsonPath = path.join(uploadsDir, 'receipts.json');
    let receiptsArr: Receipt[] = [];
    try {
      if (await fs.stat(jsonPath).then(() => true, () => false)) {
        const fileData = await fs.readFile(jsonPath, 'utf8');
        receiptsArr = JSON.parse(fileData);
      }
    } catch (e) {
      this.logger.warn('Could not read receipts.json, starting new file');
      receiptsArr = [];
    }
    receiptsArr.push(receipt);
    try {
      await fs.writeFile(jsonPath, JSON.stringify(receiptsArr, null, 2));
    } catch (err) {
      this.logger.error('Failed to save receipts.json', err);
      throw new InternalServerErrorException('Failed to save receipt data');
    }

    // 7. Return extracted receipt as API response
    return receipt;
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { Receipt } from './entities/receipt.entity';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as Tesseract from 'tesseract.js';
import { v4 as uuidv4, v4 } from 'uuid';

// Mock external dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
  },
}));

jest.mock('tesseract.js');
jest.mock('uuid');
jest.mock('path');

describe('ReceiptService', () => {
  let service: ReceiptService;
  let mockFs: jest.Mocked<typeof fs>;
  let mockTesseract: jest.Mocked<typeof Tesseract>;
  let mockUuidv4: jest.MockedFunction<typeof uuidv4>;

  // Mock file object for testing
  const createMockFile = (mimetype: string, originalname: string = 'test.jpg'): Express.Multer.File => ({
    mimetype,
    originalname,
    buffer: Buffer.from('fake-image-data'),
    fieldname: 'file',
    encoding: '7bit',
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiptService],
    }).compile();

    service = module.get<ReceiptService>(ReceiptService);
    mockFs = fs as jest.Mocked<typeof fs>;
    mockTesseract = Tesseract as jest.Mocked<typeof Tesseract>;

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    (v4 as jest.Mock).mockReturnValue('test-uuid-123');
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('extractReceiptDetails', () => {
    it('should extract details from valid image successfully', async () => {
      // Arrange
      const file = createMockFile('image/jpeg', 'receipt.jpg');
      const mockOcrResult = {
        data: {
          text: `STARBUCKS COFFEE
12/25/2023
Coffee Large 4.99
Muffin 3.50
Tax 0.68
Total 9.17`
        }
      };

      mockTesseract.recognize.mockResolvedValue(mockOcrResult as any);
      mockFs.stat.mockRejectedValue(new Error('File not found')); // receipts.json doesn't exist
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.extractReceiptDetails(file);

      // Assert
      expect(result).toBeInstanceOf(Object);
      expect(result.id).toBe('test-uuid-123');
      expect(result.date).toBe('12/25/2023');
      expect(result.vendor_name).toBe('STARBUCKS COFFEE');
      expect(result.currency).toBe('');
      expect(result.tax).toBe(0.68);
      expect(result.total).toBe(9.17);
      expect(result.image_url).toBe('/uploads/test-uuid-123_receipt.jpg');
      expect(result.receipt_items).toEqual([
        { item_name: 'Coffee Large', item_cost: 4.99 },
        { item_name: 'Muffin', item_cost: 3.50 }
      ]);

      // Verify file operations
      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // Image file + receipts.json
      expect(mockTesseract.recognize).toHaveBeenCalledWith(expect.any(String), 'eng');
    });

    it('should throw BadRequestException for invalid file type', async () => {
      // Arrange
      const file = createMockFile('application/pdf', 'document.pdf');

      // Act & Assert
      await expect(service.extractReceiptDetails(file)).rejects.toThrow(BadRequestException);
      await expect(service.extractReceiptDetails(file)).rejects.toThrow('Invalid file type');
    });

    it('should accept valid image types', async () => {
      // Test all valid file types
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      
      for (const mimetype of validTypes) {
        const file = createMockFile(mimetype);
        const mockOcrResult = { data: { text: 'Test receipt text' } };
        mockTesseract.recognize.mockResolvedValue(mockOcrResult as any);
        mockFs.stat.mockRejectedValue(new Error('File not found'));

        // Should not throw for valid types
        await expect(service.extractReceiptDetails(file)).resolves.toBeDefined();
      }
    });

    it('should throw InternalServerErrorException when directory creation fails', async () => {
      // Arrange
      const file = createMockFile('image/jpeg');
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(service.extractReceiptDetails(file)).rejects.toThrow(InternalServerErrorException);
      await expect(service.extractReceiptDetails(file)).rejects.toThrow('Failed to create uploads directory');
    });

    it('should throw InternalServerErrorException when image save fails', async () => {
      // Arrange
      const file = createMockFile('image/jpeg');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full')); // First writeFile call fails

      // Act & Assert
      await expect(service.extractReceiptDetails(file)).rejects.toThrow(InternalServerErrorException);
      await expect(service.extractReceiptDetails(file)).rejects.toThrow('Failed to save image');
    });

    it('should throw InternalServerErrorException when OCR extraction fails', async () => {
      // Arrange
      const file = createMockFile('image/jpeg');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockTesseract.recognize.mockRejectedValue(new Error('OCR processing failed'));

      // Act & Assert
      await expect(service.extractReceiptDetails(file)).rejects.toThrow(InternalServerErrorException);
      await expect(service.extractReceiptDetails(file)).rejects.toThrow('OCR extraction failed');
    });

    it('should handle receipts.json file operations correctly', async () => {
      // Arrange
      const file = createMockFile('image/jpeg');
      const mockOcrResult = { data: { text: 'Simple receipt' } };
      const existingReceipts: Receipt[] = [{
        id: 'existing-receipt',
        date: '01/01/2023',
        currency: 'USD',
        vendor_name: 'Old Store',
        receipt_items: [],
        tax: 0,
        total: 10.00,
        image_url: '/uploads/old.jpg'
      }];

      mockTesseract.recognize.mockResolvedValue(mockOcrResult as any);
      mockFs.stat.mockResolvedValue({} as any); // receipts.json exists
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingReceipts));

      // Act
      const result = await service.extractReceiptDetails(file);

      // Assert
      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('receipts.json'), 'utf8');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('receipts.json'),
        expect.stringContaining('"id":"test-uuid-123"')
      );
    });

    it('should handle receipts.json save failure', async () => {
      // Arrange
      const file = createMockFile('image/jpeg');
      const mockOcrResult = { data: { text: 'Simple receipt' } };

      mockTesseract.recognize.mockResolvedValue(mockOcrResult as any);
      mockFs.stat.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile
        .mockResolvedValueOnce(undefined) // Image save succeeds
        .mockRejectedValueOnce(new Error('Disk full')); // receipts.json save fails

      // Act & Assert
      await expect(service.extractReceiptDetails(file)).rejects.toThrow(InternalServerErrorException);
      await expect(service.extractReceiptDetails(file)).rejects.toThrow('Failed to save receipt data');
    });

    it('should parse receipt text with various formats correctly', async () => {
      // Arrange
      const file = createMockFile('image/jpeg');
      const mockOcrResult = {
        data: {
          text: `WALMART SUPERCENTER
2023-12-01
Apples 2.99
Bread 1.50
Milk USD 3.25
GST: 0.41
Total: 8.15`
        }
      };

      mockTesseract.recognize.mockResolvedValue(mockOcrResult as any);
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.extractReceiptDetails(file);

      // Assert
      expect(result.date).toBe('2023-12-01');
      expect(result.currency).toBe('USD');
      expect(result.vendor_name).toBe('WALMART SUPERCENTER');
      expect(result.tax).toBe(0.41);
      expect(result.total).toBe(8.15);
      expect(result.receipt_items).toContainEqual({ item_name: 'Apples', item_cost: 2.99 });
      expect(result.receipt_items).toContainEqual({ item_name: 'Bread', item_cost: 1.50 });
    });

    it('should handle empty or malformed OCR text gracefully', async () => {
      // Arrange
      const file = createMockFile('image/jpeg');
      const mockOcrResult = { data: { text: '' } };

      mockTesseract.recognize.mockResolvedValue(mockOcrResult as any);
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.extractReceiptDetails(file);

      // Assert
      expect(result.id).toBe('test-uuid-123');
      expect(result.date).toBe('');
      expect(result.currency).toBe('');
      expect(result.vendor_name).toBe('');
      expect(result.receipt_items).toEqual([]);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should generate unique filenames for uploaded images', async () => {
      // Arrange
      const file = createMockFile('image/jpeg', 'receipt.jpg');
      const mockOcrResult = { data: { text: 'Test' } };

      (v4 as jest.Mock)
        .mockReturnValueOnce('uuid-for-receipt-id')
        .mockReturnValueOnce('uuid-for-filename');
      mockTesseract.recognize.mockResolvedValue(mockOcrResult as any);
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.extractReceiptDetails(file);

      // Assert
      expect(result.id).toBe('uuid-for-receipt-id');
      expect(result.image_url).toBe('/uploads/uuid-for-filename_receipt.jpg');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('uuid-for-filename_receipt.jpg'),
        file.buffer
      );
    });
  });
});
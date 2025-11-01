
# 🧠 Receipt AI Extractor – Backend (NestJS + Tesseract)

A NestJS backend service that accepts receipt images, **extracts key details using Tesseract OCR**, **persists the extracted data to a JSON file**, and **exposes it via REST**.

It includes:
- A service function to extract receipt details from an image.
- An API endpoint to trigger the extraction.
- Data persistence (file).
- Unit tests covering edge cases and expected scenarios.

---

## ✨ Features

- **POST `/receipt/extract-receipt-details`**
  - Upload a receipt image (`.jpg`, `.jpeg`, `.png`) with multipart field name **`file`**
- **Extraction fields**
  - `vendor_name`, `date`, `currency`, `items[]` (each: `item_name`, `item_cost`), `tax`, `total`, `image_url`
- **OCR**
  - Uses **Tesseract.js** (`eng`) to extract raw text
- **Parsing (baseline)**
  - Date via regex (`\d{2,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}`)
  - Currency codes (USD|SGD|EUR|INR|GBP|MYR|AUD|CAD|JPY|CNY)
  - Vendor (first non-empty line)
  - Items via `([A-Za-z0-9\s]+)\s+(\d+[\.\d]*)`
  - Tax via `(GST|Tax)`
  - Total via `Total`
- **Persistence**
  - Appends to `uploads/receipts.json` and stores the image in `uploads/`
- **Validation & errors**
  - Rejects unsupported mime types, handles OCR & disk errors with meaningful responses
- **Logging**
  - Uses Nest `Logger` for traceability

---

## 🧰 Tech Stack

- **NestJS** (TypeScript)
- **Multer** (memory storage) for file upload
- **Tesseract.js** for OCR
- **UUID** for unique filenames/IDs
- **Jest** for unit/e2e tests

## ⚙️ Install & Run


npm install

npm run start:dev

or

npm run start

Server runs at: http://localhost:${PORT} (default 3000)

---------------

🚀 Endpoint
POST /receipt/extract-receipt-details

Description: Upload a receipt image to extract structured data.

Request:

Content-Type: multipart/form-data

Field name: file

cURL

curl -X POST http://localhost:3000/receipt/extract-receipt-details \
  -H "Accept: application/json" \
  -F "file=@./samples/receipt1.jpg"


Response (example):

{
  "id": "a5b9b8e6-8c7b-4f0a-98c0-0e7f2d9e3b8a",
  "date": "2025-05-15",
  "currency": "USD",
  "vendor_name": "Starbucks",
  "receipt_items": [
    { "item_name": "Latte", "item_cost": 4.5 },
    { "item_name": "Croissant", "item_cost": 2.75 }
  ],
  "tax": 0.7,
  "total": 7.95,
  "image_url": "/uploads/uuid_receipt1.jpg"
}


Errors (examples):

{ "statusCode": 400, "message": "Invalid file type", "error": "Bad Request" }

{ "statusCode": 500, "message": "OCR extraction failed" }


------

🧪 Testing
npm run test         # unit
npm run test:e2e     # end-to-end


Recommended tests

Controller: returns 400 when file missing

Service: rejects unsupported mimetypes

Service: parses known OCR text fixture into expected schema

Service: writes to uploads/receipts.json

Service: handles write failures (mock fs error)

E2E: happy path with a real small sample image

-----------------------


🛡️ Notes & Next Steps

Regex parsing is baseline; improve with richer parsers or LLM post-processing.

Consider DB persistence (PostgreSQL + Prisma/TypeORM) over JSON file for production.

Add rate limits, file size limits, and MIME-type checks via Multer.

If you need to serve images externally, keep uploads/ out of the repo and mount a volume in prod.

For Docker, mount uploads as a volume; don’t bake it into the image.

## AI Model 

AI Model Used

The application uses Tesseract.js (open-source OCR) combined with custom parsing logic to extract structured data from the OCR text.

## Data Persistence

Data Persistence
The receipt image and extracted data are stored using a lightweight file-based approach (e.g., fs) for demo purposes. This can easily be extended to a database like SQLite or MongoDB.

------

📄 License

MIT



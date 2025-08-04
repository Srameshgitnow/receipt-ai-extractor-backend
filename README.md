# Engineering Assessment Backend (NestJS)

## Overview

This project is a NestJS backend service that accepts receipt images, extracts key details using an AI model, persists the extracted data, and exposes it through a REST API.

It includes:
- A service function to extract receipt details from an image.
- An API endpoint to trigger the extraction.
- Data persistence (file).
- Unit tests covering edge cases and expected scenarios.

## Project Initialization

1. Clone this repository locally

2. Create a new working branch (e.g. `git checkout -b working-branch`)

3. Set your node environment

   - Run `nvm install && nvm use`, or

   - Alternatively manually set your node to v18+ and npm to v10+

4. Run `npm install` to install dependencies

   Note: Ensure you have properly set your node version before this step

5. Run `npm run start:dev` or `npm run start:debug` to spin-up the backend

   Your backend server should be running on `localhost:3000`, unless a different port is defined in `process.env.PORT`.

   You can check that the server is running correctly by trying the base endpoint `GET http://localhost:3000`, which should return the text "Hello World!"


## AI Model 

AI Model Used

The application uses Tesseract.js (open-source OCR) combined with custom parsing logic to extract structured data from the OCR text.

## Data Persistence

Data Persistence
The receipt image and extracted data are stored using a lightweight file-based approach (e.g., fs) for demo purposes. This can easily be extended to a database like SQLite or MongoDB.



## Project Work

1. Complete all of your work in the working branch that you created above

2. Push commits to your remote working branch as often as you need

## Project Submission

When you are ready to submit your work:

1. Create a PR into `main` branch

2. Merge the above PR

**⚠️ IMPORTANT: The above action is a one-time submission event. Do not open a PR until you are ready to submit your project.**

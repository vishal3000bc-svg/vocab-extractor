import express from 'express';
import { GoogleCloudStorage } from '@google-cloud/storage';
import { readFile } from 'fs/promises';
import { PDFParser } from 'pdf2json';
import * as docx from 'docx-parser';
import Jimp from 'jimp';
import { createClient } from '@google/maps';

const router = express.Router();
const storage = new GoogleCloudStorage();

// Initialize Google Maps Client for Google AI services
const googleMapsClient = createClient({
  key: 'YOUR_API_KEY',
  Promise: Promise
});

// Function to process PDF files
const processPDF = async (filePath: string) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', err => reject(err));
    pdfParser.on('pdfParser_dataReady', pdfData => {
      resolve(pdfData.formImage.Pages.map(page => page.Texts.map(text => text.R[0].T).join(' ')).join('\n'));
    });

    pdfParser.loadPDF(filePath);
  });
};

// Function to process DOCX files
const processDOCX = async (filePath: string) => {
  return new Promise((resolve, reject) => {
    docx.parseDocx(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

// Function to process images
const processImage = async (filePath: string) => {
  const text = await Jimp.read(filePath).then(image => {
    return image.ocr();
  });
  return text;
};

// API route for document extraction
router.post('/extract', async (req, res) => {
  const { filePath, fileType } = req.body;

  try {
    let result;

    switch (fileType) {
      case 'pdf':
        result = await processPDF(filePath);
        break;
      case 'docx':
        result = await processDOCX(filePath);
        break;
      case 'image':
        result = await processImage(filePath);
        break;
      case 'text':
        result = await readFile(filePath, 'utf8');
        break;
      default:
        return res.status(400).send('Unsupported file type');
    }

    // Call Google Generative AI API (mock example)
    const aiResponse = await googleMapsClient.textSearch({ query: result });

    res.json({ extractedText: result, aiResponse: aiResponse.json });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing the file');
  }
});

export default router;

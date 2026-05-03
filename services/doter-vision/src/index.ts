import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import vision from '@google-cloud/vision';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Set up Multer for handling file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Google Cloud Vision Client
const client = new vision.ImageAnnotatorClient();

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'doter-vision-service' });
});

// Endpoint: Verify Proof of Work
// Request: multipart/form-data with 'image' field and 'expectedObject' field
app.post('/api/verify', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { expectedObject, taskType } = req.body;

    // Call Vision API to get labels
    const [result] = await client.labelDetection({ image: { content: req.file.buffer } });
    const labels = result.labelAnnotations || [];

    // Also get text detection in case it's a worksheet
    const [textResult] = await client.textDetection({ image: { content: req.file.buffer } });
    const textAnnotations = textResult.textAnnotations || [];

    let confidenceScore = 0;
    let isVerified = false;
    let feedback = '';

    // Strategy 1: Look for specific expected object
    if (expectedObject) {
      const match = labels.find((label) => 
        label.description?.toLowerCase().includes(expectedObject.toLowerCase())
      );
      
      if (match && match.score) {
        confidenceScore = match.score * 100;
        isVerified = confidenceScore > 75; // 75% threshold
        feedback = isVerified ? `Successfully verified ${expectedObject} in the image!` : `Detected ${expectedObject} but confidence was too low (${confidenceScore.toFixed(1)}%).`;
      } else {
        feedback = `Could not find ${expectedObject} in the image.`;
      }
    } 
    // Strategy 2: Check for Worksheet completion (lots of text)
    else if (taskType === 'WORKSHEET') {
      const fullText = textAnnotations[0]?.description || '';
      if (fullText.length > 50) { // arbitrary threshold for "filled worksheet"
        confidenceScore = 90;
        isVerified = true;
        feedback = 'Successfully verified worksheet completion!';
      } else {
        feedback = 'Image does not appear to contain a completed worksheet.';
      }
    }
    // Fallback: Just return labels
    else {
      return res.json({
        labels: labels.map(l => ({ description: l.description, score: l.score })),
        text: textAnnotations[0]?.description || ''
      });
    }

    res.json({
      isVerified,
      confidenceScore: Math.round(confidenceScore),
      feedback,
      topLabels: labels.slice(0, 3).map(l => l.description),
    });

  } catch (error) {
    console.error('Vision API Error:', error);
    res.status(500).json({ error: 'Failed to process image verification' });
  }
});

app.listen(port, () => {
  console.log(`👁️  Doter Vision Service running on port ${port}`);
});

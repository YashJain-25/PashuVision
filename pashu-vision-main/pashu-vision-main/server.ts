import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { generateSampleRegistrations } from './utils/sampleData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'registrations.json');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Initialize data file if it doesn't exist or is empty
  try {
    let registrations = [];
    try {
      const data = await fs.readFile(DATA_FILE, 'utf-8');
      registrations = JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid
    }

    // If no sample data exists, add it
    const hasSamples = registrations.some((r: any) => r.isSample);
    if (!hasSamples) {
      console.log('Generating sample data...');
      const samples = generateSampleRegistrations();
      registrations = [...registrations, ...samples];
      await fs.writeFile(DATA_FILE, JSON.stringify(registrations, null, 2));
    }
  } catch (error) {
    console.error('Error initializing data file:', error);
  }

  // API Routes
  app.get('/api/registrations', async (_req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch {
      res.status(500).json({ error: 'Failed to read registrations' });
    }
  });

  app.post('/api/registrations', async (req, res) => {
    try {
      const newReg = req.body;
      const data = await fs.readFile(DATA_FILE, 'utf-8');
      const registrations = JSON.parse(data);
      
      const index = registrations.findIndex((r: { id: string }) => r.id === newReg.id);
      if (index > -1) {
        registrations[index] = newReg;
      } else {
        registrations.push(newReg);
      }
      
      await fs.writeFile(DATA_FILE, JSON.stringify(registrations, null, 2));
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to save registration' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

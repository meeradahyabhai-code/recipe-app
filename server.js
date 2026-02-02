import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'recipes-data.json');
const app = express();

app.use(express.json({ limit: '10mb' }));

function readData() {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get all stored data
app.get('/api/storage', (_req, res) => {
  res.json(readData());
});

// Save all stored data
app.put('/api/storage', (req, res) => {
  writeData(req.body);
  res.json({ ok: true });
});

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Storage server running on http://localhost:${PORT}`);
});

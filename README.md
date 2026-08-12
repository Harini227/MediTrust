# MediTrust — Local Development

Quick steps to run the API and frontend locally for development.

Prerequisites
- Node.js 18+ installed
- MongoDB running locally (default: mongodb://127.0.0.1:27017)

Steps
1. Install dependencies

```bash
npm install
```

2. Copy `.env.example` to `.env` and adjust values if needed

```bash
cp .env.example .env
```

3. Start MongoDB if not already running (example for Windows using MongoDB Community)

```powershell
# Run in Administrator PowerShell
mongod --dbpath "C:\data\db"
```

4. Start the app (dev)

```bash
npm run dev
```

5. Open the frontend at: http://localhost:5000/meditrust.html

Notes
- The app falls back to a local MongoDB URI when `MONGO_URI` is not provided.
- By default OCR and AI providers are `dummy` for offline development. Set provider API keys in `.env` to enable real providers.

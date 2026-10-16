import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let scraperStatus = "idle";
let lastCompleted = null;
let scraperTimerStarted = false;
const intelPath = path.join(__dirname, 'public', 'scrapedIntel.json');
const pipelinePython = fs.existsSync(path.join(__dirname, '.venv', 'bin', 'python'))
  ? path.join(__dirname, '.venv', 'bin', 'python')
  : 'python3';
const MIN_SCRAPE_INTERVAL_MS = 30 * 60 * 1000;

const readIntelStatus = () => {
  try {
    const raw = fs.readFileSync(intelPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      newsCount: Array.isArray(parsed.news) ? parsed.news.length : 0,
      policyCount: Array.isArray(parsed.news) ? parsed.news.filter(item => item.category === 'policy').length : 0,
      mlas: Array.isArray(parsed.mlas) ? parsed.mlas.length : 0,
      updatedAt: fs.statSync(intelPath).mtime.toISOString(),
      currentAssembly: parsed.currentAssembly || null,
      coverageMeta: parsed.coverageMeta || {
        storyTarget: 100000,
        autoReloadThreshold: 10,
        scheduledServerSyncMinutes: 30,
      },
    };
  } catch {
    return {
      newsCount: 0,
      policyCount: 0,
      mlas: 0,
      updatedAt: null,
      currentAssembly: null,
      coverageMeta: {
        storyTarget: 100000,
        autoReloadThreshold: 10,
        scheduledServerSyncMinutes: 30,
      },
    };
  }
};

const launchScraper = (reason = 'scheduled') => {
  if (scraperStatus === "crawling") return false;

  scraperStatus = "crawling";
  const scriptPath = path.join(__dirname, 'scripts/run_intelligence_pipeline.py');
  console.log(`[Vite Middleware] Launching ${reason} pipeline: ${pipelinePython} ${scriptPath}`);

  const child = spawn(pipelinePython, [scriptPath, '--all', '--extended-public'], {
    cwd: __dirname,
    stdio: 'inherit',
  });
  let spawnFailed = false;
  child.on('error', (error) => {
    spawnFailed = true;
    scraperStatus = "idle";
    console.error(`[Vite Scraper Error]: ${error.message}`);
  });
  child.on('close', (code, signal) => {
    if (spawnFailed) return;
    scraperStatus = "idle";
    lastCompleted = new Date().toISOString();

    if (code !== 0) {
      console.error(`[Vite Scraper Error]: Pipeline exited with code ${code}, signal ${signal}`);
    }
  });
  return true;
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'scraper-api-middleware',
      configureServer(server) {
        if (!scraperTimerStarted) {
          scraperTimerStarted = true;
          setInterval(() => launchScraper('scheduled'), MIN_SCRAPE_INTERVAL_MS);
        }

        server.middlewares.use((req, res, next) => {
          // Handle CORS Preflight requests for our API endpoints
          if (req.method === 'OPTIONS' && (req.url === '/api/scrape' || req.url === '/api/scrape-status')) {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': req.headers.origin || '*',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Credentials': 'true'
            });
            res.end();
            return;
          }

          if (req.url === '/api/scrape' && req.method === 'POST') {
            res.writeHead(403, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': req.headers.origin || '*',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Credentials': 'true'
            });
            res.end(JSON.stringify({ success: false, error: "Manual scraping is disabled. Server scheduled sync is active." }));
            return;
          }

          if ((req.url === '/api/scrape-status' || req.url?.startsWith('/api/intel-status')) && req.method === 'GET') {
            const status = readIntelStatus();
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': req.headers.origin || '*',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Credentials': 'true'
            });
            res.end(JSON.stringify({ status: scraperStatus, lastCompleted, ...status }));
            return;
          }

          next();
        });
      }
    }
  ]
})

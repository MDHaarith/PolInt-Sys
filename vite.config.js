import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let scraperStatus = "idle";
let lastCompleted = null;
let scraperTimerStarted = false;
const intelPath = path.join(__dirname, 'public', 'scrapedIntel.json');
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
  const scriptPath = path.join(__dirname, 'scripts/scrape_political_intel.py');
  console.log(`[Vite Middleware] Launching ${reason} scraper: python3 ${scriptPath}`);

  exec(`python3 "${scriptPath}"`, (error, stdout, stderr) => {
    scraperStatus = "idle";
    lastCompleted = new Date().toISOString();

    if (error) {
      console.error(`[Vite Scraper Error]: ${error.message}`);
      return;
    }
    console.log(`[Vite Scraper Complete] stdout:\n${stdout}`);
    if (stderr) {
      console.warn(`[Vite Scraper warnings/stderr]:\n${stderr}`);
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
          console.log(`[Vite Middleware Log] URL: "${req.url}", Method: "${req.method}"`);
          
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

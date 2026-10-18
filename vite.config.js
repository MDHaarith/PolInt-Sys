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
// The pipeline writes this small summary next to the 25k-story snapshot; parsing the
// snapshot itself on every status poll took seconds.
const statusPath = path.join(__dirname, 'public', 'intelStatus.json');
const pipelinePython = fs.existsSync(path.join(__dirname, '.venv', 'bin', 'python'))
  ? path.join(__dirname, '.venv', 'bin', 'python')
  : 'python3';
const MIN_SCRAPE_INTERVAL_MS = 30 * 60 * 1000;

const readIntelStatus = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    return {
      newsCount: parsed.rawItemCount || 0,
      eventCount: parsed.eventCount || 0,
      mlas: parsed.mlaCount || 0,
      updatedAt: parsed.generatedAt || fs.statSync(statusPath).mtime.toISOString(),
      collectorHealth: parsed.collectorHealth || [],
      coverageMeta: parsed.coverageMeta || {
        storyTarget: 100000,
        autoReloadThreshold: 10,
        scheduledServerSyncMinutes: 30,
      },
    };
  } catch {
    return {
      newsCount: 0,
      eventCount: 0,
      mlas: 0,
      updatedAt: null,
      collectorHealth: [],
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

// Transformers.js loads the ONNX runtime's WebAssembly from jsdelivr when
// "search by meaning" is first used (alongside the model download), so the
// 27 MB copy Vite would otherwise emit is never requested. Dropping it keeps
// the Android app small.
const dropOnnxRuntimeWasm = () => ({
  name: 'drop-onnxruntime-wasm',
  generateBundle(_, bundle) {
    for (const name of Object.keys(bundle)) {
      if (/ort-wasm.*\.wasm$/.test(name)) delete bundle[name];
    }
  },
});

export default defineConfig(({ mode }) => ({
  // Android build bundles the trimmed snapshot from mobile-public/ instead of the 56 MB public/ folder.
  publicDir: mode === 'mobile' ? 'mobile-public' : 'public',
  build: { outDir: mode === 'mobile' ? 'dist-mobile' : 'dist' },
  plugins: [
    dropOnnxRuntimeWasm(),
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
}))

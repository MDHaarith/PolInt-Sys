import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateEventGraphData } from "../src/data/politicalDatabase.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const destination = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(projectRoot, "data", "curated-intelligence.json");

const payload = generateEventGraphData();
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(payload, null, 2), "utf8");
console.log(`Exported ${payload.nodes.length} curated nodes and ${payload.edges.length} links to ${destination}`);


import test from "node:test";
import assert from "node:assert/strict";

import { mergeTimeFabricData } from "../src/data/timeFabricData.js";


test("snapshot enriches curated nodes without replacing curated text", () => {
  const fallback = {
    nodes: [
      {
        id: "event_curated",
        title: "1965: Curated title",
        description: "Curated description",
        year: 1965,
        type: "event",
      },
    ],
    edges: [],
  };
  const snapshot = {
    events: [
      {
        id: "event_curated",
        title: "Automatic title",
        description: "Automatic description",
        occurred_at: "1965-01-25",
        event_type: "protest",
        verification_status: "curated",
        is_curated: true,
        evidence: [{ id: "raw-1" }],
      },
      {
        id: "event_extracted",
        title: "Minor arrest",
        description: "Reported arrest",
        occurred_at: "2026-06-10",
        year: 2026,
        event_type: "arrest",
        verification_status: "reported",
        is_curated: false,
        evidence: [{ id: "raw-2" }],
      },
    ],
    links: [
      {
        source: "event_curated",
        target: "event_extracted",
        relationship: "followed",
      },
    ],
  };

  const merged = mergeTimeFabricData(fallback, snapshot);

  assert.equal(merged.nodes.length, 2);
  assert.equal(merged.nodes[0].title, "1965: Curated title");
  assert.equal(merged.nodes[0].description, "Curated description");
  assert.equal(merged.nodes[0].occurredAt, "1965-01-25");
  assert.deepEqual(merged.nodes[0].evidence, [{ id: "raw-1" }]);
  assert.equal(merged.nodes[1].type, "arrest");
  assert.equal(merged.edges.length, 1);
});

const normalizeSnapshotEvent = (event) => ({
  id: event.id,
  title: event.year && !String(event.title || "").startsWith(`${event.year}:`)
    ? `${event.year}: ${event.title}`
    : event.title,
  year: event.year,
  occurredAt: event.occurred_at || event.occurredAt || null,
  occurredPrecision: event.occurred_precision || event.occurredPrecision || "unknown",
  description: event.description || "",
  fallout: event.impact_summary || event.fallout || "",
  type: event.event_type || event.type || "event",
  eventType: event.event_type || event.type || "event",
  domain: event.domain || event.event_type || "Political Event",
  politicianId: event.primary_politician_id || event.politicianId || null,
  partyId: event.party_id || event.partyId || null,
  verificationStatus: event.verification_status || event.verificationStatus || "reported",
  confidence: event.confidence ?? null,
  currentStatus: event.current_status || event.currentStatus || null,
  isCurated: Boolean(event.is_curated ?? event.isCurated),
  evidenceCount: event.evidence_count ?? event.evidenceCount ?? event.evidence?.length ?? 0,
  independentSourceCount: event.independent_source_count ?? event.independentSourceCount ?? 0,
  evidence: event.evidence || [],
  sourceLinks: event.sourceLinks || [],
  watchItems: event.watchItems || [],
});

export function mergeTimeFabricData(fallback, snapshot) {
  const nodeMap = new Map((fallback?.nodes || []).map(node => [node.id, { ...node, isCurated: true }]));
  const fallbackIds = new Set(nodeMap.keys());

  (snapshot?.events || []).forEach(rawEvent => {
    const event = normalizeSnapshotEvent(rawEvent);
    const curated = nodeMap.get(event.id);
    nodeMap.set(
      event.id,
      curated
        ? {
            ...event,
            ...curated,
            occurredAt: event.occurredAt,
            occurredPrecision: event.occurredPrecision,
            verificationStatus: event.verificationStatus,
            confidence: event.confidence,
            currentStatus: event.currentStatus || curated.currentStatus,
            evidenceCount: event.evidenceCount,
            independentSourceCount: event.independentSourceCount,
            evidence: event.evidence,
            sourceLinks: [...(curated.sourceLinks || []), ...(event.sourceLinks || [])],
            watchItems: curated.watchItems || event.watchItems,
            isCurated: true,
          }
        : event,
    );
  });

  const edgeMap = new Map();
  (fallback?.edges || []).forEach(edge => {
    const id = edge.id || `${edge.source}|${edge.target}|${edge.label || edge.relationship || "related"}`;
    edgeMap.set(id, { ...edge, id });
  });
  (snapshot?.links || []).forEach(edge => {
    const relationship = edge.relationship || edge.label || "related";
    const id = edge.id || `${edge.source}|${edge.target}|${relationship}`;
    edgeMap.set(id, { ...edge, id, label: relationship });
  });

  const nodes = Array.from(nodeMap.values()).sort((a, b) => {
    if (fallbackIds.has(a.id) !== fallbackIds.has(b.id)) return fallbackIds.has(a.id) ? -1 : 1;
    return (a.year || 9999) - (b.year || 9999) || String(a.title).localeCompare(String(b.title));
  });
  return { nodes, edges: Array.from(edgeMap.values()) };
}

export function buildEventByEvidenceId(events = []) {
  const map = new Map();
  events.forEach(event => {
    (event.evidence || []).forEach(item => {
      if (item.id) map.set(item.id, event);
    });
  });
  return map;
}

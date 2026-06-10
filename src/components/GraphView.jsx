import React, { useState, useEffect, useMemo } from "react";
import ReactFlow, { 
  MiniMap, Controls, Background, MarkerType, 
  Handle, Position 
} from "reactflow";
import "reactflow/dist/style.css";
import { AlertTriangle, ShieldAlert, Award, Network, GitCommit, HelpCircle } from "lucide-react";
import { findConnectionPath } from "../data/politicalDatabase";

// Custom Politician Node
const PoliticianNode = ({ data, selected }) => {
  const partyColor = `var(--color-${data.party || "ind"})`;
  return (
    <div className={`custom-node ${selected ? "selected" : ""}`} style={{ borderLeft: `5px solid ${partyColor}` }}>
      <Handle type="target" position={Position.Top} style={{ background: partyColor }} />
      <div className="node-header">
        <span className="node-badge" style={{ backgroundColor: `rgba(${data.party === 'dmk' ? '255, 46, 74' : data.party === 'aiadmk' ? '0, 168, 107' : '99, 102, 241'}, 0.15)`, color: partyColor }}>
          {data.party?.toUpperCase()}
        </span>
        {data.criminalCases && data.criminalCases.length > 0 && (
          <ShieldAlert size={14} className="text-danger" style={{ color: "var(--danger)" }} title={`${data.criminalCases.length} cases active`} />
        )}
      </div>
      <div className="node-title">{data.name}</div>
      <div className="node-sub">{data.role}</div>
      <div className="node-sub" style={{ fontStyle: "italic", fontSize: "0.7rem", color: "var(--text-muted)" }}>
        {data.constituency}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: partyColor }} />
    </div>
  );
};

// Custom Party Node
const PartyNode = ({ data, selected }) => {
  const color = `var(--color-${data.id || "ind"})`;
  return (
    <div className={`party-node ${selected ? "selected" : ""}`} style={{ borderColor: color, color: color, boxShadow: `0 0 15px rgba(${data.id === 'dmk' ? '255,46,74' : data.id === 'aiadmk' ? '0,168,107' : '99,102,241'}, 0.15)` }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{data.id?.toUpperCase()}</div>
      <div style={{ fontSize: "0.6rem", opacity: 0.8, marginTop: "2px" }}>{data.symbol}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
};

// Custom Event Node
const EventNode = ({ data, selected }) => {
  return (
    <div className={`event-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} style={{ background: "var(--danger)" }} />
      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
        <AlertTriangle size={12} style={{ color: "var(--danger)" }} />
        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--danger)", textTransform: "uppercase" }}>
          {data.type?.replace("_", " ")}
        </span>
      </div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{data.name}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>Year: {data.year}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--danger)" }} />
    </div>
  );
};

const nodeTypes = {
  politician: PoliticianNode,
  party: PartyNode,
  event: EventNode,
};

export default function GraphView({ db, onSelectItem }) {
  const [startPathNode, setStartPathNode] = useState("");
  const [endPathNode, setEndPathNode] = useState("");
  const [connectionPath, setConnectionPath] = useState(null);

  // Compute Layout Positions for Nodes
  const { nodes, edges } = useMemo(() => {
    const calculatedNodes = [];
    const calculatedEdges = [];

    const partyNodes = db.parties;
    const politicianNodes = db.politicians;
    const eventNodes = db.events;

    // 1. Position Party Nodes in a central circle
    const partyPositions = {};
    const partyCenterAngle = (2 * Math.PI) / Math.max(partyNodes.length, 1);
    
    partyNodes.forEach((party, idx) => {
      const radius = 180;
      const x = 400 + radius * Math.cos(idx * partyCenterAngle);
      const y = 350 + radius * Math.sin(idx * partyCenterAngle);
      
      partyPositions[party.id] = { x, y };
      calculatedNodes.push({
        id: party.id,
        type: "party",
        position: { x, y },
        data: party
      });
    });

    // 2. Position Politician Nodes in satellite clusters around their party nodes
    const partyPoliticianCounts = {};
    politicianNodes.forEach(p => {
      partyPoliticianCounts[p.party] = (partyPoliticianCounts[p.party] || 0) + 1;
    });

    const partyPoliticianIndices = {};
    politicianNodes.forEach((p) => {
      const partyId = p.party;
      const partyPos = partyPositions[partyId] || { x: 400, y: 350 };
      
      // Calculate index and angle offset
      const totalInParty = partyPoliticianCounts[partyId] || 1;
      const currentIdx = partyPoliticianIndices[partyId] || 0;
      partyPoliticianIndices[partyId] = currentIdx + 1;
      
      // Angle offset
      const angle = (2 * Math.PI * currentIdx) / totalInParty;
      const radius = 180; // Distance from party center
      const x = partyPos.x + radius * Math.cos(angle);
      const y = partyPos.y + radius * Math.sin(angle);

      calculatedNodes.push({
        id: p.id,
        type: "politician",
        position: { x, y },
        data: p
      });
    });

    // 3. Position Event Nodes in a row at the top or bottom
    eventNodes.forEach((e, idx) => {
      const x = 50 + idx * 250;
      const y = -100;
      
      calculatedNodes.push({
        id: e.id,
        type: "event",
        position: { x, y },
        data: e
      });
    });

    // 4. Map DB relationships to React Flow edges
    db.relationships.forEach((rel) => {
      const partyColor = db.parties.find(p => p.id === rel.source)?.color || 
                         db.parties.find(p => p.id === rel.target)?.color || 
                         "rgba(255, 255, 255, 0.2)";

      // Setup default color, change on path highlighting
      calculatedEdges.push({
        id: rel.id,
        source: rel.source,
        target: rel.target,
        label: rel.label,
        type: "smoothstep",
        animated: rel.type === "alliance",
        style: { stroke: partyColor, strokeWidth: 1.5, opacity: 0.6 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: partyColor,
          width: 12,
          height: 12
        },
        data: rel
      });
    });

    return { nodes: calculatedNodes, edges: calculatedEdges };
  }, [db]);

  // Handle pathfinder computation
  const handleFindPath = () => {
    if (!startPathNode || !endPathNode) {
      setConnectionPath(null);
      return;
    }
    const path = findConnectionPath(db, startPathNode, endPathNode);
    setConnectionPath(path);
  };

  const handleClearPath = () => {
    setStartPathNode("");
    setEndPathNode("");
    setConnectionPath(null);
  };

  // Modify node/edge states based on pathfinder highlighting
  const { displayNodes, displayEdges } = useMemo(() => {
    if (!connectionPath || connectionPath.length === 0) {
      return { displayNodes: nodes, displayEdges: edges };
    }

    const pathNodeIds = new Set(connectionPath.map(p => p.entity.id));
    const pathEdgeIds = new Set();
    
    // Find edge connections that match the path steps
    for (let i = 0; i < connectionPath.length - 1; i++) {
      const u = connectionPath[i].entity.id;
      const v = connectionPath[i + 1].entity.id;
      
      const matchingEdge = edges.find(
        e => (e.source === u && e.target === v) || (e.source === v && e.target === u)
      );
      if (matchingEdge) {
        pathEdgeIds.add(matchingEdge.id);
      }
    }

    // Highlight node styles
    const styledNodes = nodes.map((node) => {
      const isOnPath = pathNodeIds.has(node.id);
      return {
        ...node,
        // React flow merges node style overrides
        style: {
          ...node.style,
          opacity: isOnPath ? 1 : 0.15,
          boxShadow: isOnPath ? "0 0 25px var(--warning)" : "none",
          transform: isOnPath ? "scale(1.05)" : "scale(1)"
        }
      };
    });

    // Highlight edge styles
    const styledEdges = edges.map((edge) => {
      const isOnPath = pathEdgeIds.has(edge.id);
      return {
        ...edge,
        animated: isOnPath ? true : edge.animated,
        style: isOnPath 
          ? { stroke: "#fbbf24", strokeWidth: 3.5, opacity: 1, filter: "drop-shadow(0px 0px 5px rgba(251,191,36,0.8))" }
          : { ...edge.style, opacity: 0.05 }
      };
    });

    return { displayNodes: styledNodes, displayEdges: styledEdges };
  }, [nodes, edges, connectionPath]);

  // Click handler for nodes
  const onNodeClick = (event, node) => {
    onSelectItem({ type: "node", id: node.id });
  };

  // Click handler for edges
  const onEdgeClick = (event, edge) => {
    onSelectItem({ type: "edge", id: edge.id, edge: edge.data });
  };

  return (
    <div className="graph-canvas-container">
      {/* Floating Pathfinder Widget */}
      <div className="pathfinder-widget glass glass-hover">
        <div className="pathfinder-title">
          <Network size={16} style={{ color: "var(--accent-color)" }} />
          Connection Pathfinder
        </div>
        <div className="pathfinder-select-group">
          <select 
            className="select-dropdown" 
            style={{ width: "100%" }}
            value={startPathNode}
            onChange={(e) => setStartPathNode(e.target.value)}
          >
            <option value="">-- Select Origin Politician --</option>
            {db.politicians.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select 
            className="select-dropdown" 
            style={{ width: "100%" }}
            value={endPathNode}
            onChange={(e) => setEndPathNode(e.target.value)}
          >
            <option value="">-- Select Target Politician --</option>
            {db.politicians.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="button-btn" style={{ flex: 1, fontSize: "0.8rem", padding: "8px" }} onClick={handleFindPath}>
            Find Path
          </button>
          <button className="button-btn button-secondary" style={{ flex: 1, fontSize: "0.8rem", padding: "8px" }} onClick={handleClearPath}>
            Clear
          </button>
        </div>

        {/* Render Connection steps */}
        {connectionPath && (
          <div className="pathfinder-path-container">
            {connectionPath.map((step, idx) => (
              <div className="path-step" key={idx}>
                <div className="path-step-dot" />
                <div className="path-step-name">{step.entity.name}</div>
                {step.relationship && (
                  <div className="path-step-relation">
                    ↳ {step.relationship.label}: "{step.relationship.nuance.substring(0, 70)}..."
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* React Flow Core */}
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        fitView
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", button: { color: "white" } }} />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === "party") return `var(--color-${node.id})`;
            if (node.type === "event") return "var(--danger)";
            return `var(--color-${node.data?.party || "ind"})`;
          }}
          maskColor="rgba(8, 11, 17, 0.7)"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px" }}
        />
      </ReactFlow>
    </div>
  );
}

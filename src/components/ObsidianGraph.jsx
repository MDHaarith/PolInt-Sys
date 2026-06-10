import React, { useRef, useEffect, useState } from "react";
import { Settings, ZoomIn, ZoomOut, Maximize2, Info } from "lucide-react";

export default function ObsidianGraph({ 
  nodes, edges, activeMode, selectedItem, onSelectItem 
}) {
  const canvasRef = useRef(null);
  
  // Settings drawer state
  const [showSettings, setShowSettings] = useState(false);
  const [chargeStrength, setChargeStrength] = useState(240); // Repulsion force
  const [linkDistance, setLinkDistance] = useState(90);      // Rest length of links
  const [gravityStrength, setGravityStrength] = useState(0.04);
  const [showLabels, setShowLabels] = useState(true);

  // Simulation State Ref to avoid re-renders on animation tick
  const simStateRef = useRef({
    nodes: [],
    edges: [],
    draggingNode: null,
    hoveredNode: null,
    transform: { x: 0, y: 0, k: 1 }, // zoom/pan
    isPanning: false,
    panStart: { x: 0, y: 0 }
  });

  // Sync incoming React nodes/edges prop with simulation state
  useEffect(() => {
    const state = simStateRef.current;
    
    // Map existing nodes by id to preserve coordinates
    const nodeMap = new Map(state.nodes.map(n => [n.id, n]));
    
    state.nodes = nodes.map(n => {
      const existing = nodeMap.get(n.id);
      
      return {
        ...n,
        // Preserve coords, or spawn randomly near center
        x: existing ? existing.x : 200 + Math.random() * 80 - 40,
        y: existing ? existing.y : 200 + Math.random() * 80 - 40,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0
      };
    });

    // Resolve edge endpoints to simulation node references
    state.edges = edges.map(e => ({
      ...e,
      sourceNode: state.nodes.find(n => n.id === e.source),
      targetNode: state.nodes.find(n => n.id === e.target)
    })).filter(e => e.sourceNode && e.targetNode);

  }, [nodes, edges]);

  // Main Canvas Rendering and Verlet Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Handle canvas dimensions
    const resizeCanvas = () => {
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const state = simStateRef.current;
    // Initial centering pan if not already set
    if (state.transform.x === 0 && state.transform.y === 0) {
      state.transform.x = canvas.width / 2 - 200;
      state.transform.y = canvas.height / 2 - 200;
    }

    // Physics Force Simulation Step
    const tickPhysics = () => {
      const snodes = state.nodes;
      const sedges = state.edges;
      const kRepel = chargeStrength;
      const kAttract = 0.04;
      const kGravity = gravityStrength;
      const centerX = 200;
      const centerY = 200;
      
      // 1. Repulsion between all nodes
      for (let i = 0; i < snodes.length; i++) {
        const nodeA = snodes[i];
        for (let j = i + 1; j < snodes.length; j++) {
          const nodeB = snodes[j];
          let dx = nodeB.x - nodeA.x;
          let dy = nodeB.y - nodeA.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (dist < 280) {
            const force = kRepel / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // 2. Attraction along links
      sedges.forEach(edge => {
        const u = edge.sourceNode;
        const v = edge.targetNode;
        let dx = v.x - u.x;
        let dy = v.y - u.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = kAttract * (dist - linkDistance);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        u.vx += fx;
        u.vy += fy;
        v.vx -= fx;
        v.vy -= fy;
      });

      // 3. Gravity/Center Pull & Damping
      snodes.forEach(node => {
        let dx = centerX - node.x;
        let dy = centerY - node.y;
        node.vx += dx * kGravity;
        node.vy += dy * kGravity;

        // Apply friction
        node.vx *= 0.84;
        node.vy *= 0.84;

        if (state.draggingNode && state.draggingNode.id === node.id) {
          node.x = node.targetX;
          node.y = node.targetY;
          node.vx = 0;
          node.vy = 0;
        } else {
          node.x += node.vx;
          node.y += node.vy;
        }
      });
    };

    // Draw Elements on Canvas
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      // Apply zoom & pan translation
      ctx.translate(state.transform.x, state.transform.y);
      ctx.scale(state.transform.k, state.transform.k);

      const snodes = state.nodes;
      const sedges = state.edges;
      const hovered = state.hoveredNode;
      const active = selectedItem;

      // Determine highlighted nodes if hover exists
      const highlightedIds = new Set();
      if (hovered) {
        highlightedIds.add(hovered.id);
        sedges.forEach(e => {
          if (e.source === hovered.id) highlightedIds.add(e.target);
          if (e.target === hovered.id) highlightedIds.add(e.source);
        });
      }

      // 1. Draw Links
      sedges.forEach(edge => {
        const u = edge.sourceNode;
        const v = edge.targetNode;
        const isHighlighted = hovered 
          ? (edge.source === hovered.id || edge.target === hovered.id)
          : false;

        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(v.x, v.y);
        
        if (isHighlighted) {
          ctx.strokeStyle = edge.color || "var(--accent-color)";
          ctx.lineWidth = 1.6;
        } else {
          ctx.strokeStyle = hovered ? "rgba(255,255,255,0.015)" : "rgba(255, 255, 255, 0.06)";
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();

        // Draw Edge Label at midpoint
        if (showLabels && edge.label && (isHighlighted || !hovered)) {
          const midX = (u.x + v.x) / 2;
          const midY = (u.y + v.y) / 2;
          
          ctx.font = "6.5px var(--font-body)";
          const textWidth = ctx.measureText(edge.label).width;
          
          ctx.fillStyle = "rgba(9, 12, 16, 0.85)";
          ctx.fillRect(midX - textWidth/2 - 2, midY - 6, textWidth + 4, 10);
          
          ctx.fillStyle = isHighlighted ? "var(--text-primary)" : "var(--text-muted)";
          ctx.textAlign = "center";
          ctx.fillText(edge.label, midX, midY + 1.5);
        }
      });

      // 2. Draw Nodes
      snodes.forEach(node => {
        const isHovered = hovered && hovered.id === node.id;
        const isActive = active && active.id === node.id;
        const isHighlighted = hovered ? highlightedIds.has(node.id) : true;
        const opacity = isHighlighted ? 1 : 0.15;
        
        // Resolve Color
        let color = node.color || "#94a3b8"; // custom colored subnodes
        if (node.type === "politician") {
          color = "#60a5fa"; // blue default
          if (node.party) {
            color = `var(--color-${node.party.toLowerCase()})`;
          }
        } else if (node.type === "party") {
          color = `var(--color-${node.id.toLowerCase()})`;
        } else if (node.isStub) {
          color = "#334155";
        }

        const sizeRadius = node.size || 6;

        ctx.beginPath();
        ctx.arc(node.x, node.y, sizeRadius + (isActive ? 2 : 0) + (isHovered ? 1 : 0), 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        
        if (isActive || isHovered) {
          ctx.shadowBlur = 15;
          ctx.globalAlpha = 1;
        } else {
          ctx.shadowBlur = 0;
          ctx.globalAlpha = opacity;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Inner marker dot for focused node
        if (isActive) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2, 0, 2 * Math.PI);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

        // Draw node text label
        if (showLabels && (isHighlighted || isHovered || isActive)) {
          ctx.fillStyle = isActive ? "#ffffff" : isHovered ? "#ffffff" : "var(--text-secondary)";
          ctx.font = `${isActive ? "bold" : "500"} 9px var(--font-body)`;
          ctx.textAlign = "center";
          
          // Draw label above node
          ctx.fillText(node.title, node.x, node.y - sizeRadius - (isActive ? 7 : 5));
        }
      });

      ctx.restore();
    };

    // Frame runner loop
    const loop = () => {
      tickPhysics();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [chargeStrength, linkDistance, gravityStrength, showLabels, selectedItem, activeMode]);

  // Coordinate mapper Screen -> Canvas Space
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const state = simStateRef.current;
    const x = (screenX - state.transform.x) / state.transform.k;
    const y = (screenY - state.transform.y) / state.transform.k;
    
    return { x, y };
  };

  // Canvas Interactions
  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    const state = simStateRef.current;

    // Check if clicked node
    const clickedNode = state.nodes.find(node => {
      const dx = node.x - coords.x;
      const dy = node.y - coords.y;
      const sizeRadius = node.size || 6;
      return Math.sqrt(dx * dx + dy * dy) < sizeRadius + 8;
    });

    if (clickedNode) {
      state.draggingNode = clickedNode;
      clickedNode.targetX = coords.x;
      clickedNode.targetY = coords.y;
    } else {
      // Start panning background
      state.isPanning = true;
      state.panStart = { x: e.clientX - state.transform.x, y: e.clientY - state.transform.y };
    }
  };

  const handleMouseMove = (e) => {
    const state = simStateRef.current;
    const coords = getCanvasCoords(e);

    if (state.draggingNode) {
      state.draggingNode.targetX = coords.x;
      state.draggingNode.targetY = coords.y;
      return;
    }

    if (state.isPanning) {
      state.transform.x = e.clientX - state.panStart.x;
      state.transform.y = e.clientY - state.panStart.y;
      return;
    }

    // Set hovered node
    const hoveredNode = state.nodes.find(node => {
      const dx = node.x - coords.x;
      const dy = node.y - coords.y;
      const sizeRadius = node.size || 6;
      return Math.sqrt(dx * dx + dy * dy) < sizeRadius + 8;
    });

    if (hoveredNode !== state.hoveredNode) {
      state.hoveredNode = hoveredNode;
    }
  };

  const handleMouseUp = (e) => {
    const state = simStateRef.current;
    
    if (state.draggingNode) {
      // Trigger selection on click
      onSelectItem({ id: state.draggingNode.id, type: state.draggingNode.type });
    }
    
    state.draggingNode = null;
    state.isPanning = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const state = simStateRef.current;
    const zoomFactor = 1.05;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasMouseX = (mouseX - state.transform.x) / state.transform.k;
    const canvasMouseY = (mouseY - state.transform.y) / state.transform.k;

    if (e.deltaY < 0) {
      state.transform.k = Math.min(state.transform.k * zoomFactor, 3);
    } else {
      state.transform.k = Math.max(state.transform.k / zoomFactor, 0.25);
    }

    state.transform.x = mouseX - canvasMouseX * state.transform.k;
    state.transform.y = mouseY - canvasMouseY * state.transform.k;
  };

  const triggerZoom = (factor) => {
    const canvas = canvasRef.current;
    const state = simStateRef.current;
    const midX = canvas.width / 2;
    const midY = canvas.height / 2;

    const canvasMidX = (midX - state.transform.x) / state.transform.k;
    const canvasMidY = (midY - state.transform.y) / state.transform.k;

    state.transform.k = Math.max(Math.min(state.transform.k * factor, 3), 0.25);
    state.transform.x = midX - canvasMidX * state.transform.k;
    state.transform.y = midY - canvasMidY * state.transform.k;
  };

  const resetView = () => {
    const canvas = canvasRef.current;
    const state = simStateRef.current;
    state.transform.k = 1;
    state.transform.x = canvas.width / 2 - 200;
    state.transform.y = canvas.height / 2 - 200;
  };

  return (
    <div className="graph-canvas-container">
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Settings Panel */}
      {showSettings && (
        <div className="graph-settings-panel">
          <label className="settings-label">
            Link Distance ({linkDistance}px)
            <input 
              type="range" min="50" max="180" step="5" 
              className="settings-input-range"
              value={linkDistance} onChange={(e) => setLinkDistance(parseInt(e.target.value))} 
            />
          </label>
          <label className="settings-label">
            Repulsion Force ({chargeStrength})
            <input 
              type="range" min="100" max="500" step="10" 
              className="settings-input-range"
              value={chargeStrength} onChange={(e) => setChargeStrength(parseInt(e.target.value))} 
            />
          </label>
          <label className="settings-label">
            Center Gravity ({gravityStrength})
            <input 
              type="range" min="0.01" max="0.1" step="0.01" 
              className="settings-input-range"
              value={gravityStrength} onChange={(e) => setGravityStrength(parseFloat(e.target.value))} 
            />
          </label>
          <label className="settings-label" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <span>Show Labels</span>
            <input 
              type="checkbox" 
              style={{ cursor: "pointer", accentColor: "var(--accent-color)" }}
              checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} 
            />
          </label>
        </div>
      )}

      {/* Floating Canvas UI Controls */}
      <div className="graph-floating-controls">
        <button className="graph-btn" onClick={() => setShowSettings(!showSettings)} title="Simulation Settings">
          <Settings size={16} />
        </button>
        <button className="graph-btn" onClick={() => triggerZoom(1.2)} title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button className="graph-btn" onClick={() => triggerZoom(1 / 1.2)} title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button className="graph-btn" onClick={resetView} title="Reset Viewport">
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}

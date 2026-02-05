"use client";

import { useEffect, useRef, useState } from 'react';

interface Node {
  id: number;
  x: number;
  y: number;
}

interface AnimatingEdge {
  u: Node;
  v: Node;
  p: number;
}

const CONFIG = {
  nodeRadius: 4,
  hitRadius: 15,
  ringRadius: 6,
  hopDuration: 500, // ms
  resetDelay: 1500, // ms
  padding: 20, // Canvas padding to prevent node clipping
  persistentHighlight: false, // Set to true to keep nodes highlighted after visited
  colors: {
    bg: '#0a0a0a',
    nodeDefault: '#757575',
    nodeActive: '#ffffff',
    edgeDefault: '#272727',
    edgeActive: '#ffffff'
  }
};

// Base canvas size for node coordinates
const BASE_WIDTH = 864;
const BASE_HEIGHT = 530;

// Node Definitions (base coordinates without padding)
const baseNodes: Node[] = [
  { id: 1, x: 0, y: 115 },
  { id: 2, x: 54, y: 67 },
  { id: 3, x: 77, y: 93 },
  { id: 4, x: 90, y: 16 },
  { id: 5, x: 321, y: 135 },
  { id: 6, x: 321, y: 219 },
  { id: 7, x: 451, y: 0 },
  { id: 8, x: 471, y: 40 },
  { id: 9, x: 529, y: 40 },
  { id: 10, x: 451, y: 246 },
  { id: 11, x: 451, y: 350 },
  { id: 12, x: 551, y: 422 },
  { id: 13, x: 588, y: 187 },
  { id: 14, x: 646, y: 227 },
  { id: 15, x: 646, y: 350 },
  { id: 16, x: 685, y: 88 },
  { id: 17, x: 677, y: 164 },
  { id: 18, x: 675, y: 372 },
  { id: 19, x: 756, y: 271 }
];

// Explicit Edge List
const edgeList: [number, number][] = [
  [1,2], [2,3], [3,4], [4,5], [5,6], [5,8], [5,10],
  [7,8], [8,9], [10,11], [10,13], [11,12], [11,14],
  [12,15], [13,14], [13,16], [13,17], [14,15], [15,18],
  [16,19], [17,19]
];

export default function TransactionPathVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 864, height: 530 });
  const [displaySize, setDisplaySize] = useState({ width: 864, height: 530 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const dprRef = useRef(1);
  
  // Animation State
  const animationState = useRef({
    currentPath: [] as number[],
    visitedNodes: new Set<number>(),
    currentStepIndex: 0,
    animationStartTime: 0,
    destinationGlowStart: 0,
    animationFrameId: 0
  });

  // Graph Adjacency Map for BFS
  const adj = useRef<Map<number, number[]>>(new Map());

  useEffect(() => {
    // Set DPR on client side only
    dprRef.current = window.devicePixelRatio || 1;
    
    // Build adjacency list
    baseNodes.forEach(n => adj.current.set(n.id, []));
    edgeList.forEach(([src, dst]) => {
      adj.current.get(src)?.push(dst);
      adj.current.get(dst)?.push(src);
    });

    // Handle responsive canvas size and scale nodes
    const updateCanvasSize = () => {
      let width, height;
      const isMobileView = window.innerWidth < 768;
      
      if (window.innerWidth >= 1024) {
        // Desktop
        width = 864;
        height = 530;
      } else if (window.innerWidth >= 768) {
        // Tablet
        width = 567;
        height = 318;
      } else {
        // Mobile
        width = 334;
        height = 185;
      }
      
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      setCanvasSize({ width: width * dpr, height: height * dpr });
      setDisplaySize({ width, height });
      setIsMobile(isMobileView);
      
      // Scale nodes based on canvas size
      const scaleX = (width - CONFIG.padding * 2) / (BASE_WIDTH - CONFIG.padding * 2);
      const scaleY = (height - CONFIG.padding * 2) / (BASE_HEIGHT - CONFIG.padding * 2);
      
      const scaledNodes = baseNodes.map(node => ({
        id: node.id,
        x: node.x * scaleX + CONFIG.padding,
        y: node.y * scaleY + CONFIG.padding
      }));
      
      setNodes(scaledNodes);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Get distances from startNode to all other nodes
  const getDistances = (startId: number): Map<number, number> => {
    const dists = new Map<number, number>();
    const queue = [startId];
    dists.set(startId, 0);

    while (queue.length > 0) {
      const u = queue.shift()!;
      const neighbors = adj.current.get(u) || [];
      for (const v of neighbors) {
        if (!dists.has(v)) {
          dists.set(v, dists.get(u)! + 1);
          queue.push(v);
        }
      }
    }
    return dists;
  };

  // Find shortest path between two specific nodes
  const findShortestPath = (startId: number, endId: number): number[] => {
    const queue: number[][] = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];

      if (node === endId) return path;

      const neighbors = adj.current.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newPath = [...path, neighbor];
          queue.push(newPath);
        }
      }
    }
    return [];
  };

  const getNodeById = (id: number): Node => {
    return nodes.find(n => n.id === id)!;
  };

  const drawEdge = (ctx: CanvasRenderingContext2D, u: Node, v: Node, style: string, width: number) => {
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(v.x, v.y);
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  const drawGradientEdge = (ctx: CanvasRenderingContext2D, u: Node, v: Node, progress: number) => {
    const grad = ctx.createLinearGradient(u.x, u.y, v.x, v.y);
    
    const head = Math.max(0, Math.min(1, progress));
    const tailLength = 0.4;
    const tail = Math.max(0, head - tailLength);

    grad.addColorStop(0, 'rgba(255,255,255,0)');
    
    if (tail > 0) {
      grad.addColorStop(tail, 'rgba(255,255,255,0)');
    }
    
    grad.addColorStop(head, 'rgba(255,255,255,1)');
    
    if (head < 1) {
      grad.addColorStop(Math.min(1, head + 0.01), 'rgba(255,255,255,0)');
    }
    
    grad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(v.x, v.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const startTransaction = (startId: number) => {
    const distances = getDistances(startId);
    
    // Filter candidates >= 2 edges away
    let candidates = nodes.filter(n => {
      const d = distances.get(n.id);
      return d !== undefined && d >= 2;
    });

    // Fallback to >= 1 edge if network is small/partitioned
    if (candidates.length === 0) {
      candidates = nodes.filter(n => {
        const d = distances.get(n.id);
        return d !== undefined && d >= 1;
      });
    }

    if (candidates.length === 0) return; // Isolated node

    // Pick random destination
    const destNode = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Calc path
    const path = findShortestPath(startId, destNode.id);
    
    // Init Animation
    setIsAnimating(true);
    animationState.current.currentPath = path;
    animationState.current.currentStepIndex = 0;
    if (CONFIG.persistentHighlight) {
      animationState.current.visitedNodes.clear();
      animationState.current.visitedNodes.add(startId); // Start node is visited immediately
    }
    animationState.current.animationStartTime = performance.now();
    animationState.current.destinationGlowStart = 0;
  };

  const loop = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Wait for nodes to be initialized
    if (nodes.length === 0) {
      animationState.current.animationFrameId = requestAnimationFrame(loop);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Scale by DPR
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // 1. Draw Static Edges
    ctx.lineWidth = 1;
    edgeList.forEach(([srcId, dstId]) => {
      const u = getNodeById(srcId);
      const v = getNodeById(dstId);
      drawEdge(ctx, u, v, CONFIG.colors.edgeDefault, 1);
    });

    // 2. Animation Logic
    let animatingEdge: AnimatingEdge | null = null;
    let currentFromNodeId: number | null = null;
    let currentToNodeId: number | null = null;
    let currentProgress = 0;
    let isFinalNodeGlowing = false;

    if (isAnimating) {
      const totalElapsed = now - animationState.current.animationStartTime;
      
      const hopIndex = Math.floor(totalElapsed / CONFIG.hopDuration);
      const hopProgress = (totalElapsed % CONFIG.hopDuration) / CONFIG.hopDuration;

      if (hopIndex < animationState.current.currentPath.length - 1) {
        // Moving between nodes
        const u = getNodeById(animationState.current.currentPath[hopIndex]);
        const v = getNodeById(animationState.current.currentPath[hopIndex + 1]);
        
        if (CONFIG.persistentHighlight) {
          animationState.current.visitedNodes.add(u.id);
        }
        
        currentFromNodeId = u.id;
        currentToNodeId = v.id;
        currentProgress = hopProgress;
        animatingEdge = { u, v, p: hopProgress };

      } else {
        // Arrived at destination
        const finalNodeId = animationState.current.currentPath[animationState.current.currentPath.length - 1];
        
        if (CONFIG.persistentHighlight) {
          animationState.current.visitedNodes.add(finalNodeId);
        }
        
        if (animationState.current.destinationGlowStart === 0) {
          animationState.current.destinationGlowStart = now;
        }
        
        const destElapsed = now - animationState.current.destinationGlowStart;
        
        // Destination Effect - always show for final node
        if (destElapsed < 1200) {
          isFinalNodeGlowing = true;
          const node = getNodeById(finalNodeId);
          const alpha = 1 - (destElapsed / 1200);
          const expand = (destElapsed / 1200) * 10;
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, CONFIG.nodeRadius + 4 + expand, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
          ctx.fill();
          
          ctx.shadowBlur = 15 * alpha;
          ctx.shadowColor = "white";
        } else if (destElapsed > CONFIG.resetDelay) {
          // Reset
          setIsAnimating(false);
          if (CONFIG.persistentHighlight) {
            animationState.current.visitedNodes.clear();
          }
          animationState.current.currentPath = [];
          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw Active Gradient Edge (if exists)
    if (animatingEdge) {
      drawGradientEdge(ctx, animatingEdge.u, animatingEdge.v, animatingEdge.p);
    }

    // 3. Draw Nodes
    nodes.forEach(node => {
      const isHovered = !isAnimating && hoveredNodeId === node.id;
      const isFirstTimeHighlight = !isAnimating && showFirstTimeTooltip && node.id === 4 && !hoveredNodeId;
      
      let shouldHighlight = isHovered || isFirstTimeHighlight;
      
      if (isAnimating) {
        // Check if this is the final node and it's in glow state
        const finalNodeId = animationState.current.currentPath[animationState.current.currentPath.length - 1];
        const isFinalNode = node.id === finalNodeId;
        
        if (isFinalNode && isFinalNodeGlowing) {
          // Final node always stays highlighted during glow effect
          shouldHighlight = true;
        } else if (CONFIG.persistentHighlight) {
          // Persistent mode: keep all visited nodes highlighted
          shouldHighlight = animationState.current.visitedNodes.has(node.id);
        } else {
          // Instant mode: only highlight currently animating nodes
          const isCurrentlyAnimating = (
            (node.id === currentFromNodeId) ||
            (node.id === currentToNodeId && currentProgress > 0.7)
          );
          shouldHighlight = isCurrentlyAnimating;
        }
      }
      
      // Base Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, CONFIG.nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = shouldHighlight ? CONFIG.colors.nodeActive : CONFIG.colors.nodeDefault;
      ctx.fill();

      // Highlight Ring (if should highlight)
      if (shouldHighlight) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, CONFIG.ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      ctx.shadowBlur = 0;
    });

    // 4. Hover Tooltip (Only if idle and not mobile)
    if (!isAnimating && hoveredNodeId && !isMobile) {
      const node = getNodeById(hoveredNodeId);
      
      const text = "Click a node to trace a transaction path";
      ctx.font = "12px sans-serif";
      const textMetrics = ctx.measureText(text);
      const w = textMetrics.width;
      const h = 16;
      
      let tx = node.x - w / 2;
      let ty = node.y - 20 - h;

      if (tx < 0) tx = 4;
      if (tx + w > displaySize.width) tx = displaySize.width - w - 4;
      if (ty < 0) ty = node.y + 20;

      ctx.fillStyle = "#fff";
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tx, ty + h/2);
    }

    // 5. First-time Tooltip (on node 4, not on mobile)
    if (!isAnimating && showFirstTimeTooltip && !hoveredNodeId && !isMobile) {
      const node = getNodeById(4);
      
      const text = "Click a node to trace a transaction path";
      ctx.font = "12px sans-serif";
      const textMetrics = ctx.measureText(text);
      const w = textMetrics.width;
      const h = 16;
      
      let tx = node.x - w / 2;
      let ty = node.y - 20 - h;

      if (tx < 0) tx = 4;
      if (tx + w > displaySize.width) tx = displaySize.width - w - 4;
      if (ty < 0) ty = node.y + 20;

      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tx, ty + h/2);
    }

    animationState.current.animationFrameId = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (nodes.length === 0) return; // Wait for nodes to be initialized
    
    animationState.current.animationFrameId = requestAnimationFrame(loop);
    
    return () => {
      if (animationState.current.animationFrameId) {
        cancelAnimationFrame(animationState.current.animationFrameId);
      }
    };
  }, [isAnimating, hoveredNodeId, nodes, displaySize, isMobile]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isAnimating) {
      setHoveredNodeId(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    let found: number | null = null;

    for (const n of nodes) {
      const dx = pos.x - n.x;
      const dy = pos.y - n.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist <= CONFIG.hitRadius) {
        found = n.id;
        break;
      }
    }

    setHoveredNodeId(found);
  };

  const handleClick = () => {
    if (isAnimating || !hoveredNodeId) {
      // Debug: log on empty click
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        console.log('=== Canvas Debug Info ===');
        console.log('Canvas actual width x height:', canvas.width, 'x', canvas.height);
        console.log('Canvas CSS width x height:', rect.width, 'x', rect.height);
        console.log('Display size:', displaySize);
        console.log('Canvas size state:', canvasSize);
        console.log('DPR:', dprRef.current);
        console.log('Total nodes:', nodes.length);
        console.log('First 3 nodes:', nodes.slice(0, 3));
      }
      return;
    }
    setShowFirstTimeTooltip(false);
    startTransaction(hoveredNodeId);
  };

  return (
    <div className="flex justify-center items-center bg-[#0a0a0a]">
      <canvas
        ref={canvasRef}
        id="graphCanvas"
        width={canvasSize.width}
        height={canvasSize.height}
        className="shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        style={{
          cursor: hoveredNodeId && !isAnimating ? 'pointer' : 'default',
          width: `${displaySize.width}px`,
          height: `${displaySize.height}px`
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
    </div>
  );
}

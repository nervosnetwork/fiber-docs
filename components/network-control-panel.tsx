'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface Node {
  id: number;
  x: number;
  y: number;
}

interface Edge {
  from: number;
  to: number;
  distance: string;
}

interface CustomChannel {
  from: number;
  to: number;
  color: string; // '#ADFFBE' for open, '#FFA2A2' for selected
}

interface Transaction {
  path: number[]; // Node IDs in the path
  startTime: number;
  hopDuration: number; // Duration for each hop in ms
  isDirectPath: boolean; // Whether this is a direct path (no existing edges)
}

// Network nodes - coordinates from user-provided table (converted to canvas pixels)
// Scale: multiply meters by 38 to get pixels (38 pixels per meter)
// Tablet: 26 pixels per meter, Desktop: 34 pixels per meter
const SCALE_TABLET = 26; // pixels per meter for tablet
const SCALE_DESKTOP = 34; // pixels per meter for desktop

export default function NetworkControlPanel() {
  const [selectedMode, setSelectedMode] = useState<'open' | 'close' | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<CustomChannel | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isTransacting, setIsTransacting] = useState(false);
  const [showChannelNotification, setShowChannelNotification] = useState(false);
  const [showChannelClosedNotification, setShowChannelClosedNotification] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const adjRef = useRef<Map<number, number[]>>(new Map());
  
  // Detect screen size and set appropriate scale
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Get current scale based on screen size
  const SCALE = isDesktop ? SCALE_DESKTOP : SCALE_TABLET;

  const nodes: Node[] = [
  { id: 1, x: 1.12 * SCALE, y: 5.53 * SCALE },   // 左侧折线起点
  { id: 2, x: 3.96 * SCALE, y: 3.91 * SCALE },   // 左侧折线波峰
  { id: 3, x: 5.22 * SCALE, y: 5.53 * SCALE },   // 左侧折线波谷
  { id: 4, x: 9.65 * SCALE, y: 2.59 * SCALE },   // 左侧折线终点
  { id: 5, x: 13.06 * SCALE, y: 7.63 * SCALE },  // 中部-垂直线顶端 (连着 9.1m)
  { id: 6, x: 13.06 * SCALE, y: 11.64 * SCALE }, // 中部-垂直线底端
  { id: 7, x: 17.89 * SCALE, y: 12.69 * SCALE }, // 中部-主根组 (5.0m 线顶端)
  { id: 8, x: 17.89 * SCALE, y: 18.13 * SCALE }, // 中部-5.0m 线底端
  { id: 9, x: 18.15 * SCALE, y: 1.34 * SCALE },  // 顶部三角形-上
  { id: 10, x: 18.91 * SCALE, y: 3.05 * SCALE }, // 顶部三角形-右
  { id: 11, x: 21.85 * SCALE, y: 3.05 * SCALE }, // 顶部三角形-下
  { id: 12, x: 22.89 * SCALE, y: 22.52 * SCALE },// 底部尖端 (1.8m 线末端)
  { id: 13, x: 24.81 * SCALE, y: 10.11 * SCALE },// 右侧主枢纽 (连接 4.2m/2.2m/6.0m)
  { id: 14, x: 27.65 * SCALE, y: 12.12 * SCALE },// 右侧网络-上分叉点
  { id: 15, x: 27.65 * SCALE, y: 17.94 * SCALE },// 底部环-右下角 (连接 1.5m 小尾巴)
  { id: 16, x: 29.14 * SCALE, y: 19.00 * SCALE },// 1.5m小尾巴末端 (之前可能遗了这个)
  { id: 17, x: 29.17 * SCALE, y: 6.87 * SCALE }, // 右侧网络-顶点 (6.0m 线末端)
  { id: 18, x: 29.17 * SCALE, y: 10.11 * SCALE },// 右侧网络-中点 (5.4m 线末端)
  { id: 19, x: 32.99 * SCALE, y: 13.93 * SCALE },// 最右侧端点 (4.9m 线末端)
];

  // Network edges with distances - based on complete topology mapping
  const edges: Edge[] = [
  // 左侧链路 (Left Chain)
  { from: 1, to: 2, distance: '4.3m' },
  { from: 2, to: 3, distance: '' }, // 线段存在但未标数值
  { from: 3, to: 4, distance: '5.4m' },

  // 右侧主网络 - 核心骨架 (Main Structure)
  { from: 5, to: 6, distance: '9.1m' },
  { from: 5, to: 10, distance: '5.3m' },
  { from: 5, to: 7, distance: '1.2m' }, // 标注在对角线上
  { from: 7, to: 8, distance: '5.0m' },
  { from: 8, to: 14, distance: '2.2m' },
  { from: 7, to: 13, distance: '2.2m' },
  { from: 8, to: 12, distance: '1.8m' },

  { from: 12, to: 15, distance: '3.2m' },
  { from: 15, to: 16, distance: '1.5m' }, // 那个容易漏掉的小尾巴
  { from: 15, to: 14, distance: '2.6m' },
//   { from: 14, to: 7, distance: '2.2m' },

  // 顶部三角形区域 (Top Triangle)
  { from: 9, to: 10, distance: '2.6m' },
  { from: 10, to: 11, distance: '3.5m' },
  { from: 9, to: 11, distance: '' }, // 未知距离

  // 右侧延伸部分 (Right Extension)
  { from: 10, to: 13, distance: '4.2m' },
  { from: 13, to: 17, distance: '6.0m' },
  { from: 13, to: 18, distance: '5.4m' },
  { from: 17, to: 18, distance: '' }, // 未知距离
  { from: 17, to: 19, distance: '4.9m' },
  { from: 18, to: 19, distance: '4.9m' },
];
  
  // Build adjacency list for pathfinding
  useEffect(() => {
    const adj = new Map<number, number[]>();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(edge => {
      const from = edge.from;
      const to = edge.to;
      if (!adj.get(from)) adj.set(from, []);
      if (!adj.get(to)) adj.set(to, []);
      adj.get(from)!.push(to);
      adj.get(to)!.push(from);
    });
    adjRef.current = adj;
  }, []);
  
  // Find shortest path using BFS
  const findShortestPath = (startId: number, endId: number): number[] => {
    const queue: number[][] = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];

      if (node === endId) return path;

      const neighbors = adjRef.current.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newPath = [...path, neighbor];
          queue.push(newPath);
        }
      }
    }
    // No path found, return direct path
    return [startId, endId];
  };
  
  // Draw gradient edge for animation (from transaction-path-visualizer)
  const drawGradientEdge = (
    ctx: CanvasRenderingContext2D,
    fromNode: Node,
    toNode: Node,
    progress: number
  ) => {
    const grad = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
    
    const head = Math.max(0, Math.min(1, progress));
    const tailLength = 0.4;
    const tail = Math.max(0, head - tailLength);

    // Use white color for transaction (same as transaction-path-visualizer)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    
    if (tail > 0) {
      grad.addColorStop(tail, 'rgba(255, 255, 255, 0)');
    }
    
    grad.addColorStop(head, 'rgba(255, 255, 255, 1)');
    
    if (head < 1) {
      grad.addColorStop(Math.min(1, head + 0.01), 'rgba(255, 255, 255, 0)');
    }
    
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  
  // Draw flag icon on a node
  const drawFlag = (ctx: CanvasRenderingContext2D, node: Node, color: string) => {
    // Flag is 32x32, pole bottom should touch the top of the node (radius 6)
    // Pole bottom is at y=29.33 in the original 32x32 SVG
    // So the flag's bottom (y=32) should be at node.y - 6 (top of circle)
    // Therefore flag origin should be at node.y - 6 - 32 = node.y - 38
    const flagX = node.x;
    const flagY = node.y - 38; // Position so pole bottom touches circle top
    
    ctx.save();
    ctx.translate(flagX, flagY);
    ctx.translate(-6, -2); // Shift right by reducing left offset (was -16, now -11 = +5 pixels right)
    
    // Draw the flag path
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Flag wave path
    ctx.beginPath();
    ctx.moveTo(5.33, 20);
    ctx.bezierCurveTo(5.33, 20, 6.67, 18.67, 10.67, 18.67);
    ctx.bezierCurveTo(14.67, 18.67, 17.33, 21.33, 21.33, 21.33);
    ctx.bezierCurveTo(25.33, 21.33, 26.67, 20, 26.67, 20);
    ctx.lineTo(26.67, 4);
    ctx.bezierCurveTo(26.67, 4, 25.33, 5.33, 21.33, 5.33);
    ctx.bezierCurveTo(17.33, 5.33, 14.67, 2.67, 10.67, 2.67);
    ctx.bezierCurveTo(6.67, 2.67, 5.33, 4, 5.33, 4);
    ctx.lineTo(5.33, 20);
    ctx.stroke();
    
    // Flag pole
    ctx.beginPath();
    ctx.moveTo(5.33, 20);
    ctx.lineTo(5.33, 29.33);
    ctx.stroke();
    
    ctx.restore();
  };
  
  const drawNetwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw static edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (!fromNode || !toNode) return;
      
      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = '#525252'; // border-subtle
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Calculate label position (midpoint)
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      
      // Calculate offset perpendicular to line
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const offsetX = -dy / len * 15; // perpendicular offset
      const offsetY = dx / len * 15;
      
      // Draw distance label
      if (edge.distance) {
        ctx.font = '12px Inter';
        ctx.fillStyle = '#757575'; // text-tertiary
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.distance, midX + offsetX, midY + offsetY);
      }
    });
    
    // Draw custom channels
    customChannels.forEach(channel => {
      const fromNode = nodes.find(n => n.id === channel.from);
      const toNode = nodes.find(n => n.id === channel.to);
      
      if (!fromNode || !toNode) return;
      
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = channel.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // Draw temporary direct line for transaction (if it's a direct path with no existing edges)
    if (transaction && transaction.isDirectPath && transaction.path.length === 2) {
      const startNode = nodes.find(n => n.id === transaction.path[0]);
      const endNode = nodes.find(n => n.id === transaction.path[1]);
      
      if (startNode && endNode) {
        ctx.beginPath();
        ctx.moveTo(startNode.x, startNode.y);
        ctx.lineTo(endNode.x, endNode.y);
        ctx.strokeStyle = '#525252'; // Same as static edges
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    // Draw transaction animation
    if (transaction) {
      const elapsed = performance.now() - transaction.startTime;
      const hopIndex = Math.floor(elapsed / transaction.hopDuration);
      const hopProgress = (elapsed % transaction.hopDuration) / transaction.hopDuration;
      
      if (hopIndex < transaction.path.length - 1) {
        // Currently animating between two nodes
        const currentNodeId = transaction.path[hopIndex];
        const nextNodeId = transaction.path[hopIndex + 1];
        const currentNode = nodes.find(n => n.id === currentNodeId);
        const nextNode = nodes.find(n => n.id === nextNodeId);
        
        if (currentNode && nextNode) {
          // Draw gradient animation on this edge
          drawGradientEdge(ctx, currentNode, nextNode, hopProgress);
        }
      } else {
        // Animation complete
        const finalNodeId = transaction.path[transaction.path.length - 1];
        const finalNode = nodes.find(n => n.id === finalNodeId);
        
        if (finalNode) {
          // Destination glow effect
          const glowDuration = 800;
          const glowElapsed = elapsed - (transaction.path.length - 1) * transaction.hopDuration;
          
          if (glowElapsed < glowDuration) {
            const alpha = 1 - (glowElapsed / glowDuration);
            const expand = (glowElapsed / glowDuration) * 10;
            
            ctx.beginPath();
            ctx.arc(finalNode.x, finalNode.y, 10 + expand, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.shadowBlur = 15 * alpha;
            ctx.shadowColor = 'white';
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            // Animation finished - clear state after drawing
            setTimeout(() => {
              setTransaction(null);
              setIsTransacting(false);
            }, 0);
          }
        }
      }
    }
    
    // Draw nodes
    nodes.forEach(node => {
      const isSelected = selectedNodes.includes(node.id);
      const isHovered = hoveredNodeId === node.id;
      // Check if node is part of any custom channel
      const isInChannel = customChannels.some(ch => 
        ch.from === node.id || ch.to === node.id
      );
      // Check if node is in transaction path
      const isInTransactionPath = transaction && transaction.path.includes(node.id);
      
      // Check if node is start or end of transaction
      const isStartNode = transaction && transaction.path[0] === node.id;
      const isEndNode = transaction && transaction.path[transaction.path.length - 1] === node.id;
      
      // Determine node color
      let nodeColor = '#757575'; // Default gray
      if (isStartNode) {
        nodeColor = '#ADFFBE'; // Start node color
      } else if (isEndNode) {
        nodeColor = '#A2D2FF'; // End node color
      } else if (isSelected || isHovered || isInChannel || isInTransactionPath) {
        nodeColor = '#ffffff'; // White for other highlighted nodes
      }
      
      // Base circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();
      
      // Highlight ring for selected/hovered/channel/transaction nodes
      if (isSelected || isHovered || isInChannel || isInTransactionPath) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Draw flags for start and end nodes during transaction
      if (isStartNode) {
        drawFlag(ctx, node, '#ADFFBE');
      } else if (isEndNode) {
        drawFlag(ctx, node, '#A2D2FF');
      }
    });
    
    // Continue animation if transaction is ongoing
    if (transaction) {
      animationFrameRef.current = requestAnimationFrame(drawNetwork);
    }
  };
  
  useEffect(() => {
    drawNetwork();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedNodes, customChannels, hoveredNodeId, transaction]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Scale coordinates from display size to canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Check if hovering over a node
    let foundNode: number | null = null;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 10) {
        foundNode = node.id;
        break;
      }
    }
    
    setHoveredNodeId(foundNode);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Scale coordinates from display size to canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Check if clicking on a node
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 10) {
        // Toggle node selection with max 2 nodes
        if (selectedNodes.includes(node.id)) {
          // If already selected, unselect it
          setSelectedNodes(selectedNodes.filter(id => id !== node.id));
        } else {
          // If not selected, add it
          if (selectedNodes.length < 2) {
            // Less than 2 nodes, just add
            setSelectedNodes([...selectedNodes, node.id]);
          } else {
            // Already 2 nodes, remove the first one and add the new one
            setSelectedNodes([selectedNodes[1], node.id]);
          }
        }
        return;
      }
    }
    
    // Check if clicking on a custom channel
    for (const channel of customChannels) {
      const fromNode = nodes.find(n => n.id === channel.from);
      const toNode = nodes.find(n => n.id === channel.to);
      
      if (!fromNode || !toNode) continue;
      
      // Calculate distance from point to line
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const dot = ((x - fromNode.x) * dx + (y - fromNode.y) * dy) / (len * len);
      
      if (dot >= 0 && dot <= 1) {
        const projX = fromNode.x + dot * dx;
        const projY = fromNode.y + dot * dy;
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
        
        if (dist <= 10) {
          // Toggle channel color
          if (selectedChannel?.from === channel.from && selectedChannel?.to === channel.to) {
            setSelectedChannel(null);
            // Reset color to green
            setCustomChannels(customChannels.map(ch =>
              ch.from === channel.from && ch.to === channel.to
                ? { ...ch, color: '#ADFFBE' }
                : ch
            ));
          } else {
            setSelectedChannel(channel);
            // Change color to red
            setCustomChannels(customChannels.map(ch =>
              ch.from === channel.from && ch.to === channel.to
                ? { ...ch, color: '#FFA2A2' }
                : { ...ch, color: '#ADFFBE' }
            ));
          }
          return;
        }
      }
    }
  };
  
  return (
    <div className="w-full lg:h-[1024px] bg-layer-01 border border-invisible flex">
      {/* Control Panel - Desktop only */}
      <div className="hidden lg:flex w-[320px] border border-invisible flex-col">
        {/* Header */}
        <div className="py-[32px] px-[16px]  border-invisible">
          <div className="text-label text-tertiary">
            CONTROL PANEL
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 py-0 px-[16px] flex flex-col gap-lg">
          {/* Open Channel Section */}
          <div className="hidden lg:flex flex-col gap-sm">
            <div className="text-body2 text-secondary">
              Select two nodes in the network
            </div>
            <button
              onClick={() => {
                setSelectedMode('open');
                // Open channel when 2 nodes selected
                if (selectedNodes.length === 2) {
                  const newChannel: CustomChannel = {
                    from: selectedNodes[0],
                    to: selectedNodes[1],
                    color: '#ADFFBE'
                  };
                  setCustomChannels([...customChannels, newChannel]);
                  setSelectedNodes([]);
                  
                  // Show notification
                  setShowChannelNotification(true);
                  setTimeout(() => {
                    setShowChannelNotification(false);
                  }, 3000); // Hide after 3 seconds
                }
              }}
              disabled={selectedNodes.length !== 2}
              className={`w-full p-md border flex items-center justify-center gap-sm transition-all ${
                selectedMode === 'open' ? 'bg-layer-03' : 'bg-layer-02'
              } ${selectedNodes.length !== 2 ? 'border-white/30 opacity-50 cursor-not-allowed' : 'border-invisible cursor-pointer'}`}
            >
              <Image 
                src="/plus2.svg" 
                alt="Plus" 
                width={24} 
                height={24}
                className="text-primary mr-4 flex-shrink-0"
                style={{ objectFit: 'contain' }}
              />
              <span className="text-button text-primary font-bold">
                OPEN CHANNEL
              </span>
            </button>
          </div>

          {/* Close Channel Section */}
          <div className="hidden lg:flex flex-col gap-sm">
            <div className="text-body2 text-secondary">
              Select a line to close
            </div>
            <button
              onClick={() => {
                setSelectedMode('close');
                // Close channel when a channel is selected
                if (selectedChannel) {
                  setCustomChannels(customChannels.filter(ch => 
                    !(ch.from === selectedChannel.from && ch.to === selectedChannel.to)
                  ));
                  setSelectedChannel(null);
                  
                  // Show notification
                  setShowChannelClosedNotification(true);
                  setTimeout(() => {
                    setShowChannelClosedNotification(false);
                  }, 3000); // Hide after 3 seconds
                }
              }}
              disabled={!selectedChannel}
              className={`w-full p-md border flex items-center justify-center gap-sm transition-all ${
                selectedMode === 'close' ? 'bg-layer-03' : 'bg-layer-02'
              } ${!selectedChannel ? 'border-white/30 opacity-50 cursor-not-allowed' : 'border-invisible cursor-pointer'}`}
            >
              <Image 
                src="/minus2.svg" 
                alt="Minus" 
                width={24} 
                height={24}
                className="text-primary mr-4 flex-shrink-0"
                style={{ objectFit: 'contain' }}
              />
              <span className="text-button text-primary font-bold">
                CLOSE CHANNEL
              </span>
            </button>
          </div>

          {/* Trigger Transaction Section */}
          <button
            onClick={() => {
              if (isTransacting) return;
              
              // Randomly pick two different nodes
              const availableNodes = nodes.filter(n => n.id); // All nodes
              if (availableNodes.length < 2) return;
              
              const shuffled = [...availableNodes].sort(() => Math.random() - 0.5);
              const sender = shuffled[0].id;
              const receiver = shuffled[1].id;
              
              // Find shortest path
              const path = findShortestPath(sender, receiver);
              
              // Check if this is a direct path (no existing edges between nodes)
              const isDirectPath = path.length === 2;
              
              // Start transaction with path-based animation
              setIsTransacting(true);
              setTransaction({
                path,
                startTime: performance.now(),
                hopDuration: 500, // 500ms per hop
                isDirectPath
              });
            }}
            disabled={isTransacting}
            className={`w-full lg:mt-md p-md border border-white flex items-center justify-center hover-border-bright transition-all bg-layer-02 ${
              isTransacting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Image 
              src="/transction.svg" 
              alt="Transaction" 
              width={24} 
              height={24}
              className="text-primary mr-4 flex-shrink-0"
              style={{ objectFit: 'contain' }}
            />
            <span className="text-button text-left text-primary">
              {isTransacting ? 'TRANSACTION IN PROGRESS...' : 'TRIGGER SAMPLE TRANSACTION'}
            </span>
          </button>

          {/* Desktop hint - only show on desktop when no transaction */}
          {!transaction && (
            <div className="hidden lg:block text-body3 text-tertiary text-center mt-md">
              Advanced channel controls are available on desktop
            </div>
          )}

          {/* Transaction Details */}
          {transaction && (
            <div className="w-full inline-flex flex-col justify-start items-start gap-sm mt-md">
              <div className="self-stretch justify-center text-primary text-sm text-body3 font-normal leading-6">
                Sample Transaction Details (Off-Chain)
              </div>
              <div className="self-stretch flex flex-col justify-start items-start gap-xs">
                <div className="self-stretch inline-flex justify-start items-start gap-xs">
                  <div className="w-14 justify-center text-tertiary text-sm font-normal leading-6">From</div>
                  <div className="flex-1 flex justify-start items-center gap-xs">
                    <div className="w-3.5 h-3.5 bg-[#ADFFBE] rounded-full" />
                    <div className="flex-1 justify-center text-primary text-sm font-normal leading-6">
                      Node {transaction.path[0]}
                    </div>
                  </div>
                </div>
                <div className="self-stretch inline-flex justify-start items-start gap-xs">
                  <div className="w-14 justify-center text-tertiary text-sm font-normal leading-6">To</div>
                  <div className="flex-1 flex justify-start items-center gap-xs">
                    <div className="w-3.5 h-3.5 bg-[#A2C7FF] rounded-full" />
                    <div className="flex-1 justify-center text-primary text-sm font-normal leading-6">
                      Node {transaction.path[transaction.path.length - 1]}
                    </div>
                  </div>
                </div>
                <div className="self-stretch inline-flex justify-start items-start gap-xs">
                  <div className="w-14 justify-center text-tertiary text-sm font-normal leading-6">Path</div>
                  <div className="flex-1 justify-center text-primary text-sm font-normal leading-6">
                    {transaction.path.map((nodeId, index) => (
                      <span key={nodeId}>
                        Node {nodeId}
                        {index < transaction.path.length - 1 && ' → '}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tablet hint - only show on tablet when there's a transaction */}
          {transaction && (
            <div className="lg:hidden text-body3 text-tertiary text-center mt-md">
              Advanced channel controls are available on desktop
            </div>
          )}
        </div>

        {/* Network Status Footer */}
        <div className="border-t border-invisible p-sm flex flex-col gap-sm">
          <div className="text-label text-tertiary mb-xs">
            NETWORK STATUS
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Nodes</div>
            <div className="text-body3 text-primary">19</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Channels</div>
            <div className="text-body3 text-primary">22</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L2 Txns</div>
            <div className="text-body3 text-primary">1,283</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L1 Channel Ops</div>
            <div className="text-body3 text-primary">22</div>
          </div>
        </div>
      </div>

      {/* Right Side - Network Layers (Desktop) / Full Layout (Tablet) */}
      <div className="flex flex-col lg:flex-1">
        {/* FIBER NETWORK (LAYER 2) */}
        <div className="border-b border-invisible flex flex-col lg:flex-1">
          {/* Layer 2 Header */}
          <div className="h-[46px] px-lg flex items-center justify-center border-b border-invisible">
            <div className="text-label text-primary">
              FIBER NETWORK (LAYER 2)
            </div>
          </div>
          
          {/* Layer 2 Content - Network Visualization Area */}
          <div className="relative bg-layer-01 flex flex-col overflow-y-auto">
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              className="w-full"
              style={{ imageRendering: 'auto', cursor: 'pointer' }}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
            />
            
            {/* Tablet Controls - Below canvas, not overlapping */}
            <div className={`lg:hidden px-lg flex flex-col gap-sm bg-layer-01 ${
              transaction ? 'pb-lg' : 'pb-sm'
            }`}>
              {/* Trigger Transaction Button */}
              <button
                onClick={() => {
                  if (isTransacting) return;
                  
                  const availableNodes = nodes.filter(n => n.id);
                  if (availableNodes.length < 2) return;
                  
                  const shuffled = [...availableNodes].sort(() => Math.random() - 0.5);
                  const sender = shuffled[0].id;
                  const receiver = shuffled[1].id;
                  
                  const path = findShortestPath(sender, receiver);
                  const isDirectPath = path.length === 2;
                  
                  setIsTransacting(true);
                  setTransaction({
                    path,
                    startTime: performance.now(),
                    hopDuration: 500,
                    isDirectPath
                  });
                }}
                disabled={isTransacting}
                className={`w-full h-16 px-md py-sm border border-white flex items-center justify-center gap-md transition-all bg-layer-02 ${
                  isTransacting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover-border-bright'
                }`}
              >
                <Image 
                  src="/transction.svg" 
                  alt="Transaction" 
                  width={24} 
                  height={24}
                  className="flex-shrink-0"
                  style={{ objectFit: 'contain' }}
                />
                <span className="text-button text-primary font-bold">
                  {isTransacting ? 'TRANSACTION IN PROGRESS...' : 'TRIGGER SAMPLE TRANSACTION'}
                </span>
              </button>
              
              {/* Transaction Details */}
              {transaction && (
                <div className="w-full p-sm bg-layer-02 flex flex-col gap-md">
                  <div className="text-body2 text-primary">
                    Sample Transaction Details (Off-Chain)
                  </div>
                  <div className="flex flex-col gap-sm">
                    <div className="flex gap-sm">
                      <div className="w-14 text-body2 text-tertiary">From</div>
                      <div className="flex-1 flex items-center gap-sm">
                        <div className="w-3.5 h-3.5 bg-[#ADFFBE] rounded-full" />
                        <div className="flex-1 text-body2 text-primary">
                          Node {transaction.path[0]}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-sm">
                      <div className="w-14 text-body2 text-tertiary">To</div>
                      <div className="flex-1 flex items-center gap-sm">
                        <div className="w-3.5 h-3.5 bg-[#A2D2FF] rounded-full" />
                        <div className="flex-1 text-body2 text-primary">
                          Node {transaction.path[transaction.path.length - 1]}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-sm">
                      <div className="w-14 text-body2 text-tertiary">Path</div>
                      <div className="flex-1 text-body2 text-primary">
                        {transaction.path.map((nodeId: number, index: number) => (
                          <span key={nodeId}>
                            Node {nodeId}
                            {index < transaction.path.length - 1 && ' → '}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Hint text */}
              <div className="text-body3 text-tertiary text-center">
                Advanced channel controls are available on desktop
              </div>
            </div>
          </div>
        </div>

        {/* NERVOS CKB (LAYER 1) - Desktop only */}
        <div className="hidden lg:flex flex-col">
          {/* Layer 1 Header */}
          <div className="h-[46px] px-lg flex items-center justify-center border-b border-invisible bg-layer-01">
            <div className="text-label text-primary">
              NERVOS CKB (LAYER 1)
            </div>
          </div>
          
          {/* Layer 1 Content - Empty space below */}
          <div className="h-[120px] py-[40px] relative bg-layer-01 overflow-hidden">
            {/* Channel Opened Notification */}
            {showChannelNotification && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-10 px-3 bg-[#ADFFBE] inline-flex justify-center items-center gap-2 animate-slide-left">
                <div className="text-center justify-center text-[#000000] text-sm font-normal leading-6">
                  Channel opened
                </div>
              </div>
            )}
            
            {/* Channel Closed Notification */}
            {showChannelClosedNotification && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-10 px-3 bg-[#FFA2A2] inline-flex justify-center items-center gap-2 animate-slide-left">
                <div className="text-center justify-center text-[#000000] text-sm font-normal leading-6">
                  Channel closed
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Network Status - Tablet & Mobile */}
        <div className="lg:hidden border-t border-invisible p-md flex flex-col gap-md">
          <div className="text-label text-tertiary">
            NETWORK STATUS
          </div>
          
          {/* Mobile: vertical layout, Tablet: 2x2 grid */}
          <div className="flex flex-col md:grid md:grid-cols-2 gap-sm md:gap-md">
            {/* Item 1 */}
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Nodes</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">19</div>
            </div>
            
            {/* Item 2 */}
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Channels</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">22</div>
            </div>
            
            {/* Item 3 */}
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">L2 Txns</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">1,283</div>
            </div>
            
            {/* Item 4 */}
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">L1 Channel Ops</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">22</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

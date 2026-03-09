'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  color: string;
}

interface Transaction {
  path: number[];
  startTime: number;
  hopDuration: number;
  isDirectPath: boolean;
}

// Scale constants - adjusted for 1000x1050 canvas (portrait)
const SCALE_TABLET = 22.0;
const SCALE_DESKTOP = 24.0;

// Offset constants - adjusted for 1000x1050 canvas (portrait)
const OFFSET_X_DESKTOP = 160;
const OFFSET_Y_DESKTOP = 150;
const OFFSET_X_TABLET = 260;
const OFFSET_Y_TABLET = 80;

export default function InteractiveNetworkSimulation() {
  const [selectedMode, setSelectedMode] = useState<'open' | 'close' | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<CustomChannel | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [closedEdges, setClosedEdges] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isTransacting, setIsTransacting] = useState(false);
  const [showChannelNotification, setShowChannelNotification] = useState(false);
  const [showChannelClosedNotification, setShowChannelClosedNotification] = useState(false);
  const [l1Ops, setL1Ops] = useState(22);
  const [l2Txns, setL2Txns] = useState(1283);
  const [isDesktop, setIsDesktop] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const adjRef = useRef<Map<number, number[]>>(new Map());

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const SCALE = isDesktop ? SCALE_DESKTOP : SCALE_TABLET;
  const OFFSET_X = isDesktop ? OFFSET_X_DESKTOP : OFFSET_X_TABLET;
  const OFFSET_Y = isDesktop ? OFFSET_Y_DESKTOP : OFFSET_Y_TABLET;

  // All 19 nodes
  const nodes: Node[] = useMemo(() => {
    return [
          { id: 1, x: 1.12 * SCALE + OFFSET_X - 160, y: 8.53 * SCALE + OFFSET_Y },
      { id: 2, x: 3.96 * SCALE + OFFSET_X - 160, y: 3.91 * SCALE + OFFSET_Y },
      { id: 3, x: 7.22 * SCALE + OFFSET_X - 160, y: 6.53 * SCALE + OFFSET_Y },
      { id: 4, x: 9.65 * SCALE + OFFSET_X - 160, y: 0.59 * SCALE + OFFSET_Y },
      { id: 5, x: 13.06 * SCALE + OFFSET_X, y: 8.63 * SCALE + OFFSET_Y },
      { id: 6, x: 10.06 * SCALE + OFFSET_X, y: 15.64 * SCALE + OFFSET_Y },
      { id: 7, x: 15.89 * SCALE + OFFSET_X, y: 16.69 * SCALE + OFFSET_Y },
      { id: 8, x: 16.89 * SCALE + OFFSET_X, y: 26.13 * SCALE + OFFSET_Y },
      { id: 9, x: 18.15 * SCALE + OFFSET_X, y: 0 * SCALE + OFFSET_Y },
      { id: 10, x: 18.91 * SCALE + OFFSET_X, y: 3.05 * SCALE + OFFSET_Y },
      { id: 11, x: 21.85 * SCALE + OFFSET_X, y: 3.05 * SCALE + OFFSET_Y },
      { id: 12, x: 22.89 * SCALE + OFFSET_X, y: 34.52 * SCALE + OFFSET_Y },
      { id: 13, x: 24.81 * SCALE + OFFSET_X, y: 9.11 * SCALE + OFFSET_Y },
      { id: 14, x: 27.65 * SCALE + OFFSET_X, y: 16.12 * SCALE + OFFSET_Y },
      { id: 15, x: 27.65 * SCALE + OFFSET_X, y: 20.94 * SCALE + OFFSET_Y },
      { id: 16, x: 29.14 * SCALE + OFFSET_X, y: 28.0 * SCALE + OFFSET_Y },
      { id: 17, x: 29.17 * SCALE + OFFSET_X, y: 6.87 * SCALE + OFFSET_Y },
      { id: 18, x: 29.17 * SCALE + OFFSET_X, y: 13.11 * SCALE + OFFSET_Y },
      { id: 19, x: 32.99 * SCALE + OFFSET_X, y: 15.93 * SCALE + OFFSET_Y },
    ];
  }, [SCALE, OFFSET_X, OFFSET_Y]);

  // All edges
  const edges: Edge[] = useMemo(() => [
    { from: 1, to: 2, distance: '4.3m' },
    { from: 2, to: 3, distance: '' },
    { from: 3, to: 4, distance: '5.4m' },
    { from: 5, to: 6, distance: '9.1m' },
    { from: 5, to: 10, distance: '5.3m' },
    { from: 5, to: 7, distance: '1.2m' },
    { from: 7, to: 8, distance: '5.0m' },
    { from: 8, to: 14, distance: '2.2m' },
    { from: 7, to: 13, distance: '2.2m' },
    { from: 8, to: 12, distance: '1.8m' },
    { from: 12, to: 15, distance: '3.2m' },
    { from: 15, to: 16, distance: '1.5m' },
    { from: 15, to: 14, distance: '2.6m' },
    { from: 9, to: 10, distance: '2.6m' },
    { from: 10, to: 11, distance: '3.5m' },
    { from: 9, to: 11, distance: '' },
    { from: 10, to: 13, distance: '4.2m' },
    { from: 13, to: 17, distance: '6.0m' },
    { from: 13, to: 18, distance: '5.4m' },
    { from: 17, to: 18, distance: '' },
    { from: 17, to: 19, distance: '4.9m' },
    { from: 18, to: 19, distance: '4.9m' },
  ], []);

  // Build adjacency list
  useEffect(() => {
    const adj = new Map<number, number[]>();
    nodes.forEach((n) => adj.set(n.id, []));
    
    edges.forEach((edge) => {
      const edgeKey = `${edge.from}-${edge.to}`;
      const reverseKey = `${edge.to}-${edge.from}`;
      if (!closedEdges.has(edgeKey) && !closedEdges.has(reverseKey)) {
        const from = edge.from;
        const to = edge.to;
        if (!adj.get(from)) adj.set(from, []);
        if (!adj.get(to)) adj.set(to, []);
        adj.get(from)!.push(to);
        adj.get(to)!.push(from);
      }
    });
    
    customChannels.forEach((channel) => {
      const from = channel.from;
      const to = channel.to;
      if (!adj.get(from)) adj.set(from, []);
      if (!adj.get(to)) adj.set(to, []);
      adj.get(from)!.push(to);
      adj.get(to)!.push(from);
    });
    
    adjRef.current = adj;
  }, [nodes, edges, closedEdges, customChannels]);

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
    return [startId, endId];
  };

  // Draw gradient edge for animation
  const drawGradientEdge = (
    ctx: CanvasRenderingContext2D,
    fromNode: Node,
    toNode: Node,
    progress: number
  ) => {
    const grad = ctx.createLinearGradient(
      fromNode.x,
      fromNode.y,
      toNode.x,
      toNode.y
    );

    const head = Math.max(0, Math.min(1, progress));
    const tailLength = 0.4;
    const tail = Math.max(0, head - tailLength);

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
  const drawFlag = (
    ctx: CanvasRenderingContext2D,
    node: Node,
    color: string
  ) => {
    const flagX = node.x;
    const flagY = node.y - 38;

    ctx.save();
    ctx.translate(flagX, flagY);
    ctx.translate(-6, -2);

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

  const drawNetwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw static edges
    edges.forEach((edge) => {
      const edgeKey = `${edge.from}-${edge.to}`;
      if (closedEdges.has(edgeKey) || closedEdges.has(`${edge.to}-${edge.from}`)) {
        return;
      }

      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      if (!fromNode || !toNode) return;

      const isSelected = selectedEdge?.from === edge.from && selectedEdge?.to === edge.to;

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = isSelected ? '#FFA2A2' : '#525252';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      if (edge.distance) {
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const offsetX = (-dy / len) * 15;
        const offsetY = (dx / len) * 15;

        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = '#a0a0a0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.distance, midX + offsetX, midY + offsetY);
      }
    });

    // Draw custom channels
    customChannels.forEach((channel) => {
      const fromNode = nodes.find((n) => n.id === channel.from);
      const toNode = nodes.find((n) => n.id === channel.to);

      if (!fromNode || !toNode) return;

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = channel.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw temporary direct line for transaction
    if (transaction && transaction.isDirectPath && transaction.path.length === 2) {
      const startNode = nodes.find((n) => n.id === transaction.path[0]);
      const endNode = nodes.find((n) => n.id === transaction.path[1]);

      if (startNode && endNode) {
        ctx.beginPath();
        ctx.moveTo(startNode.x, startNode.y);
        ctx.lineTo(endNode.x, endNode.y);
        ctx.strokeStyle = '#525252';
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
        const currentNodeId = transaction.path[hopIndex];
        const nextNodeId = transaction.path[hopIndex + 1];
        const currentNode = nodes.find((n) => n.id === currentNodeId);
        const nextNode = nodes.find((n) => n.id === nextNodeId);

        if (currentNode && nextNode) {
          drawGradientEdge(ctx, currentNode, nextNode, hopProgress);
        }
      } else {
        const finalNodeId = transaction.path[transaction.path.length - 1];
        const finalNode = nodes.find((n) => n.id === finalNodeId);

        if (finalNode) {
          const glowDuration = 800;
          const glowElapsed = elapsed - (transaction.path.length - 1) * transaction.hopDuration;

          if (glowElapsed < glowDuration) {
            const alpha = 1 - glowElapsed / glowDuration;
            const expand = (glowElapsed / glowDuration) * 10;

            ctx.beginPath();
            ctx.arc(finalNode.x, finalNode.y, 10 + expand, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.shadowBlur = 15 * alpha;
            ctx.shadowColor = 'white';
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            setTimeout(() => {
              setTransaction(null);
              setIsTransacting(false);
            }, 0);
          }
        }
      }
    }

    // Draw nodes
    nodes.forEach((node) => {
      const isSelected = selectedNodes.includes(node.id);
      const isHovered = hoveredNodeId === node.id;
      const isInTransactionPath = transaction && transaction.path.includes(node.id);
      const isStartNode = transaction && transaction.path[0] === node.id;
      const isEndNode = transaction && transaction.path[transaction.path.length - 1] === node.id;

      let nodeColor = '#757575';
      if (isStartNode) {
        nodeColor = '#ADFFBE';
      } else if (isEndNode) {
        nodeColor = '#A2D2FF';
      } else if (isSelected || isHovered || isInTransactionPath) {
        nodeColor = '#ffffff';
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      if (isSelected || isHovered || isInTransactionPath) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (isStartNode) {
        drawFlag(ctx, node, '#ADFFBE');
      } else if (isEndNode) {
        drawFlag(ctx, node, '#A2D2FF');
      }

      if (isInTransactionPath) {
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`Node ${node.id}`, node.x, node.y + 14 + 6);
      }
    });

    if (transaction) {
      animationFrameRef.current = requestAnimationFrame(drawNetwork);
    }
  }, [nodes, edges, customChannels, selectedNodes, hoveredNodeId, transaction, selectedEdge, closedEdges]);

  useEffect(() => {
    drawNetwork();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawNetwork]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let foundNode: number | null = null;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 10) {
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicking on a node
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 10) {
        setCustomChannels(
          customChannels.map((ch) =>
            ch.color === '#ADFFBE' ? { ...ch, color: '#525252' } : ch
          )
        );
        
        if (selectedNodes.includes(node.id)) {
          setSelectedNodes(selectedNodes.filter((id) => id !== node.id));
        } else {
          if (selectedNodes.length < 2) {
            setSelectedNodes([...selectedNodes, node.id]);
          } else {
            setSelectedNodes([selectedNodes[1], node.id]);
          }
        }
        return;
      }
    }

    // Check if clicking on a static edge
    for (const edge of edges) {
      const edgeKey = `${edge.from}-${edge.to}`;
      if (closedEdges.has(edgeKey) || closedEdges.has(`${edge.to}-${edge.from}`)) {
        continue;
      }

      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      if (!fromNode || !toNode) continue;

      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const dot = ((x - fromNode.x) * dx + (y - fromNode.y) * dy) / (len * len);

      if (dot >= 0 && dot <= 1) {
        const projX = fromNode.x + dot * dx;
        const projY = fromNode.y + dot * dy;
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

        if (dist <= 10) {
          if (selectedEdge?.from === edge.from && selectedEdge?.to === edge.to) {
            setSelectedEdge(null);
          } else {
            setSelectedEdge(edge);
            setSelectedChannel(null);
            setCustomChannels(
              customChannels.map((ch) => {
                return { ...ch, color: '#525252' };
              })
            );
          }
          return;
        }
      }
    }

    // Check if clicking on a custom channel
    for (const channel of customChannels) {
      const fromNode = nodes.find((n) => n.id === channel.from);
      const toNode = nodes.find((n) => n.id === channel.to);

      if (!fromNode || !toNode) continue;

      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const dot = ((x - fromNode.x) * dx + (y - fromNode.y) * dy) / (len * len);

      if (dot >= 0 && dot <= 1) {
        const projX = fromNode.x + dot * dx;
        const projY = fromNode.y + dot * dy;
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

        if (dist <= 10) {
          if (selectedChannel?.from === channel.from && selectedChannel?.to === channel.to) {
            setSelectedChannel(null);
            setCustomChannels(
              customChannels.map((ch) => {
                if (ch.from === channel.from && ch.to === channel.to) {
                  return { ...ch, color: '#525252' };
                }
                return ch;
              })
            );
          } else {
            setSelectedChannel(channel);
            setSelectedEdge(null);
            setCustomChannels(
              customChannels.map((ch) => {
                if (ch.from === channel.from && ch.to === channel.to) {
                  return { ...ch, color: '#FFA2A2' };
                } else {
                  return { ...ch, color: '#525252' };
                }
              })
            );
          }
          return;
        }
      }
    }
  };

  const handleOpenChannel = () => {
    if (selectedNodes.length === 2) {
      const newChannel: CustomChannel = {
        from: selectedNodes[0],
        to: selectedNodes[1],
        color: '#ADFFBE',
      };
      const updatedChannels = customChannels.map((ch) => ({
        ...ch,
        color: '#525252',
      }));
      setCustomChannels([...updatedChannels, newChannel]);
      setSelectedNodes([]);
      setL1Ops((prev) => prev + 1);

      setShowChannelNotification(true);
      setTimeout(() => {
        setShowChannelNotification(false);
      }, 3000);
    }
  };

  const handleCloseChannel = () => {
    if (selectedChannel) {
      setCustomChannels(
        customChannels.filter(
          (ch) =>
            !(
              ch.from === selectedChannel.from &&
              ch.to === selectedChannel.to
            )
        )
      );
      setSelectedChannel(null);
      setSelectedMode(null);
      setL1Ops((prev) => prev + 1);

      setShowChannelClosedNotification(true);
      setTimeout(() => {
        setShowChannelClosedNotification(false);
      }, 3000);
    } else if (selectedEdge) {
      const edgeKey = `${selectedEdge.from}-${selectedEdge.to}`;
      setClosedEdges(new Set(closedEdges).add(edgeKey));
      setSelectedEdge(null);
      setSelectedMode(null);
      setL1Ops((prev) => prev + 1);

      setShowChannelClosedNotification(true);
      setTimeout(() => {
        setShowChannelClosedNotification(false);
      }, 3000);
    }
  };

  const handleTriggerTransaction = () => {
    if (isTransacting) return;

    setCustomChannels(customChannels.map((ch) => ({ ...ch, color: '#525252' })));
    setSelectedChannel(null);
    setSelectedEdge(null);

    let attempts = 0;
    const maxAttempts = 100;
    let path: number[] = [];

    while (attempts < maxAttempts) {
      const availableNodes = nodes.filter((n) => n.id);
      if (availableNodes.length < 2) return;

      const shuffled = [...availableNodes].sort(() => Math.random() - 0.5);
      const sender = shuffled[0].id;
      const receiver = shuffled[1].id;

      path = findShortestPath(sender, receiver);

      if (path.length >= 3) {
        break;
      }
      attempts++;
    }

    if (path.length < 3) {
      return;
    }

    setIsTransacting(true);
    setL2Txns((prev) => prev + 1);
    setTransaction({
      path,
      startTime: performance.now(),
      hopDuration: 500,
      isDirectPath: false,
    });
  };

  return (
    <div className="w-full bg-layer-01 border border-invisible flex" style={{ height: '700px' }}>
      {/* Control Panel */}
      <div className="hidden lg:flex w-[320px] border-r border-invisible flex-col">
        {/* Header */}
        <div className="py-[32px] px-[16px]">
          <div className="text-label text-tertiary">CONTROL PANEL</div>
        </div>

        {/* Content Area */}
        <div className="flex-1 py-0 px-[16px] flex flex-col" style={{ gap: '20px' }}>
          {/* Open Channel Section */}
          <div className="flex flex-col gap-sm">
            <div className="text-body2 text-secondary">
              Select two nodes in the network
            </div>
            <button
              onClick={handleOpenChannel}
              disabled={selectedNodes.length !== 2}
              className={`w-full h-[44px] py-[13px] px-md border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                selectedNodes.length !== 2
                  ? 'border-white/30 opacity-50 cursor-not-allowed'
                  : 'border-invisible cursor-pointer hover:bg-layer-03'
              }`}
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
          <div className="flex flex-col gap-sm">
            <div className="text-body2 text-secondary">Select a line to close</div>
            <button
              onClick={handleCloseChannel}
              disabled={!selectedChannel && !selectedEdge}
              className={`w-full h-[44px] py-[13px] px-md border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                !selectedChannel && !selectedEdge
                  ? 'border-white/30 opacity-50 cursor-not-allowed'
                  : 'border-invisible cursor-pointer hover:bg-layer-03'
              }`}
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

          <div style={{ height: '1px', background: '#272727', width: '100%' }}></div>

          {/* Trigger Transaction Section */}
          <button
            onClick={handleTriggerTransaction}
            disabled={isTransacting}
            className={`w-full h-[44px] py-[13px] px-md border border-white flex items-center justify-center hover-border-bright transition-all bg-layer-02 ${
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
              {isTransacting
                ? 'TRANSACTION IN PROGRESS...'
                : 'TRIGGER SAMPLE TRANSACTION'}
            </span>
          </button>

          {/* Transaction Details */}
          {transaction && (
            <div className="w-full inline-flex flex-col justify-start items-start gap-sm">
              <div className="self-stretch justify-center text-primary text-sm text-body3 font-normal leading-6">
                Sample Transaction Details (Off-Chain)
              </div>
              <div className="self-stretch flex flex-col justify-start items-start gap-xs">
                <div className="self-stretch inline-flex justify-start items-start gap-xs">
                  <div className="w-14 justify-center text-tertiary text-sm font-normal leading-6">
                    From
                  </div>
                  <div className="flex-1 flex justify-start items-center gap-xs">
                    <div className="w-3.5 h-3.5 bg-[#ADFFBE] rounded-full" />
                    <div className="flex-1 justify-center text-primary text-sm font-normal leading-6">
                      Node {transaction.path[0]}
                    </div>
                  </div>
                </div>
                <div className="self-stretch inline-flex justify-start items-start gap-xs">
                  <div className="w-14 justify-center text-tertiary text-sm font-normal leading-6">
                    To
                  </div>
                  <div className="flex-1 flex justify-start items-center gap-xs">
                    <div className="w-3.5 h-3.5 bg-[#A2D2FF] rounded-full" />
                    <div className="flex-1 justify-center text-primary text-sm font-normal leading-6">
                      Node {transaction.path[transaction.path.length - 1]}
                    </div>
                  </div>
                </div>
                <div className="self-stretch inline-flex justify-start items-start gap-xs">
                  <div className="w-14 justify-center text-tertiary text-sm font-normal leading-6">
                    Path
                  </div>
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
        </div>

        {/* Network Status Footer */}
        <div className="border-t border-invisible p-sm flex flex-col gap-sm">
          <div className="text-label text-tertiary mb-xs">NETWORK STATUS</div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Nodes</div>
            <div className="text-body3 text-primary">19</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Channels</div>
            <div className="text-body3 text-primary">
              {22 + customChannels.length - closedEdges.size}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L2 Txns</div>
            <div className="text-body3 text-primary">{l2Txns.toLocaleString()}</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L1 Channel Ops</div>
            <div className="text-body3 text-primary">{l1Ops}</div>
          </div>
        </div>
      </div>

      {/* Right Side - Network Layers */}
      <div className="flex flex-col lg:flex-1" style={{ minHeight: 0 }}>
        {/* FIBER NETWORK (LAYER 2) */}
        <div className="border-b border-invisible flex flex-col" style={{ flex: '1 1 auto', minHeight: 0 }}>
          {/* Layer 2 Header */}
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible flex-shrink-0">
            <div className="text-label text-primary">FIBER NETWORK (LAYER 2)</div>
          </div>

          {/* Layer 2 Content */}
          <div className="relative bg-layer-01" style={{ height: '524px' }}>
            <canvas
              ref={canvasRef}
              width={1000}
              height={1050}
              className="block w-full h-full"
              style={{ imageRendering: 'auto', cursor: 'pointer' }}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
            />

            {/* Tablet Controls */}
            <div className="lg:hidden px-lg pb-lg flex flex-col gap-sm bg-layer-01">
              <button
                onClick={handleTriggerTransaction}
                disabled={isTransacting}
                className={`w-full h-16 px-md py-sm border border-white flex items-center justify-center gap-md transition-all bg-layer-02 ${
                  isTransacting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover-border-bright'
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
                  {isTransacting
                    ? 'TRANSACTION IN PROGRESS...'
                    : 'TRIGGER SAMPLE TRANSACTION'}
                </span>
              </button>

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

              <div className="text-body3 text-tertiary text-center">
                Advanced channel controls are available on desktop
              </div>
            </div>
          </div>
        </div>

        {/* NERVOS CKB (LAYER 1) */}
        <div className="hidden lg:flex flex-col flex-shrink-0">
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible bg-layer-01">
            <div className="text-label text-primary">NERVOS CKB (LAYER 1)</div>
          </div>
          <div className="h-[80px] relative bg-layer-01 overflow-hidden flex-shrink-0">
            {/* Channel Opened Notification */}
            {showChannelNotification && (
              <div className="absolute right-0 top-[20px] h-[40px] px-3 bg-[#ADFFBE] inline-flex justify-center items-center gap-2 animate-slide-left">
                <div className="text-center text-[#000000] text-sm font-normal leading-6">
                  Channel opened
                </div>
              </div>
            )}

            {/* Channel Closed Notification */}
            {showChannelClosedNotification && (
              <div className="absolute right-0 top-[20px] h-[40px] px-3 bg-[#FFA2A2] inline-flex justify-center items-center gap-2 animate-slide-left">
                <div className="text-center text-[#000000] text-sm font-normal leading-6">
                  Channel closed
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Network Status - Tablet & Mobile */}
        <div className="lg:hidden border-t border-invisible p-md flex flex-col gap-md">
          <div className="text-label text-tertiary">NETWORK STATUS</div>
          <div className="flex flex-col md:grid md:grid-cols-2 gap-sm md:gap-md">
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Nodes</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">19</div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Channels</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">
                {22 + customChannels.length - closedEdges.size}
              </div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">L2 Txns</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{l2Txns.toLocaleString()}</div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">L1 Channel Ops</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{l1Ops}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

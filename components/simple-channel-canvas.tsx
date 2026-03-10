'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

interface Node {
  id: number;
  x: number;
  y: number;
}

interface CustomChannel {
  from: number;
  to: number;
  color: string;
}

export default function SimpleChannelCanvas() {
  const COLOR_BORDER_SUBTLE = '#525252';
  const COLOR_CHANNEL_OPEN = '#ADFFBE';
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [customChannel, setCustomChannel] = useState<CustomChannel | null>(null);
  const [isChannelOpen, setIsChannelOpen] = useState(false);
  const [isChannelSelected, setIsChannelSelected] = useState(false);
  const [l1Ops, setL1Ops] = useState(0);
  const [l2Txns, setL2Txns] = useState(0);
  const [showChannelNotification, setShowChannelNotification] = useState(false);
  const [showChannelClosedNotification, setShowChannelClosedNotification] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const openNotificationTimeoutRef = useRef<number | null>(null);

  // Fixed canvas dimensions
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 200;

  // Two fixed nodes positioned on left and right
  const nodes: Node[] = [
    { id: 1, x: 100, y: 100 },
    { id: 2, x: 300, y: 100 },
  ];

  // Draw the network
  const drawNetwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw custom channel if exists
    if (customChannel) {
      const fromNode = nodes.find((n) => n.id === customChannel.from);
      const toNode = nodes.find((n) => n.id === customChannel.to);

      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = isChannelSelected ? '#FFA2A2' : customChannel.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw nodes
    nodes.forEach((node) => {
      const isSelected = selectedNodes.includes(node.id);
      const isHovered = hoveredNodeId === node.id;

      // Determine node color
      let nodeColor = '#757575'; // Default gray
      if (isSelected || isHovered) {
        nodeColor = '#ffffff'; // White for selected/hovered
      }

      // Base circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Highlight ring for selected/hovered nodes
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw node label
      ctx.font = '400 14px Inter';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`Node ${node.id}`, node.x, node.y + 16);
    });
  }, [nodes, selectedNodes, hoveredNodeId, customChannel, isChannelSelected]);

  useEffect(() => {
    drawNetwork();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawNetwork]);

  useEffect(() => {
    return () => {
      if (openNotificationTimeoutRef.current) {
        window.clearTimeout(openNotificationTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if hovering over a node
    let foundNode: number | null = null;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 15) {
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
      if (Math.sqrt(dx * dx + dy * dy) <= 15) {
        // Toggle node selection with max 2 nodes
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

    if (customChannel && isChannelOpen) {
      const fromNode = nodes.find((n) => n.id === customChannel.from);
      const toNode = nodes.find((n) => n.id === customChannel.to);
      if (!fromNode || !toNode) return;

      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const dot = ((x - fromNode.x) * dx + (y - fromNode.y) * dy) / (len * len);

      if (dot >= 0 && dot <= 1) {
        const projX = fromNode.x + dot * dx;
        const projY = fromNode.y + dot * dy;
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
        if (dist <= 12) {
          setIsChannelSelected((prev) => !prev);
          return;
        }
      }
    }

    setIsChannelSelected(false);
  };

  const handleOpenChannel = () => {
    if (selectedNodes.length === 2) {
      const newChannel: CustomChannel = {
        from: selectedNodes[0],
        to: selectedNodes[1],
        color: COLOR_CHANNEL_OPEN,
      };
      setCustomChannel(newChannel);
      setIsChannelOpen(true);
      setIsChannelSelected(false);
      setL1Ops((prev) => prev + 1);
      setL2Txns((prev) => prev + 1);
      setSelectedNodes([]);

      // Show notification
      if (openNotificationTimeoutRef.current) {
        window.clearTimeout(openNotificationTimeoutRef.current);
      }
      setShowChannelNotification(true);
      openNotificationTimeoutRef.current = window.setTimeout(() => {
        setShowChannelNotification(false);
        setCustomChannel((prev) =>
          prev && prev.color === COLOR_CHANNEL_OPEN
            ? { ...prev, color: COLOR_BORDER_SUBTLE }
            : prev
        );
      }, 3000);
    }
  };

  const handleCloseChannel = () => {
    if (isChannelOpen && isChannelSelected) {
      setCustomChannel(null);
      setIsChannelOpen(false);
      setIsChannelSelected(false);
      setL1Ops((prev) => prev + 1);
      setSelectedNodes([]);

      // Show notification
      setShowChannelClosedNotification(true);
      setTimeout(() => {
        setShowChannelClosedNotification(false);
      }, 3000);
    }
  };

  // Simulate L2 transaction when channel is open
  useEffect(() => {
    if (!isChannelOpen) return;

    const interval = setInterval(() => {
      setL2Txns((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [isChannelOpen]);

  return (
    <div className="w-full bg-layer-01 border border-invisible flex flex-col">
      {/* Right Side - Network Layers */}
      <div className="flex flex-col w-full min-w-0">
        {/* FIBER NETWORK (LAYER 2) */}
        <div className="border-b border-invisible flex flex-col flex-1">
          {/* Layer 2 Header */}
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible">
            <div className="text-label text-primary">FIBER NETWORK (LAYER 2)</div>
          </div>

          {/* Layer 2 Content - Network Visualization Area */}
          <div className="relative bg-layer-01 flex items-center justify-center overflow-hidden w-full h-[280px] sm:h-[340px] pt-4 pb-[72px] px-2">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block w-auto h-auto max-w-full max-h-full"
              style={{ imageRendering: 'auto', cursor: 'pointer' }}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
            />

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 w-[min(96%,900px)] flex items-center gap-2">
              <button
                onClick={handleOpenChannel}
                disabled={selectedNodes.length !== 2 || isChannelOpen}
                title={selectedNodes.length !== 2 || isChannelOpen ? 'Select two nodes in the network' : undefined}
                className={`flex-1 h-12 px-sm border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                  selectedNodes.length !== 2 || isChannelOpen
                    ? 'border-white/30 opacity-50 cursor-not-allowed'
                    : 'border-invisible cursor-pointer hover:bg-layer-03'
                }`}
              >
                <Image src="/plus2.svg" alt="Plus" width={20} height={20} className="flex-shrink-0" style={{ objectFit: 'contain' }} />
                <span className="text-button text-primary font-bold">OPEN CHANNEL</span>
              </button>
              <button
                onClick={handleCloseChannel}
                disabled={!isChannelSelected}
                title={!isChannelSelected ? 'Select a line to close' : undefined}
                className={`flex-1 h-12 px-sm border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                  !isChannelSelected
                    ? 'border-white/30 opacity-50 cursor-not-allowed'
                    : 'border-invisible cursor-pointer hover:bg-layer-03'
                }`}
              >
                <Image src="/minus2.svg" alt="Minus" width={20} height={20} className="flex-shrink-0" style={{ objectFit: 'contain' }} />
                <span className="text-button text-primary font-bold">CLOSE CHANNEL</span>
              </button>
            </div>
          </div>
        </div>

        {/* NERVOS CKB (LAYER 1) */}
        <div className="flex flex-col">
          {/* Layer 1 Header */}
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible bg-layer-01">
            <div className="text-label text-primary">NERVOS CKB (LAYER 1)</div>
          </div>

          {/* Layer 1 Content */}
          <div className="h-[64px] relative bg-layer-01 overflow-hidden">
            {/* Channel Opened Notification */}
            {showChannelNotification && (
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 h-[32px] px-3 bg-[#ADFFBE] inline-flex justify-center items-center gap-2 animate-slide-left"
                style={{ animationDuration: '4s', animationTimingFunction: 'ease-in' }}
              >
                <div className="text-center text-[#000000] text-sm font-normal leading-6">
                  Channel opened
                </div>
              </div>
            )}

            {/* Channel Closed Notification */}
            {showChannelClosedNotification && (
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 h-[32px] px-3 bg-[#FFA2A2] inline-flex justify-center items-center gap-2 animate-slide-left"
                style={{ animationDuration: '4s', animationTimingFunction: 'ease-in' }}
              >
                <div className="text-center text-[#000000] text-sm font-normal leading-6">
                  Channel closed
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Network Status */}
       <div className="border-t border-invisible p-sm flex flex-col gap-sm">
          <div className="text-label text-tertiary">NETWORK STATUS</div>
          <div className="flex flex-col md:grid md:grid-cols-2 gap-sm md:gap-md">
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Nodes</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{nodes.length}</div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Channels</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{customChannel ? 1 : 0}</div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">L2 Txns</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{l2Txns}</div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">L1 Channel Ops</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

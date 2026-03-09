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
  const [l1Ops, setL1Ops] = useState(0);
  const [l2Txns, setL2Txns] = useState(0);
  const [showChannelNotification, setShowChannelNotification] = useState(false);
  const [showChannelClosedNotification, setShowChannelClosedNotification] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const openNotificationTimeoutRef = useRef<number | null>(null);

  // Fixed canvas dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;

  // Two fixed nodes positioned on left and right
  const nodes: Node[] = [
    { id: 1, x: 200, y: 200 },
    { id: 2, x: 600, y: 200 },
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
        ctx.strokeStyle = customChannel.color;
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
  }, [nodes, selectedNodes, hoveredNodeId, customChannel]);

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
    if (isChannelOpen) {
      setCustomChannel(null);
      setIsChannelOpen(false);
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
    <div className="w-full bg-layer-01 border border-invisible flex flex-col min-[1440px]:flex-row">
      {/* Control Panel */}
      <div className="hidden min-[1440px]:flex min-[1440px]:w-[280px] border-r border-invisible flex-col min-[1440px]:overflow-y-auto">
        {/* Header */}
        <div className="py-[24px] px-[16px]">
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
              disabled={selectedNodes.length !== 2 || isChannelOpen}
              className={`w-full h-[44px] py-[13px] px-md border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                selectedNodes.length !== 2 || isChannelOpen
                  ? 'border-white/30 opacity-50 cursor-not-allowed'
                  : 'border-invisible cursor-pointer hover:bg-layer-03'
              }`}
            >
              <Image
                src="/plus2.svg"
                alt="Plus"
                width={24}
                height={24}
                className="text-primary mr-2 flex-shrink-0"
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
              disabled={!isChannelOpen}
              className={`w-full h-[44px] py-[13px] px-md border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                !isChannelOpen
                  ? 'border-white/30 opacity-50 cursor-not-allowed'
                  : 'border-invisible cursor-pointer hover:bg-layer-03'
              }`}
            >
              <Image
                src="/minus2.svg"
                alt="Minus"
                width={24}
                height={24}
                className="text-primary mr-2 flex-shrink-0"
                style={{ objectFit: 'contain' }}
              />
              <span className="text-button text-primary font-bold">
                CLOSE CHANNEL
              </span>
            </button>
          </div>
        </div>

        {/* Network Status Footer */}
        <div className="border-t border-invisible p-sm flex flex-col gap-sm mt-4">
          <div className="text-label text-tertiary mb-xs">NETWORK STATUS</div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Nodes</div>
            <div className="text-body3 text-primary">2</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Channels</div>
            <div className="text-body3 text-primary">{isChannelOpen ? 1 : 0}</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L2 Txns</div>
            <div className="text-body3 text-primary">{l2Txns}</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L1 Channel Ops</div>
            <div className="text-body3 text-primary">{l1Ops}</div>
          </div>
        </div>
      </div>

      {/* Right Side - Network Layers */}
      <div className="flex flex-col w-full min-[1440px]:flex-1 min-w-0">
        {/* FIBER NETWORK (LAYER 2) */}
        <div className="border-b border-invisible flex flex-col flex-1">
          {/* Layer 2 Header */}
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible">
            <div className="text-label text-primary">FIBER NETWORK (LAYER 2)</div>
          </div>

          {/* Layer 2 Content - Network Visualization Area */}
          <div className="relative bg-layer-01 flex items-center justify-center overflow-hidden w-full h-[280px] sm:h-[340px] min-[1440px]:h-[400px]">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block w-auto h-auto max-w-full max-h-full"
              style={{ imageRendering: 'auto', cursor: 'pointer' }}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
            />
          </div>
        </div>

        {/* NERVOS CKB (LAYER 1) */}
        <div className="flex flex-col">
          {/* Layer 1 Header */}
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible bg-layer-01">
            <div className="text-label text-primary">NERVOS CKB (LAYER 1)</div>
          </div>

          {/* Layer 1 Content */}
          <div className="h-[80px] relative bg-layer-01 overflow-hidden">
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

        {/* Control Panel - Mobile & Tablet */}
        <div className="min-[1440px]:hidden border-t border-invisible px-md py-sm flex flex-col gap-md bg-layer-01">
          <div className="text-label text-tertiary">CONTROL PANEL</div>
          <div className="flex flex-col md:flex-row gap-sm">
            <div className="flex-1 flex flex-col gap-sm">
              <div className="text-body2 text-secondary">Select two nodes in the network</div>
              <button
                onClick={handleOpenChannel}
                disabled={selectedNodes.length !== 2 || isChannelOpen}
                className={`w-full h-[44px] py-[13px] px-md border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                  selectedNodes.length !== 2 || isChannelOpen
                    ? 'border-white/30 opacity-50 cursor-not-allowed'
                    : 'border-invisible cursor-pointer hover:bg-layer-03'
                }`}
              >
                <Image
                  src="/plus2.svg"
                  alt="Plus"
                  width={24}
                  height={24}
                  className="text-primary mr-2 flex-shrink-0"
                  style={{ objectFit: 'contain' }}
                />
                <span className="text-button text-primary font-bold">OPEN CHANNEL</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col gap-sm">
              <div className="text-body2 text-secondary">Select a line to close</div>
              <button
                onClick={handleCloseChannel}
                disabled={!isChannelOpen}
                className={`w-full h-[44px] py-[13px] px-md border flex items-center justify-center gap-sm transition-all bg-layer-02 ${
                  !isChannelOpen
                    ? 'border-white/30 opacity-50 cursor-not-allowed'
                    : 'border-invisible cursor-pointer hover:bg-layer-03'
                }`}
              >
                <Image
                  src="/minus2.svg"
                  alt="Minus"
                  width={24}
                  height={24}
                  className="text-primary mr-2 flex-shrink-0"
                  style={{ objectFit: 'contain' }}
                />
                <span className="text-button text-primary font-bold">CLOSE CHANNEL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Network Status - Mobile & Tablet */}
        <div className="min-[1440px]:hidden border-t border-invisible p-sm flex flex-col gap-sm">
          <div className="text-label text-tertiary">NETWORK STATUS</div>
          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Nodes</div>
            <div className="text-body3 text-primary">2</div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">Channels</div>
            <div className="text-body3 text-primary">{isChannelOpen ? 1 : 0}</div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L2 Txns</div>
            <div className="text-body3 text-primary">{l2Txns}</div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-body3 text-tertiary">L1 Channel Ops</div>
            <div className="text-body3 text-primary">{l1Ops}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

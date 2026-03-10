'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

interface Node {
  id: number;
  x: number;
  y: number;
}

interface CustomChannel {
  curveOffset: number;
  color: string;
}

export default function SimpleChannelCanvas() {
  const COLOR_BORDER_SUBTLE = '#525252';
  const COLOR_CHANNEL_OPEN = '#ADFFBE';
  const MAX_CHANNELS = 7;

  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState<number | null>(null);
  const [l1Ops, setL1Ops] = useState(0);
  const [l2Txns, setL2Txns] = useState(0);
  const [showChannelNotification, setShowChannelNotification] = useState(false);
  const [showChannelClosedNotification, setShowChannelClosedNotification] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const openNotificationTimeoutRef = useRef<number | null>(null);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;

  const nodes: Node[] = [
    { id: 1, x: 100, y: 200 },
    { id: 2, x: 700, y: 200 },
  ];

  const AVAILABLE_CURVE_OFFSETS = [0, -28, 28, -56, 56, -84, 84];

  const openChannelTooltip =
  selectedNodes.length !== 2
    ? 'Select two nodes in the network'
    : customChannels.length >= MAX_CHANNELS
    ? 'For visual clarity, this demo limits the number of channels shown. In practice nodes can open many channels.'
    : '';

  const closeChannelTooltip =
  selectedChannelIndex === null
    ? 'Select a channel to close'
    : '';

  const getCurveControlPoint = (curveOffset: number, fromNode: Node, toNode: Node) => {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const nx = -dy / len;
    const ny = dx / len;

    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;

    return {
      controlX: midX + nx * curveOffset,
      controlY: midY + ny * curveOffset,
    };
  };

  const drawNetwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fromNode = nodes[0];
    const toNode = nodes[1];

    customChannels.forEach((channel, index) => {
      const { controlX, controlY } = getCurveControlPoint(channel.curveOffset, fromNode, toNode);

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.quadraticCurveTo(controlX, controlY, toNode.x, toNode.y);
      ctx.strokeStyle = selectedChannelIndex === index ? '#FFA2A2' : channel.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    nodes.forEach((node) => {
      const isSelected = selectedNodes.includes(node.id);
      const isHovered = hoveredNodeId === node.id;

      let nodeColor = '#757575';
      if (isSelected || isHovered) {
        nodeColor = '#ffffff';
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = '400 14px Inter';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`Node ${node.id}`, node.x, node.y + 16);
    });
  }, [nodes, selectedNodes, hoveredNodeId, customChannels, selectedChannelIndex]);

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

    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 15) {
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

    if (customChannels.length > 0) {
      const fromNode = nodes[0];
      const toNode = nodes[1];

      let hitIndex: number | null = null;
      let bestDistance = Infinity;

      for (let i = 0; i < customChannels.length; i++) {
        const channel = customChannels[i];
        const { controlX, controlY } = getCurveControlPoint(channel.curveOffset, fromNode, toNode);

        for (let t = 0; t <= 1; t += 0.05) {
          const px =
            (1 - t) * (1 - t) * fromNode.x +
            2 * (1 - t) * t * controlX +
            t * t * toNode.x;

          const py =
            (1 - t) * (1 - t) * fromNode.y +
            2 * (1 - t) * t * controlY +
            t * t * toNode.y;

          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

          if (dist < 10 && dist < bestDistance) {
            bestDistance = dist;
            hitIndex = i;
          }
        }
      }

      if (hitIndex !== null) {
        setSelectedChannelIndex((prev) => (prev === hitIndex ? null : hitIndex));
        return;
      }
    }

    setSelectedChannelIndex(null);
    setSelectedNodes([]);
  };

  const handleOpenChannel = () => {
    if (selectedNodes.length === 2) {
      const usedOffsets = customChannels.map((ch) => ch.curveOffset);
      const nextOffset =
        AVAILABLE_CURVE_OFFSETS.find((offset) => !usedOffsets.includes(offset)) ?? 0;

      const newChannel: CustomChannel = {
        curveOffset: nextOffset,
        color: COLOR_CHANNEL_OPEN,
      };

      setCustomChannels((prev) => [
        ...prev.map((ch) =>
          ch.color === COLOR_CHANNEL_OPEN ? { ...ch, color: COLOR_BORDER_SUBTLE } : ch
        ),
        newChannel,
      ]);

      setSelectedChannelIndex(null);
      setL1Ops((prev) => prev + 1);
      setL2Txns((prev) => prev + 1);

      if (openNotificationTimeoutRef.current) {
        window.clearTimeout(openNotificationTimeoutRef.current);
      }
      setShowChannelNotification(true);
      openNotificationTimeoutRef.current = window.setTimeout(() => {
        setShowChannelNotification(false);
        setCustomChannels((prev) =>
          prev.map((ch) =>
            ch.color === COLOR_CHANNEL_OPEN ? { ...ch, color: COLOR_BORDER_SUBTLE } : ch
          )
        );
      }, 3000);
    }
  };

  const handleCloseChannel = () => {
    if (selectedChannelIndex !== null) {
      setCustomChannels((prev) =>
        prev.filter((_, index) => index !== selectedChannelIndex)
      );
      setSelectedChannelIndex(null);
      setL1Ops((prev) => prev + 1);
      setSelectedNodes([]);

      setShowChannelClosedNotification(true);
      setTimeout(() => {
        setShowChannelClosedNotification(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (customChannels.length === 0) return;

    const interval = setInterval(() => {
      setL2Txns((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [customChannels.length]);

  return (
    <div className="w-full bg-layer-01 border border-invisible flex flex-col">
      <div className="flex flex-col w-full min-w-0">
        <div className="border-b border-invisible flex flex-col flex-1">
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible">
            <div className="text-label text-primary">FIBER NETWORK (LAYER 2)</div>
          </div>

         <div className="bg-layer-01 flex flex-col overflow-hidden">
            <div className="w-full flex items-start justify-center overflow-visible">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block w-full h-auto cursor-pointer"
                style={{ imageRendering: 'auto'}}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
              />
            </div>

            <div className="px-2 sm:px-3 md:px-4 pb-3 pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <div className="relative group">
                  <button
                    onClick={handleOpenChannel}
                    disabled={selectedNodes.length !== 2 || customChannels.length >= MAX_CHANNELS}
                    className={`w-full min-w-0 h-12 px-3 border flex items-center justify-center gap-2 transition-all bg-layer-02 ${
                      selectedNodes.length !== 2 || customChannels.length >= MAX_CHANNELS
                        ? 'border-white/30 opacity-50 cursor-not-allowed'
                        : 'border-invisible cursor-pointer hover:bg-layer-03'
                    }`}
                  >
                    <Image
                      src="/plus2.svg"
                      alt="Plus"
                      width={20}
                      height={20}
                      className="flex-shrink-0"
                      style={{ objectFit: 'contain' }}
                    />
                    <span className="text-button text-primary font-bold">
                      OPEN CHANNEL
                    </span>
                  </button>

                  {openChannelTooltip && (
                    <div
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                      w-[260px] px-3 py-2
                      text-xs text-white text-center
                      bg-black/90 rounded
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                      delay-0 group-hover:delay-1000
                      pointer-events-none
                      z-20"
                    >
                      {openChannelTooltip}
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <button
                    onClick={handleCloseChannel}
                    disabled={selectedChannelIndex === null}
                    className={`w-full min-w-0 h-12 px-3 border flex items-center justify-center gap-2 transition-all bg-layer-02 ${
                      selectedChannelIndex === null
                        ? 'border-white/30 opacity-50 cursor-not-allowed'
                        : 'border-invisible cursor-pointer hover:bg-layer-03'
                    }`}
                  >
                    <Image
                      src="/minus2.svg"
                      alt="Minus"
                      width={20}
                      height={20}
                      className="flex-shrink-0"
                      style={{ objectFit: 'contain' }}
                    />
                    <span className="text-button text-primary font-bold">
                      CLOSE CHANNEL
                    </span>
                  </button>

                  {closeChannelTooltip && (
                    <div
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                      w-[200px] px-3 py-2
                      text-xs text-white text-center
                      bg-black/90 rounded
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                      delay-0 group-hover:delay-1000
                      pointer-events-none
                      z-20"
                    >
                      {closeChannelTooltip}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="h-[48px] px-lg flex items-center justify-center border-b border-invisible bg-layer-01">
            <div className="text-label text-primary">NERVOS CKB (LAYER 1)</div>
          </div>

          <div className="h-[64px] relative bg-layer-01 overflow-hidden">
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

        <div className="border-t border-invisible p-sm flex flex-col gap-sm">
          <div className="text-label text-tertiary">NETWORK STATUS</div>
          <div className="flex flex-col md:grid md:grid-cols-2 gap-sm md:gap-md">
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Nodes</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{nodes.length}</div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Channels</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{customChannels.length}</div>
            </div>
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">L2 Txns</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{l2Txns}</div>
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
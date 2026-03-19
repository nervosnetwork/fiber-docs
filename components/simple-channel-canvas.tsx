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

interface Layer1Notification {
  id: number;
  type: 'funding' | 'shutdown';
}

export default function SimpleChannelCanvas() {
  const COLOR_BORDER_SUBTLE = '#525252';
  const COLOR_CHANNEL_OPEN = '#ADFFBE';
  const MAX_CHANNELS = 7;
  const NODE_COUNT = 2;
  const NODE_CLICK_RADIUS = 15;

  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState<number | null>(null);
  const [l1Ops, setL1Ops] = useState(0);
  const [l2Txns, setL2Txns] = useState(0);
  const [l1Notifications, setL1Notifications] = useState<Layer1Notification[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const openNotificationTimeoutRef = useRef<number | null>(null);
  const l1NotificationTimeoutsRef = useRef<number[]>([]);
  const nextNotificationIdRef = useRef(1);

  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 420;

  const AVAILABLE_CURVE_OFFSETS = [0, -36, 36, -72, 72, -108, 108];

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

  const getChannelHitLineWidth = (scaleX: number, scaleY: number) => {
    const minScale = Math.max(Math.min(scaleX, scaleY), 0.01);
    const width = 20 / minScale;
    return Math.min(34, Math.max(14, width));
  };

  const getOffsetScale = (width: number, height: number) => {
    return Math.max(0.7, Math.min(1.2, Math.min(width / 900, height / 420)));
  };

  const getLayoutNodes = (width: number, height: number): Node[] => {
    const horizontalPadding = Math.min(140, Math.max(72, width * 0.16));
    const centerY = height * 0.5;
    return [
      { id: 1, x: horizontalPadding, y: centerY },
      { id: 2, x: width - horizontalPadding, y: centerY },
    ];
  };

  const getScaledChannelPath = (
    channel: CustomChannel,
    fromNode: Node,
    toNode: Node,
    offsetScale: number
  ) => {
    const { controlX, controlY } = getCurveControlPoint(
      channel.curveOffset * offsetScale,
      fromNode,
      toNode
    );
    const path = new Path2D();
    path.moveTo(fromNode.x, fromNode.y);
    path.quadraticCurveTo(controlX, controlY, toNode.x, toNode.y);
    return path;
  };

  const drawNetwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const drawWidth = Math.max(rect.width, 1);
    const drawHeight = Math.max(rect.height, 1);
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(drawWidth * dpr);
    const targetHeight = Math.round(drawHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, drawWidth, drawHeight);

    const nodes = getLayoutNodes(drawWidth, drawHeight);
    const fromNode = nodes[0];
    const toNode = nodes[1];
    const offsetScale = getOffsetScale(drawWidth, drawHeight);

    customChannels.forEach((channel, index) => {
      const path = getScaledChannelPath(channel, fromNode, toNode, offsetScale);
      ctx.strokeStyle = selectedChannelIndex === index ? '#FFA2A2' : channel.color;
      ctx.lineWidth = 2;
      ctx.stroke(path);
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
  }, [selectedNodes, hoveredNodeId, customChannels, selectedChannelIndex]);

  useEffect(() => {
    drawNetwork();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawNetwork]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      drawNetwork();
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawNetwork]);

  useEffect(() => {
    return () => {
      if (openNotificationTimeoutRef.current) {
        window.clearTimeout(openNotificationTimeoutRef.current);
      }
      l1NotificationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      l1NotificationTimeoutsRef.current = [];
    };
  }, []);

  const pushLayer1Notification = (type: Layer1Notification['type']) => {
    const id = nextNotificationIdRef.current++;
    setL1Notifications((prev) => [...prev, { id, type }]);

    const timeoutId = window.setTimeout(() => {
      setL1Notifications((prev) => prev.filter((notification) => notification.id !== id));
      l1NotificationTimeoutsRef.current = l1NotificationTimeoutsRef.current.filter(
        (existingTimeoutId) => existingTimeoutId !== timeoutId
      );
    }, 4000);

    l1NotificationTimeoutsRef.current.push(timeoutId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nodes = getLayoutNodes(rect.width, rect.height);

    let foundNode: number | null = null;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= NODE_CLICK_RADIUS) {
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nodes = getLayoutNodes(rect.width, rect.height);
    const offsetScale = getOffsetScale(rect.width, rect.height);
    const scaleX = rect.width / CANVAS_WIDTH || 1;
    const scaleY = rect.height / CANVAS_HEIGHT || 1;

    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= NODE_CLICK_RADIUS) {
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
      const ctx = canvas.getContext('2d');
      const fromNode = nodes[0];
      const toNode = nodes[1];

      if (ctx) {
        const previousLineWidth = ctx.lineWidth;
        ctx.lineWidth = getChannelHitLineWidth(scaleX, scaleY);

        for (let i = customChannels.length - 1; i >= 0; i--) {
          const path = getScaledChannelPath(customChannels[i], fromNode, toNode, offsetScale);
          if (ctx.isPointInStroke(path, x, y)) {
            setSelectedChannelIndex((prev) => (prev === i ? null : i));
            ctx.lineWidth = previousLineWidth;
            return;
          }
        }

        ctx.lineWidth = previousLineWidth;
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
      pushLayer1Notification('funding');
      openNotificationTimeoutRef.current = window.setTimeout(() => {
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

      pushLayer1Notification('shutdown');
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
                className="block w-full h-auto min-h-[260px] sm:min-h-[300px] md:min-h-[340px] cursor-pointer"
                style={{ imageRendering: 'auto', aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
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
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-end gap-2 pointer-events-none">
              {l1Notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`h-[32px] px-3 inline-flex justify-center items-center gap-2 animate-slide-left ${
                    notification.type === 'funding' ? 'bg-[#ADFFBE]' : 'bg-[#FFA2A2]'
                  }`}
                  style={{ animationDuration: '4s', animationTimingFunction: 'ease-in' }}
                >
                  <div className="text-center text-[#000000] text-sm font-normal leading-6">
                    {notification.type === 'funding'
                      ? 'Funding transaction'
                      : 'Shutdown transaction'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-invisible p-sm flex flex-col gap-sm">
          <div className="text-label text-tertiary">NETWORK STATUS</div>
          <div className="flex flex-col md:grid md:grid-cols-2 gap-sm md:gap-md">
            <div className="flex md:justify-between md:gap-sm">
              <div className="w-[90px] md:w-auto text-body3 text-tertiary">Nodes</div>
              <div className="ml-[20px] md:ml-0 text-body3 text-primary">{NODE_COUNT}</div>
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

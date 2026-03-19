'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Section from './section';

interface NetworkData {
  totalNodes: number;
  channelLen: number;
  ckbLiquidity: number;
}

export default function NetworkStats() {
  const [data, setData] = useState<NetworkData>({
    totalNodes: 0,
    channelLen: 0,
    ckbLiquidity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          'https://fiber-dash-api-test.fiber.channel/analysis_hourly?net=testnet'
        );
        const result = await response.json();

        // 获取 total_nodes (转换为 10 进制)
        const totalNodes = parseInt(result.total_nodes, 16);

        // 获取 channel_len (转换为 10 进制)
        const channelLen = parseInt(result.channel_len, 16);

        // 获取 CKB liquidity
        const ckbCapacity = result.capacity_analysis?.find(
          (item: any) => item.name === 'ckb'
        );
        const ckbTotal = ckbCapacity
          ? parseInt(ckbCapacity.total, 16) / 100000000 // 从 Shannon 转换为 CKB
          : 0;

        setData({
          totalNodes,
          channelLen,
          ckbLiquidity: ckbTotal,
        });
      } catch (error) {
        console.error('Failed to fetch network stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  return (
    <Section className="mt-xxl">
      <div className="self-stretch flex flex-wrap md:inline-flex md:flex-nowrap justify-start items-stretch">
        <div className="w-full md:flex-1 flex flex-wrap md:flex-nowrap justify-start items-stretch">
          <div className="w-1/2 md:flex-1 p-sm border border-invisible inline-flex flex-col justify-start items-start gap-lg">
            <div className="justify-center text-tertiary text-label">
              Fiber nodes
            </div>
            <div className="justify-center text-primary text-h2">
              {loading ? '-' : formatNumber(data.totalNodes)}
            </div>
          </div>
          <div className="w-1/2 md:flex-1 p-sm border border-invisible inline-flex flex-col justify-start items-start gap-lg">
            <div className="justify-center text-tertiary text-label">
              Fiber channels
            </div>
            <div className="justify-center text-primary text-h2">
              {loading ? '-' : formatNumber(data.channelLen)}
            </div>
          </div>
          <div className="w-1/2 md:flex-1 p-sm border border-invisible inline-flex flex-col justify-start items-start gap-lg">
            <div className="justify-center text-tertiary text-label">
              CKB Liquidity
            </div>
            <div className="justify-center text-primary text-h2">
              {loading ? '-' : formatNumber(Math.round(data.ckbLiquidity))}
            </div>
          </div>
          <div className="w-1/2 md:w-32 p-sm border border-invisible inline-flex flex-col justify-center items-center gap-sm hover-invert cursor-pointer"
            data-hovered="false"
            data-orientation="Vertical"
            onClick={() => window.open('https://fiber-dashboard-3aew.vercel.app/', '_blank')}
          >
            <Image
              src="/external.svg"
              alt="External"
              width={24}
              height={24}
            />
            <div className="self-stretch text-center justify-center text-primary text-button">
              FIBER DASHBOARD
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

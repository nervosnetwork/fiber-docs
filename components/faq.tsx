import Section from './section';
import Accordion from './accordion';

interface FAQProps {
  isMobile: boolean;
}

export default function FAQ({ isMobile }: FAQProps) {
  return (
    <Section
      title={
        <div className="flex flex-col justify-start items-start">
          <div className="md:block">
            <span>Frequently </span>
            <span className="text-tertiary">Asked</span>
          </div>
          <div className="hidden md:block">Questions</div>
          <div className="md:hidden">Questions</div>
        </div>
      }
      layout={isMobile ? 'vertical' : 'horizontal'}
    >
      <Accordion
        items={[
          {
            question: 'What is the Fiber Network?',
            answer:
              'The Fiber network is a protocol designed to enhance the functionality, programmability, and connectivity of the Lightning Network. Built on the CKB blockchain, it is fully compatible with the Lightning Network at the protocol design level, creating a seamless connection between Bitcoin and CKB on Layer 2. This integration enables the smooth flow of transactions across both networks, making micropayments faster and cost-efficient. Tokens on the Fiber network are highly programmable, supporting the transfer of various assets including stablecoins. The Fiber network provides Bitcoin and Lightning Network users with secure off-chain payments, offering low transaction fees, high programmability, and enhanced interoperability.',
          },
          {
            question: 'What is the Lightning Network?',
            answer:
              'The Lightning Network is a second-layer protocol built on top of the Bitcoin blockchain that enables fast, low-cost transactions by creating off-chain payment channels between users.',
          },
          {
            question: 'What is a Payment Channel Network?',
            answer:
              'A Payment Channel Network is a system of interconnected payment channels that allows users to make transactions through multiple intermediary nodes without needing a direct channel to the recipient.',
          },
        ]}
        defaultExpandedIndex={0}
      />
    </Section>
  );
}

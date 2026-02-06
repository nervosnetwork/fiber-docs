'use client';

import { useEffect, useRef } from 'react';
import Section from './section';

interface CardItem {
  label: string
  title: string
  description: string
  image: string
}

const cards: CardItem[] = [
  {
    label: '1/5',
    title: 'Scalability',
    description:
      'Through off-chain payment channels and multi-hop routing, Fiber Network can achieve high-throughput transaction processing, meeting the needs of large-scale users.',
    image: '/scalability-animated.png',
  },
  {
    label: '2/5',
    title: 'Low cost',
    description:
      'By reducing the frequency of on-chain transactions, Fiber Network lowers transaction fees, making micropayments feasible and efficient.',
    image: '/low-cost-animated.png',
  },
  {
    label: '3/5',
    title: 'Fast',
    description:
      'The instant confirmation of off-chain transactions provides a split second payment confirmation experience suitable for various instant payment scenarios.',
    image: '/fast-animated.png',
  },
  {
    label: '4/5',
    title: 'Multi-Asset Support',
    description:
      'Fiber Network supports payments in a variety of digital assets, offering users a broader range of payment options.',
    image: '/multi-asset-animated.png',
  },
  {
    label: '5/5',
    title: 'Interoperability',
    description:
      'Fiber Network supports interoperability with the Bitcoin Lightning Network, providing support for cross-chain payments and asset transfers.',
    image: '/interoperability-animated.png',
  },
];

export default function StackedCards() {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const CONFIG = {
      SCROLL_PER_CARD: 600,
      SCALE_STEP: 0.05,
      OPACITY_STEP: 1,
      CARD_MIN_HEIGHT: 480,
      TOP_OFFSET_BUFFER: 64,
    };

    const updateCardDimensions = () => {
      const viewportHeight = window.innerHeight;
      let cardHeight = viewportHeight - 128;

      if (cardHeight < CONFIG.CARD_MIN_HEIGHT) {
        cardHeight = CONFIG.CARD_MIN_HEIGHT;
      }

      document.documentElement.style.setProperty(
        '--card-height',
        `${cardHeight}px`
      );

      if (trackRef.current) {
        const trackHeight =
          cards.length * CONFIG.SCROLL_PER_CARD + viewportHeight;
        trackRef.current.style.height = `${trackHeight}px`;
      }
    };

    const onScroll = () => {
      if (!trackRef.current) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const scrollTop = -trackRect.top + CONFIG.TOP_OFFSET_BUFFER;
      const globalProgress = scrollTop / CONFIG.SCROLL_PER_CARD;

      cardsRef.current.forEach((card, index) => {
        if (!card) return;

        const cardProgress = globalProgress - (index - 1);
        let yPos = 0;

        if (index === 0) {
          yPos = 0;
        } else {
          if (cardProgress < 0) {
            yPos = window.innerHeight;
          } else if (cardProgress < 1) {
            const startY = window.innerHeight;
            const ease = 1 - Math.pow(1 - cardProgress, 3);
            yPos = startY - startY * ease;
          } else {
            yPos = 0;
          }
        }

        let scale = 1;
        let opacity = 1;
        const nextCardProgress = globalProgress - index;

        if (nextCardProgress > 0) {
          const safeProgress = Math.min(nextCardProgress, 1);
          scale = 1 - safeProgress * CONFIG.SCALE_STEP;
          opacity = 1 - safeProgress * CONFIG.OPACITY_STEP;
        }

        card.style.transform = `translate3d(0, ${yPos}px, 0) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(index + 1);

        if (yPos > window.innerHeight || opacity <= 0) {
          card.style.visibility = 'hidden';
        } else {
          card.style.visibility = 'visible';
        }
      });
    };

    updateCardDimensions();
    onScroll();

    window.addEventListener('resize', () => {
      updateCardDimensions();
      onScroll();
    });

    window.addEventListener(
      'scroll',
      () => {
        requestAnimationFrame(onScroll);
      },
      { passive: true }
    );

    return () => {
      window.removeEventListener('resize', updateCardDimensions);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --card-height: calc(100vh - 128px);
        }

        .scroll-track {
          position: relative;
          width: 100%;
        }

        .sticky-container {
          position: sticky;
          top: 64px;
          width: 100%;
          height: max(480px, calc(100vh - 128px));
          perspective: 1000px;
          overflow: visible;
        }

        .card-stack {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .card {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #0a0a0a;
          border: 1px solid #272727;
          border-radius: 0px;
          box-shadow: 0 4px 40px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 480px;
          will-change: transform, opacity;
          transform-origin: center center;
        }

        .card-label {
          width: 100%;
          height: 48px;
          box-sizing: border-box;
          padding: 16px;
          border-bottom: 1px solid #272727;
          font-family: var(--font-label);
          font-size: var(--font-label-size-desktop);
          font-weight: var(--font-label-weight);
          line-height: var(--font-label-line-height);
          letter-spacing: var(--font-label-letter-spacing);
          color: var(--color-text-secondary);
          z-index: 10;
          background-color: #0A0A0A;
        }

        .card-body {
          display: flex;
          flex-direction: row;
          width: 100%;
          flex: 1;
        }

        .card-content-left {
          flex: 0 0 50%;
          width: 50%;
          padding: 0 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 40px;
        }

        .card-content-right {
          flex: 0 0 50%;
          width: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-left: 1px solid #272727;
        //   background: radial-gradient(
        //     circle at center,
        //     #151515 0%,
        //     #0e0e0e 70%
        //   );
          position: relative;
          overflow: hidden;
        }

        .card h3 {
          font-family: var(--font-h2);
          font-size: var(--font-h2-size-desktop);
          font-weight: var(--font-h2-weight);
          line-height: var(--font-h2-line-height);
          letter-spacing: var(--font-h2-letter-spacing);
          margin: 0;
          color: var(--color-text-primary);
                      font-weight:700;

        }

        .card p {
          font-family: var(--font-body2);
          font-size: var(--font-body2-size-desktop);
          font-weight: var(--font-body2-weight);
          line-height: var(--font-body2-line-height);
          letter-spacing: var(--font-body2-letter-spacing);
          margin: 0;
          color: var(--color-text-tertiary);
        }
        
        .card-content-right img {
          width: 320px;
          height: 320px;
          object-fit: contain;
        }

        @media (max-width: 1024px) {
          .sticky-container {
            top: 40px;
            // height: auto;
          }

          .card {
            border: none;
            border-bottom: 1px solid #272727;
            // height: auto;
            // min-height: auto;
          }

          .card-body {
            flex-direction: column-reverse;
            justify-content: center;
          }

          .card-label {
            font-size: var(--font-label-size-tablet);
            border: 1px solid #272727;
          }

          .card-content-left {
            width: 100%;
            flex: 0 0 auto;
            padding: 40px 120px;
            gap: 24px;
            justify-content: flex-start;
          }

          .card-content-right {
            width: 100%;
            flex: 0 0 auto;
            border-left: none;
            border-top: none;
            border-bottom: none;
            padding: 40px 120px;
          }

          .card-content-right img {
            width: 320px;
            height: 320px;
          }

          .card h3 {
            font-size: var(--font-h2-size-tablet);
            font-weight:700;
          }

          .card p {
            font-size: var(--font-body2-size-tablet);
          }
        }

        @media (max-width: 768px) {
          .sticky-container {
            top: 40px;
            // height: auto;
          }

          .card {
            border: none;
            border-bottom: 1px solid #272727;
            // height: auto;
            // min-height: auto;
          }

          .card-body {
            flex-direction: column-reverse;
            justify-content: center;
          }

          .card-label {
            font-size: var(--font-label-size-mobile);
            padding: 20px 24px;
            border: 1px solid #272727;
          }

          .card-content-left {
            padding: 40px 16px;
            justify-content: flex-start;
          }

          .card-content-right {
            padding: 40px 16px;
            border-bottom: none;
          }

          .card-content-right img {
            width: 320px;
            height: 320px;
          }

          .card h3 {
            font-size: var(--font-h2-size-mobile);
            font-weight:700;
          }

          .card p {
            font-size: var(--font-body2-size-mobile);
          }
        }
      `}</style>

      <div className="scroll-track" ref={trackRef}>
        <div className="sticky-container">
          <div className="card-stack">
            {cards.map((card, index) => (
              <article
                key={index}
                className="card"
                ref={(el) => {
                  if (el) cardsRef.current[index] = el;
                }}
              >
                <div className="card-label">{card.label}</div>
                <div className="card-body">
                  <div className="card-content-left">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                  <div className="card-content-right">
                    <img src={card.image} alt={card.title} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

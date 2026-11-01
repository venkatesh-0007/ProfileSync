"use client";
import { useSyncExternalStore, useMemo } from "react";

// Generate a box-shadow string of random stars
const generateStars = (count: number) => {
  let boxShadow = "";
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 2000);
    const y = Math.floor(Math.random() * 2000);
    boxShadow += `${x}px ${y}px #FFF${i === count - 1 ? "" : ", "}`;
  }
  return boxShadow;
};

const emptySubscribe = () => () => {};

export default function Starfield() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const starsSmall = useMemo(() => (isClient ? generateStars(300) : ""), [isClient]);
  const starsMedium = useMemo(() => (isClient ? generateStars(100) : ""), [isClient]);
  const starsLarge = useMemo(() => (isClient ? generateStars(25) : ""), [isClient]);

  if (!isClient) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20 mix-blend-screen">
      <style>{`
        .star-layer {
          background: transparent;
          position: absolute;
          top: 0;
          left: 0;
        }
        .star-layer::after {
          content: " ";
          position: absolute;
          top: 0;
          left: 2000px;
          background: transparent;
        }
        
        .stars-small, .stars-small::after {
          width: 1px;
          height: 1px;
          box-shadow: ${starsSmall};
          animation: animStar 50s linear infinite;
        }
        
        .stars-medium, .stars-medium::after {
          width: 2px;
          height: 2px;
          box-shadow: ${starsMedium};
          animation: animStar 100s linear infinite;
        }
        
        .stars-large, .stars-large::after {
          width: 3px;
          height: 3px;
          box-shadow: ${starsLarge};
          animation: animStar 150s linear infinite;
        }
        
        @keyframes animStar {
          from {
            transform: translateX(0px);
          }
          to {
            transform: translateX(-2000px);
          }
        }
      `}</style>
      
      <div className="star-layer stars-small"></div>
      <div className="star-layer stars-medium"></div>
      <div className="star-layer stars-large"></div>
    </div>
  );
}

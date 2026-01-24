"use client";

import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface SuccessAnimationProps {
  children: ReactNode;
}

// Confetti particle component
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = [
    "bg-purple-500",
    "bg-pink-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomRotation = Math.random() * 360;
  const randomSize = Math.random() * 8 + 4;

  return (
    <motion.div
      className={`absolute ${randomColor} rounded-sm`}
      style={{
        width: randomSize,
        height: randomSize,
        left: `${x}%`,
        top: -20,
      }}
      initial={{
        opacity: 1,
        y: 0,
        rotate: 0,
        scale: 0,
      }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, 400, 600],
        rotate: [0, randomRotation, randomRotation * 2],
        scale: [0, 1, 0.5],
        x: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 150],
      }}
      transition={{
        duration: 2.5,
        delay: delay,
        ease: "easeOut",
      }}
    />
  );
}

export function SuccessAnimation({ children }: SuccessAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    x: Math.random() * 100,
  }));

  return (
    <div className="relative">
      {/* Confetti container */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confettiParticles.map((particle) => (
            <ConfettiParticle
              key={particle.id}
              delay={particle.delay}
              x={particle.x}
            />
          ))}
        </div>
      )}

      {/* Main content with animations */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.1,
        }}
      >
        {/* Glow effect behind card */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/20 to-teal-400/20 rounded-xl blur-xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0.5], scale: [0.8, 1.1, 1] }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        
        {/* Card content */}
        <div className="relative">{children}</div>
      </motion.div>

      {/* Celebration rings */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-green-400/50 pointer-events-none"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 2, 3] }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-purple-400/50 pointer-events-none"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 2, 3] }}
        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatFn?: (v: number) => string;
  className?: string;
}

/**
 * Animates a numeric value using a DOM ref so it never triggers React re-renders
 * (avoids 60fps setState causing parent motion.div flicker).
 */
export function AnimatedCounter({
  value,
  duration = 900,
  formatFn = (v) => v.toLocaleString(),
  className,
}: AnimatedCounterProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);
  const toRef = useRef<number>(value);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    fromRef.current = toRef.current;
    toRef.current = value;

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = fromRef.current + (toRef.current - fromRef.current) * eased;
      if (spanRef.current) {
        spanRef.current.textContent = formatFn(Math.round(current));
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        startRef.current = 0;
      }
    };

    startRef.current = 0;
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // formatFn is intentionally excluded — it's stable but recreated inline sometimes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  // Set initial text without waiting for effect
  const initial = formatFn(Math.round(value));

  return (
    <span ref={spanRef} className={className}>
      {initial}
    </span>
  );
}

import { useState, useEffect, useRef } from "react";

interface UseCountUpProps {
  end: number;
  duration?: number;
  delay?: number;
  startOnInView?: boolean;
}

export function useCountUp({
  end,
  duration = 2000,
  delay = 0,
  startOnInView = true,
}: UseCountUpProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Intersection Observer for starting animation when in view
  useEffect(() => {
    if (!startOnInView) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          setIsVisible(true);
          hasStarted.current = true;
        }
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [startOnInView]);

  // Count up animation
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      const startTime = Date.now();
      const startValue = 0;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(
          startValue + (end - startValue) * easeOut
        );

        setCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, end, duration, delay]);

  return { count, elementRef };
}

/**
 * MIT License
 * 
 * Adapted from ElevenLabs UI (https://ui.elevenlabs.io)
 * Source: https://github.com/elevenlabs/examples/blob/main/speech-to-text/nextjs/realtime/example/components/ui/live-waveform.tsx
 * 
 * Modified to accept external MediaStream instead of opening getUserMedia internally.
 */
"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type LiveWaveformProps = HTMLAttributes<HTMLDivElement> & {
  /** Active state - when true, analyzes and renders audio */
  active?: boolean;
  /** External MediaStream to analyze (from existing getUserMedia) */
  mediaStream?: MediaStream | null;
  barWidth?: number;
  barHeight?: number;
  barGap?: number;
  barRadius?: number;
  barColor?: string;
  height?: string | number;
  sensitivity?: number;
  smoothingTimeConstant?: number;
  fftSize?: number;
  updateRate?: number;
};

export const LiveWaveform = ({
  active = false,
  mediaStream = null,
  barWidth = 3,
  barGap = 1,
  barRadius = 1.5,
  barColor,
  barHeight: baseBarHeight = 4,
  height = 40,
  sensitivity = 1,
  smoothingTimeConstant = 0.8,
  fftSize = 256,
  updateRate = 30,
  className,
  ...props
}: LiveWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const staticBarsRef = useRef<number[]>([]);
  const needsRedrawRef = useRef(true);
  const mountedRef = useRef(true);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  // Handle canvas resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      needsRedrawRef.current = true;
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Setup audio analysis from external MediaStream
  useEffect(() => {
    mountedRef.current = true;

    if (!active || !mediaStream) {
      // Cleanup
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    // Setup audio analysis
    try {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      // Resume if suspended (created outside user gesture)
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (error) {
      console.error("Failed to setup audio analysis:", error);
    }

    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      mountedRef.current = false;
      analyserRef.current = null;
    };
  }, [active, mediaStream, fftSize, smoothingTimeConstant]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    const animate = (currentTime: number) => {
      if (!mountedRef.current) return;

      const rect = canvas.getBoundingClientRect();

      // Update audio data if active
      if (active && currentTime - lastUpdateRef.current > updateRate) {
        lastUpdateRef.current = currentTime;

        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Focus on speech frequencies (85Hz-4kHz, bins 4-171 at 48kHz sample rate)
          const startFreq = Math.floor(dataArray.length * 0.05);
          const endFreq = Math.floor(dataArray.length * 0.4);
          const relevantData = dataArray.slice(startFreq, endFreq);

          const barCount = Math.floor(rect.width / (barWidth + barGap));
          const halfCount = Math.floor(barCount / 2);
          const newBars: number[] = [];

          // Mirror the data for symmetric display
          for (let i = halfCount - 1; i >= 0; i--) {
            const dataIndex = Math.floor((i / halfCount) * relevantData.length);
            const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
            newBars.push(Math.max(0.05, value));
          }

          for (let i = 0; i < halfCount; i++) {
            const dataIndex = Math.floor((i / halfCount) * relevantData.length);
            const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
            newBars.push(Math.max(0.05, value));
          }

          staticBarsRef.current = newBars;
          needsRedrawRef.current = true;
        }
      }

      // Only redraw if needed
      if (!needsRedrawRef.current && !active) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      needsRedrawRef.current = active;
      ctx.clearRect(0, 0, rect.width, rect.height);

      const computedBarColor =
        barColor ||
        (() => {
          const style = getComputedStyle(canvas);
          return style.color || "#000";
        })();

      const step = barWidth + barGap;
      const barCount = Math.floor(rect.width / step);
      const centerY = rect.height / 2;

      const dataToRender = staticBarsRef.current;

      for (let i = 0; i < barCount && i < dataToRender.length; i++) {
        const value = dataToRender[i] || 0.1;
        const x = i * step;
        const barHeight = Math.max(baseBarHeight, value * rect.height * 0.8);
        const y = centerY - barHeight / 2;

        ctx.fillStyle = computedBarColor;
        ctx.globalAlpha = 0.4 + value * 0.6;

        if (barRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barRadius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [active, sensitivity, updateRate, barWidth, baseBarHeight, barGap, barRadius, barColor]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)} style={{ height: heightStyle }} {...props}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
};

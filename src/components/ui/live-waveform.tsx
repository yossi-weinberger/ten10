/**
 * MIT License
 * 
 * Adapted from ElevenLabs UI (https://ui.elevenlabs.io)
 * Source: https://github.com/elevenlabs/ui/main/apps/www/registry/elevenlabs-ui/ui/live-waveform.tsx
 * 
 * Modified to accept external MediaStream instead of opening getUserMedia internally.
 */
"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type LiveWaveformProps = HTMLAttributes<HTMLDivElement> & {
  /** Active state - when true, analyzes and renders audio */
  active?: boolean;
  /** Processing state - when true, shows synthetic animated wave */
  processing?: boolean;
  /** External MediaStream to analyze (from existing getUserMedia) */
  mediaStream?: MediaStream | null;
  barWidth?: number;
  barHeight?: number;
  barGap?: number;
  barRadius?: number;
  barColor?: string;
  fadeEdges?: boolean;
  fadeWidth?: number;
  height?: string | number;
  sensitivity?: number;
  smoothingTimeConstant?: number;
  fftSize?: number;
  historySize?: number;
  updateRate?: number;
  mode?: "scrolling" | "static";
};

export const LiveWaveform = ({
  active = false,
  processing = false,
  mediaStream = null,
  barWidth = 3,
  barGap = 1,
  barRadius = 1.5,
  barColor,
  fadeEdges = true,
  fadeWidth = 24,
  barHeight: baseBarHeight = 4,
  height = 40,
  sensitivity = 1,
  smoothingTimeConstant = 0.8,
  fftSize = 256,
  historySize,
  updateRate = 30,
  mode = "scrolling",
  className,
  ...props
}: LiveWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<number[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const processingAnimationRef = useRef<number | null>(null);
  const lastActiveDataRef = useRef<number[]>([]);
  const transitionProgressRef = useRef(0);
  const staticBarsRef = useRef<number[]>([]);
  const needsRedrawRef = useRef(true);
  const gradientCacheRef = useRef<CanvasGradient | null>(null);
  const lastWidthRef = useRef(0);
  const mountedRef = useRef(true);
  const colorProbeRef = useRef<HTMLSpanElement | null>(null);
  const computedHistorySizeRef = useRef<number>(60);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  // Mount/unmount lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

      // Compute history size from width unless explicit override provided
      const newHistorySize = historySize ?? Math.ceil(rect.width / (barWidth + barGap));
      const oldHistorySize = computedHistorySizeRef.current;
      computedHistorySizeRef.current = newHistorySize;

      // Trim history from oldest side when size shrinks
      if (mode === "scrolling" && newHistorySize < oldHistorySize && historyRef.current.length > newHistorySize) {
        historyRef.current = historyRef.current.slice(-newHistorySize);
      }

      gradientCacheRef.current = null;
      lastWidthRef.current = rect.width;
      needsRedrawRef.current = true;
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [barWidth, barGap, historySize, mode]);

  // Processing animation
  useEffect(() => {
    if (processing && !active) {
      let time = 0;
      transitionProgressRef.current = 0;

      const animateProcessing = () => {
        if (!mountedRef.current) return;

        time += 0.03;
        transitionProgressRef.current = Math.min(1, transitionProgressRef.current + 0.02);

        const processingData = [];
        const barCount = Math.floor(
          (containerRef.current?.getBoundingClientRect().width || 200) / (barWidth + barGap)
        );

        if (mode === "static") {
          const halfCount = Math.floor(barCount / 2);

          for (let i = 0; i < barCount; i++) {
            const normalizedPosition = (i - halfCount) / halfCount;
            const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4;

            const wave1 = Math.sin(time * 1.5 + normalizedPosition * 3) * 0.25;
            const wave2 = Math.sin(time * 0.8 - normalizedPosition * 2) * 0.2;
            const wave3 = Math.cos(time * 2 + normalizedPosition) * 0.15;
            const combinedWave = wave1 + wave2 + wave3;
            const processingValue = (0.2 + combinedWave) * centerWeight;

            let finalValue = processingValue;
            if (lastActiveDataRef.current.length > 0 && transitionProgressRef.current < 1) {
              const lastDataIndex = Math.min(i, lastActiveDataRef.current.length - 1);
              const lastValue = lastActiveDataRef.current[lastDataIndex] || 0;
              finalValue =
                lastValue * (1 - transitionProgressRef.current) +
                processingValue * transitionProgressRef.current;
            }

            processingData.push(Math.max(0.05, Math.min(1, finalValue)));
          }
        } else {
          // Scrolling mode processing
          for (let i = 0; i < barCount; i++) {
            const normalizedPosition = (i - barCount / 2) / (barCount / 2);
            const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4;

            const wave1 = Math.sin(time * 1.5 + i * 0.15) * 0.25;
            const wave2 = Math.sin(time * 0.8 - i * 0.1) * 0.2;
            const wave3 = Math.cos(time * 2 + i * 0.05) * 0.15;
            const combinedWave = wave1 + wave2 + wave3;
            const processingValue = (0.2 + combinedWave) * centerWeight;

            let finalValue = processingValue;
            if (lastActiveDataRef.current.length > 0 && transitionProgressRef.current < 1) {
              const lastDataIndex = Math.floor((i / barCount) * lastActiveDataRef.current.length);
              const lastValue = lastActiveDataRef.current[lastDataIndex] || 0;
              finalValue =
                lastValue * (1 - transitionProgressRef.current) +
                processingValue * transitionProgressRef.current;
            }

            processingData.push(Math.max(0.05, Math.min(1, finalValue)));
          }
        }

        if (mode === "static") {
          staticBarsRef.current = processingData;
        } else {
          historyRef.current = processingData;
        }

        needsRedrawRef.current = true;
        processingAnimationRef.current = requestAnimationFrame(animateProcessing);
      };

      animateProcessing();

      return () => {
        if (processingAnimationRef.current) {
          cancelAnimationFrame(processingAnimationRef.current);
          processingAnimationRef.current = null;
        }
      };
    } else if (!active && !processing) {
      // Fade to idle when neither active nor processing
      const hasData =
        mode === "static" ? staticBarsRef.current.length > 0 : historyRef.current.length > 0;

      if (hasData) {
        let fadeProgress = 0;
        let fadeRafId: number | null = null;
        const fadeToIdle = () => {
          fadeProgress += 0.03;
          if (fadeProgress < 1) {
            if (mode === "static") {
              staticBarsRef.current = staticBarsRef.current.map((value) => value * (1 - fadeProgress));
            } else {
              historyRef.current = historyRef.current.map((value) => value * (1 - fadeProgress));
            }
            needsRedrawRef.current = true;
            fadeRafId = requestAnimationFrame(fadeToIdle);
          } else {
            if (mode === "static") {
              staticBarsRef.current = [];
            } else {
              historyRef.current = [];
            }
          }
        };
        fadeToIdle();

        return () => {
          if (fadeRafId !== null) {
            cancelAnimationFrame(fadeRafId);
          }
        };
      }
    }
  }, [processing, active, barWidth, barGap, mode]);

  // Setup audio analysis from external MediaStream
  useEffect(() => {
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

      // Clear history when starting
      historyRef.current = [];
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

          if (mode === "static") {
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
            lastActiveDataRef.current = newBars;
          } else {
            // Scrolling mode
            let sum = 0;
            const startFreq = Math.floor(dataArray.length * 0.05);
            const endFreq = Math.floor(dataArray.length * 0.4);
            const relevantData = dataArray.slice(startFreq, endFreq);

            for (let i = 0; i < relevantData.length; i++) {
              sum += relevantData[i];
            }
            const average = (sum / relevantData.length / 255) * sensitivity;

            // Add to history
            historyRef.current.push(Math.min(1, Math.max(0.05, average)));
            lastActiveDataRef.current = [...historyRef.current];

            // Maintain history size
            if (historyRef.current.length > computedHistorySizeRef.current) {
              historyRef.current.shift();
            }
          }
          needsRedrawRef.current = true;
        }
      }

      // Only redraw if needed
      if (!needsRedrawRef.current && !active && !processing) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      needsRedrawRef.current = active || processing;
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Read color from Ten10 design token (text-primary)
      const computedBarColor =
        barColor ||
        (colorProbeRef.current ? getComputedStyle(colorProbeRef.current).color : "#000");

      const step = barWidth + barGap;
      const barCount = Math.floor(rect.width / step);
      const centerY = rect.height / 2;

      // Draw bars based on mode
      if (mode === "static") {
        const dataToRender = processing
          ? staticBarsRef.current
          : active
            ? staticBarsRef.current
            : staticBarsRef.current.length > 0
              ? staticBarsRef.current
              : [];

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
      } else {
        // Scrolling mode
        for (let i = 0; i < barCount && i < historyRef.current.length; i++) {
          const dataIndex = historyRef.current.length - 1 - i;
          const value = historyRef.current[dataIndex] || 0.1;
          const x = rect.width - (i + 1) * step;
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
      }

      // Apply edge fading
      if (fadeEdges && fadeWidth > 0 && rect.width > 0) {
        // Cache gradient if width hasn't changed
        if (!gradientCacheRef.current || lastWidthRef.current !== rect.width) {
          const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
          const fadePercent = Math.min(0.3, fadeWidth / rect.width);

          gradient.addColorStop(0, "rgba(255,255,255,1)");
          gradient.addColorStop(fadePercent, "rgba(255,255,255,0)");
          gradient.addColorStop(1 - fadePercent, "rgba(255,255,255,0)");
          gradient.addColorStop(1, "rgba(255,255,255,1)");

          gradientCacheRef.current = gradient;
          lastWidthRef.current = rect.width;
        }

        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = gradientCacheRef.current;
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.globalCompositeOperation = "source-over";
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
  }, [
    active,
    processing,
    sensitivity,
    updateRate,
    barWidth,
    baseBarHeight,
    barGap,
    barRadius,
    barColor,
    fadeEdges,
    fadeWidth,
    mode,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn("relative min-w-0 w-full", className)}
      style={{ height: heightStyle }}
      data-active={active ? "true" : "false"}
      data-processing={processing ? "true" : "false"}
      {...props}
    >
      <canvas ref={canvasRef} className="size-full" />
      <span ref={colorProbeRef} className="text-primary absolute -left-[9999px]" aria-hidden="true" />
    </div>
  );
};

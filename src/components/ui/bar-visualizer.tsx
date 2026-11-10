/**
 * Bar Visualizer Component
 * 
 * Adapted from ElevenLabs UI (https://github.com/elevenlabs/ui)
 * Original source: https://github.com/elevenlabs/ui/blob/main/apps/www/registry/elevenlabs-ui/ui/bar-visualizer.tsx
 * 
 * MIT License
 * Copyright (c) 2024 ElevenLabs
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {
  forwardRef,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export interface AudioAnalyserOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
}

function createAudioAnalyser(
  mediaStream: MediaStream,
  options: AudioAnalyserOptions = {},
) {
  const audioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(mediaStream);
  const analyser = audioContext.createAnalyser();

  if (options.fftSize) analyser.fftSize = options.fftSize;
  if (options.smoothingTimeConstant !== undefined) {
    analyser.smoothingTimeConstant = options.smoothingTimeConstant;
  }
  if (options.minDecibels !== undefined)
    analyser.minDecibels = options.minDecibels;
  if (options.maxDecibels !== undefined)
    analyser.maxDecibels = options.maxDecibels;

  source.connect(analyser);

  const cleanup = () => {
    source.disconnect();
    audioContext.close();
  };

  return { analyser, audioContext, cleanup };
}

export interface MultiBandVolumeOptions {
  bands?: number;
  loPass?: number;
  hiPass?: number;
  updateInterval?: number;
  analyserOptions?: AudioAnalyserOptions;
}

const multibandDefaults: MultiBandVolumeOptions = {
  bands: 5,
  loPass: 4,
  hiPass: 171,
  updateInterval: 32,
  analyserOptions: { fftSize: 2048 },
};

const normalizeDb = (value: number) => {
  if (value === -Infinity) return 0;
  const minDb = -100;
  const maxDb = -10;
  const db = 1 - (Math.max(minDb, Math.min(maxDb, value)) * -1) / 100;
  return Math.sqrt(db);
};

/**
 * Hook for tracking volume across multiple frequency bands
 * @param mediaStream - The MediaStream to analyze
 * @param options - Multiband options
 * @returns Array of volume levels for each frequency band
 */
function useMultibandVolume(
  mediaStream?: MediaStream | null,
  options: MultiBandVolumeOptions = {},
) {
  // Destructure primitive fields so useMemo deps are stable and complete
  const { bands, loPass, hiPass, updateInterval, analyserOptions } = options;
  const fftSize = analyserOptions?.fftSize;
  const smoothingTimeConstant = analyserOptions?.smoothingTimeConstant;
  const minDecibels = analyserOptions?.minDecibels;
  const maxDecibels = analyserOptions?.maxDecibels;

  const opts = useMemo(
    () => ({
      ...multibandDefaults,
      ...(bands !== undefined && { bands }),
      ...(loPass !== undefined && { loPass }),
      ...(hiPass !== undefined && { hiPass }),
      ...(updateInterval !== undefined && { updateInterval }),
      ...(analyserOptions !== undefined && {
        analyserOptions: {
          ...(fftSize !== undefined && { fftSize }),
          ...(smoothingTimeConstant !== undefined && { smoothingTimeConstant }),
          ...(minDecibels !== undefined && { minDecibels }),
          ...(maxDecibels !== undefined && { maxDecibels }),
        },
      }),
    }),
    [bands, loPass, hiPass, updateInterval, analyserOptions, fftSize, smoothingTimeConstant, minDecibels, maxDecibels],
  );

  const emptyBands = useMemo(() => new Array(opts.bands).fill(0), [opts.bands]);
  const [frequencyBands, setFrequencyBands] = useState<number[]>(emptyBands);
  const bandsRef = useRef<number[]>(emptyBands);
  const frameId = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!mediaStream) {
      bandsRef.current = emptyBands;
      frameId.current = requestAnimationFrame(() => {
        if (mountedRef.current) setFrequencyBands(emptyBands);
      });
      return () => {
        if (frameId.current) cancelAnimationFrame(frameId.current);
        mountedRef.current = false;
      };
    }

    const { analyser, audioContext, cleanup } = createAudioAnalyser(
      mediaStream,
      opts.analyserOptions,
    );

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const sliceStart = opts.loPass!;
    const sliceEnd = opts.hiPass!;
    const sliceLength = sliceEnd - sliceStart;
    const chunkSize = Math.ceil(sliceLength / opts.bands!);

    let lastUpdate = 0;
    const updateInterval = opts.updateInterval!;

    const updateVolume = (timestamp: number) => {
      if (timestamp - lastUpdate >= updateInterval) {
        analyser.getFloatFrequencyData(dataArray);

        const chunks = new Array(opts.bands!);

        for (let i = 0; i < opts.bands!; i++) {
          let sum = 0;
          let count = 0;
          const startIdx = sliceStart + i * chunkSize;
          const endIdx = Math.min(sliceStart + (i + 1) * chunkSize, sliceEnd);

          for (let j = startIdx; j < endIdx; j++) {
            sum += normalizeDb(dataArray[j]);
            count++;
          }

          chunks[i] = count > 0 ? sum / count : 0;
        }

        let hasChanged = false;
        for (let i = 0; i < chunks.length; i++) {
          if (Math.abs(chunks[i] - bandsRef.current[i]) > 0.01) {
            hasChanged = true;
            break;
          }
        }

        if (hasChanged && mountedRef.current) {
          bandsRef.current = chunks;
          setFrequencyBands(chunks);
        }

        lastUpdate = timestamp;
      }

      if (mountedRef.current) {
        frameId.current = requestAnimationFrame(updateVolume);
      }
    };

    frameId.current = requestAnimationFrame(updateVolume);

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
        frameId.current = undefined;
      }
      mountedRef.current = false;
      cleanup();
    };
  }, [emptyBands, mediaStream, opts]);

  return frequencyBands;
}

type AnimationState =
  | "connecting"
  | "initializing"
  | "listening"
  | "speaking"
  | "thinking"
  | undefined;

const useBarAnimator = (
  state: AnimationState,
  columns: number,
  interval: number,
): number[] => {
  const indexRef = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  const sequence = useMemo(() => {
    if (state === "thinking" || state === "listening") {
      return generateListeningSequenceBar(columns);
    } else if (state === "connecting" || state === "initializing") {
      return generateConnectingSequenceBar(columns);
    } else if (state === undefined || state === "speaking") {
      return [new Array(columns).fill(0).map((_, idx) => idx)];
    } else {
      return [[]];
    }
  }, [state, columns]);

  const [currentFrame, setCurrentFrame] = useState<number[]>(() => sequence[0] || []);

  useEffect(() => {
    indexRef.current = 0;
    const frameId = requestAnimationFrame(() => setCurrentFrame(sequence[0] || []));
    return () => cancelAnimationFrame(frameId);
  }, [sequence]);

  useEffect(() => {
    let startTime = performance.now();

    const animate = (time: DOMHighResTimeStamp) => {
      const timeElapsed = time - startTime;

      if (timeElapsed >= interval) {
        indexRef.current = (indexRef.current + 1) % sequence.length;
        setCurrentFrame(sequence[indexRef.current] || []);
        startTime = time;
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [interval, sequence]);

  return currentFrame;
};

const generateConnectingSequenceBar = (columns: number): number[][] => {
  const seq = [];
  for (let x = 0; x < columns; x++) {
    seq.push([x, columns - 1 - x]);
  }
  return seq;
};

const generateListeningSequenceBar = (columns: number): number[][] => {
  const center = Math.floor(columns / 2);
  const noIndex = -1;
  return [[center], [noIndex]];
};

export type AgentState =
  | "connecting"
  | "initializing"
  | "listening"
  | "speaking"
  | "thinking";

export interface BarVisualizerProps extends HTMLAttributes<HTMLDivElement> {
  state?: AgentState;
  barCount?: number;
  mediaStream?: MediaStream | null;
  minHeight?: number;
  maxHeight?: number;
  centerAlign?: boolean;
}

const BarVisualizerComponent = forwardRef<HTMLDivElement, BarVisualizerProps>(
  (
    {
      state,
      barCount = 15,
      mediaStream,
      minHeight = 20,
      maxHeight = 100,
      centerAlign = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const volumeBands = useMultibandVolume(mediaStream, {
      bands: barCount,
      loPass: 4,
      hiPass: 171,
    });

    const highlightedIndices = useBarAnimator(
      state,
      barCount,
      state === "connecting"
        ? 2000 / barCount
        : state === "thinking"
          ? 150
          : state === "listening"
            ? 500
            : 1000,
    );

    return (
      <div
        ref={ref}
        data-state={state}
        className={cn(
          "relative flex justify-center gap-1.5",
          centerAlign ? "items-center" : "items-end",
          className,
        )}
        style={{
          ...style,
        }}
        {...props}
      >
        {volumeBands.map((volume, index) => {
          const heightPct = Math.min(
            maxHeight,
            Math.max(minHeight, volume * 100 + 5),
          );
          const isHighlighted = highlightedIndices?.includes(index) ?? false;

          return (
            <Bar
              key={index}
              heightPct={heightPct}
              isHighlighted={isHighlighted}
              state={state}
            />
          );
        })}
      </div>
    );
  },
);

const Bar = memo<{
  heightPct: number;
  isHighlighted: boolean;
  state?: AgentState;
}>(({ heightPct, isHighlighted, state }) => (
  <div
    data-highlighted={isHighlighted}
    className={cn(
      "max-w-[12px] min-w-[8px] flex-1 rounded-full",
      "bg-border data-[highlighted=true]:bg-primary",
      "transition-all duration-150 motion-reduce:transition-none",
      state === "speaking" && "bg-primary",
      state === "thinking" && isHighlighted && "animate-pulse motion-reduce:animate-none",
    )}
    style={{
      height: `${heightPct}%`,
      animationDuration: state === "thinking" ? "300ms" : undefined,
    }}
  />
));

Bar.displayName = "Bar";

const BarVisualizer = memo(BarVisualizerComponent, (prevProps, nextProps) => {
  return (
    prevProps.state === nextProps.state &&
    prevProps.barCount === nextProps.barCount &&
    prevProps.mediaStream === nextProps.mediaStream &&
    prevProps.minHeight === nextProps.minHeight &&
    prevProps.maxHeight === nextProps.maxHeight &&
    prevProps.centerAlign === nextProps.centerAlign &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

BarVisualizerComponent.displayName = "BarVisualizerComponent";
BarVisualizer.displayName = "BarVisualizer";

export { BarVisualizer };

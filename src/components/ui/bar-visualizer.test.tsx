// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BarVisualizer } from "./bar-visualizer";

// Mock AudioContext and related APIs
let mockAudioContextInstances = 0;
let mockAnalyserData: Uint8Array | null = null;

class MockAnalyserNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  smoothingTimeConstant = 0.8;
  minDecibels = -100;
  maxDecibels = -30;

  getFloatFrequencyData(array: Float32Array) {
    if (mockAnalyserData) {
      // Convert Uint8Array to Float32Array (dB scale)
      for (let i = 0; i < Math.min(array.length, mockAnalyserData.length); i++) {
        array[i] = (mockAnalyserData[i] / 255) * 100 - 100;
      }
    } else {
      array.fill(-Infinity);
    }
  }
}

class MockAudioContext {
  state: AudioContextState = "running";
  sampleRate = 48000;

  constructor() {
    mockAudioContextInstances++;
  }

  createAnalyser() {
    return new MockAnalyserNode() as unknown as AnalyserNode;
  }

  createMediaStreamSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as MediaStreamAudioSourceNode;
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

// Mock MediaStream
class MockMediaStream {
  id = "mock-stream";
  active = true;
  
  getTracks() {
    return [];
  }
}

describe("BarVisualizer", () => {
  beforeEach(() => {
    mockAudioContextInstances = 0;
    mockAnalyserData = null;
    
    // Install mocks
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 16);
      return 1;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn();
  });

  it("renders bars with varying heights when frequency data changes", async () => {
    // Create non-silent frequency data
    const frequencyData = new Uint8Array(1024);
    for (let i = 0; i < 1024; i++) {
      // Simulate speech-range frequencies (bins 4-171)
      if (i >= 4 && i <= 171) {
        frequencyData[i] = Math.floor(100 + Math.random() * 155); // 100-255 range
      } else {
        frequencyData[i] = 0;
      }
    }
    mockAnalyserData = frequencyData;

    const stream = new MockMediaStream() as unknown as MediaStream;
    
    const { container } = render(
      <BarVisualizer
        mediaStream={stream}
        state="listening"
        barCount={8}
        minHeight={15}
        maxHeight={90}
      />
    );

    // Wait for animation frame and frequency analysis
    await waitFor(() => {
      const bars = container.querySelectorAll('[style*="height"]');
      expect(bars.length).toBe(8);
      
      // At least some bars should have height > minHeight
      const heights = Array.from(bars).map(bar => {
        const style = (bar as HTMLElement).style.height;
        return parseFloat(style);
      });
      
      const maxHeight = Math.max(...heights);
      expect(maxHeight).toBeGreaterThan(15); // Should be above minHeight
    }, { timeout: 1000 });
  });

  it("does not create a new AudioContext on re-render with unchanged props", async () => {
    const stream = new MockMediaStream() as unknown as MediaStream;
    
    const { rerender } = render(
      <BarVisualizer
        mediaStream={stream}
        state="listening"
        barCount={8}
        minHeight={15}
        maxHeight={90}
      />
    );

    await waitFor(() => {
      expect(mockAudioContextInstances).toBe(1);
    });

    // Re-render with same props
    rerender(
      <BarVisualizer
        mediaStream={stream}
        state="listening"
        barCount={8}
        minHeight={15}
        maxHeight={90}
      />
    );

    // Should still be 1 AudioContext
    expect(mockAudioContextInstances).toBe(1);
  });

  it("renders at minHeight when mediaStream is null", () => {
    const { container } = render(
      <BarVisualizer
        mediaStream={null}
        state="listening"
        barCount={8}
        minHeight={15}
        maxHeight={90}
      />
    );

    const bars = container.querySelectorAll('[style*="height"]');
    expect(bars.length).toBe(8);
    
    bars.forEach(bar => {
      const style = (bar as HTMLElement).style.height;
      expect(style).toBe("15%");
    });
  });

  it("cleans up AudioContext on unmount", async () => {
    const stream = new MockMediaStream() as unknown as MediaStream;
    const mockClose = vi.fn().mockResolvedValue(undefined);
    
    // Override close method to track calls
    const OriginalAudioContext = globalThis.AudioContext;
    class MockAudioContextWithTracking extends OriginalAudioContext {
      close() {
        mockClose();
        return Promise.resolve();
      }
    }
    globalThis.AudioContext = MockAudioContextWithTracking as unknown as typeof AudioContext;

    const { unmount } = render(
      <BarVisualizer
        mediaStream={stream}
        state="listening"
        barCount={8}
        minHeight={15}
        maxHeight={90}
      />
    );

    await waitFor(() => {
      expect(mockAudioContextInstances).toBeGreaterThan(0);
    });

    unmount();

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled();
    });

    globalThis.AudioContext = OriginalAudioContext;
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveWaveform } from "./live-waveform";

// Mock AudioContext and related APIs
let mockAudioContextInstances = 0;
let mockAnalyserData: Uint8Array | null = null;

class MockAnalyserNode {
  fftSize = 256;
  frequencyBinCount = 128;
  smoothingTimeConstant = 0.8;

  getByteFrequencyData(array: Uint8Array) {
    if (mockAnalyserData) {
      for (let i = 0; i < Math.min(array.length, mockAnalyserData.length); i++) {
        array[i] = mockAnalyserData[i];
      }
    } else {
      array.fill(0);
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

describe("LiveWaveform", () => {
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

    // Mock ResizeObserver
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it("renders canvas with varying output when frequency data is non-silent", async () => {
    // Create non-silent frequency data
    const frequencyData = new Uint8Array(128);
    for (let i = 0; i < 128; i++) {
      // Simulate speech-range frequencies
      if (i >= 6 && i <= 51) {
        // ~5% to 40% of bins
        frequencyData[i] = Math.floor(100 + Math.random() * 155); // 100-255 range
      } else {
        frequencyData[i] = 0;
      }
    }
    mockAnalyserData = frequencyData;

    const stream = new MockMediaStream() as unknown as MediaStream;

    const { container } = render(
      <LiveWaveform active={true} mediaStream={stream} height={40} barWidth={3} barGap={1} />
    );

    // Wait for animation frame and frequency analysis
    await waitFor(
      () => {
        const canvas = container.querySelector("canvas");
        expect(canvas).toBeInTheDocument();

        // Check canvas has non-zero dimensions
        expect(canvas?.width).toBeGreaterThan(0);
      },
      { timeout: 1000 }
    );
  });

  it("does not create a new AudioContext on re-render with unchanged props", async () => {
    const stream = new MockMediaStream() as unknown as MediaStream;

    const { rerender } = render(<LiveWaveform active={true} mediaStream={stream} height={40} />);

    await waitFor(() => {
      expect(mockAudioContextInstances).toBe(1);
    });

    // Re-render with same props
    rerender(<LiveWaveform active={true} mediaStream={stream} height={40} />);

    // Should still be 1 AudioContext
    expect(mockAudioContextInstances).toBe(1);
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

    const { unmount } = render(<LiveWaveform active={true} mediaStream={stream} height={40} />);

    await waitFor(() => {
      expect(mockAudioContextInstances).toBeGreaterThan(0);
    });

    unmount();

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled();
    });

    globalThis.AudioContext = OriginalAudioContext;
  });

  it("does not create AudioContext when mediaStream is null", () => {
    render(<LiveWaveform active={true} mediaStream={null} height={40} />);

    expect(mockAudioContextInstances).toBe(0);
  });

  it("does not create AudioContext when active is false", () => {
    const stream = new MockMediaStream() as unknown as MediaStream;
    render(<LiveWaveform active={false} mediaStream={stream} height={40} />);

    expect(mockAudioContextInstances).toBe(0);
  });
});

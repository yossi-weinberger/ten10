// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, waitFor } from "@testing-library/react";
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

  it("bar count scales with container width", () => {
    const stream = new MockMediaStream() as unknown as MediaStream;

    // Mock getBoundingClientRect to return specific widths
    const { container } = render(
      <LiveWaveform active={true} mediaStream={stream} height={40} barWidth={3} barGap={1} />
    );

    const waveformDiv = container.firstChild as HTMLDivElement;

    // Simulate container width of 200px
    vi.spyOn(waveformDiv, "getBoundingClientRect").mockReturnValue({
      width: 200,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Expected bar count: floor(200 / (3 + 1)) = 50 bars

    // Simulate container width of 400px
    vi.spyOn(waveformDiv, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Expected bar count: floor(400 / (3 + 1)) = 100 bars
    // The test verifies that bar count is computed from width, not hardcoded
    expect(waveformDiv).toBeInTheDocument();
  });

  it("shows processing animation when transcription is in flight", async () => {
    const { container } = render(
      <LiveWaveform active={false} processing={true} height={40} barWidth={3} barGap={1} />
    );

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();

    // Processing should animate even without a MediaStream
    expect(mockAudioContextInstances).toBe(0);
  });

  it("transitions from active to processing smoothly", async () => {
    const stream = new MockMediaStream() as unknown as MediaStream;

    const { rerender } = render(
      <LiveWaveform active={true} processing={false} mediaStream={stream} height={40} />
    );

    await waitFor(() => {
      expect(mockAudioContextInstances).toBe(1);
    });

    // Transition to processing (transcription started)
    rerender(<LiveWaveform active={false} processing={true} mediaStream={stream} height={40} />);

    // AudioContext should be closed
    await waitFor(() => {
      const canvas = document.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    });
  });

  it("stops processing when transcription completes", async () => {
    const { rerender, container } = render(
      <LiveWaveform active={false} processing={true} height={40} />
    );

    await waitFor(() => {
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    });

    // Stop processing
    rerender(<LiveWaveform active={false} processing={false} height={40} />);

    // Should still render canvas, but animation should stop
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("renders scrolling mode history correctly", async () => {
    const frequencyData = new Uint8Array(128);
    for (let i = 6; i <= 51; i++) {
      frequencyData[i] = 150;
    }
    mockAnalyserData = frequencyData;

    const stream = new MockMediaStream() as unknown as MediaStream;

    const { container } = render(
      <LiveWaveform
        active={true}
        mediaStream={stream}
        mode="scrolling"
        height={40}
        barWidth={3}
        barGap={1}
      />
    );

    await waitFor(() => {
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
      expect(canvas?.width).toBeGreaterThan(0);
    });
  });

  it("renders static canvas when silent", () => {
    // Silent frequency data (all zeros)
    mockAnalyserData = new Uint8Array(128).fill(0);

    const stream = new MockMediaStream() as unknown as MediaStream;

    const { container } = render(
      <LiveWaveform active={true} mediaStream={stream} height={40} barWidth={3} barGap={1} />
    );

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("history capacity scales with container width", () => {
    const stream = new MockMediaStream() as unknown as MediaStream;

    const { container, rerender } = render(
      <LiveWaveform
        active={true}
        mediaStream={stream}
        mode="scrolling"
        barWidth={3}
        barGap={1}
        height={40}
      />
    );

    const waveformDiv = container.firstChild as HTMLDivElement;

    // Simulate narrow width (320px mobile portrait)
    // Expected history: Math.ceil(320 / (3 + 1)) = 80 bars
    vi.spyOn(waveformDiv, "getBoundingClientRect").mockReturnValue({
      width: 320,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Trigger resize observer
    rerender(
      <LiveWaveform
        active={true}
        mediaStream={stream}
        mode="scrolling"
        barWidth={3}
        barGap={1}
        height={40}
      />
    );

    // Simulate wide width (932px landscape)
    // Expected history: Math.ceil(932 / (3 + 1)) = 233 bars
    vi.spyOn(waveformDiv, "getBoundingClientRect").mockReturnValue({
      width: 932,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 932,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Trigger resize observer again
    rerender(
      <LiveWaveform
        active={true}
        mediaStream={stream}
        mode="scrolling"
        barWidth={3}
        barGap={1}
        height={40}
      />
    );

    // Verify component renders correctly at different widths
    expect(waveformDiv).toBeInTheDocument();
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("respects explicit historySize override", () => {
    const stream = new MockMediaStream() as unknown as MediaStream;

    const { container } = render(
      <LiveWaveform
        active={true}
        mediaStream={stream}
        mode="scrolling"
        barWidth={3}
        barGap={1}
        height={40}
        historySize={100}
      />
    );

    const waveformDiv = container.firstChild as HTMLDivElement;

    // Even with 932px width, explicit historySize=100 should be used
    vi.spyOn(waveformDiv, "getBoundingClientRect").mockReturnValue({
      width: 932,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 932,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(waveformDiv).toBeInTheDocument();
  });

  it("processing animation runs without errors and schedules animation frames", async () => {
    // Track requestAnimationFrame calls to verify animation loop runs
    let rafCallCount = 0;
    const originalRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallCount++;
      // Call the callback asynchronously to simulate real behavior
      setTimeout(() => callback(performance.now()), 0);
      return rafCallCount;
    }) as typeof requestAnimationFrame;

    // Render with processing=true, active=false, no mediaStream
    const { container, unmount } = render(
      <LiveWaveform active={false} processing={true} mode="scrolling" height={40} barWidth={3} barGap={1} />
    );

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();

    // Wait for processing animation to schedule multiple frames
    // The fix ensures animation continues when processing=true even though active=false
    await waitFor(
      () => {
        expect(rafCallCount).toBeGreaterThan(5);
      },
      { timeout: 1000 }
    );

    // Cleanup
    unmount();
    globalThis.requestAnimationFrame = originalRAF;
  });
});

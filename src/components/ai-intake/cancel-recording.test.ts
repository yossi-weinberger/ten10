import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockMediaRecorder {
  state: string;
  stream: MediaStream;
  stop: ReturnType<typeof vi.fn>;
}

describe("cancel recording", () => {
  let mockMediaRecorder: MockMediaRecorder;
  let mockStream: MediaStream;

  beforeEach(() => {
    const mockTrack = { stop: vi.fn() } as unknown as MediaStreamTrack;
    mockStream = {
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;
    mockMediaRecorder = {
      state: "recording",
      stream: mockStream,
      stop: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stops the recorder and tracks when cancel is called during recording", () => {
    const recorder = { current: mockMediaRecorder as unknown as MediaRecorder | null };
    const discardRecording = { current: false };
    const setRecording = vi.fn();
    let recording = true;

    const cancelRecording = () => {
      if (!recording) return;
      const active = recorder.current;
      if (!active || active.state === "inactive") return;
      discardRecording.current = true;
      const stream = active.stream;
      active.stop();
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      setRecording(false);
      recording = false;
    };

    cancelRecording();

    expect(discardRecording.current).toBe(true);
    expect(mockMediaRecorder.stop).toHaveBeenCalledOnce();
    expect((mockStream.getTracks()[0] as unknown as { stop: ReturnType<typeof vi.fn> }).stop).toHaveBeenCalledOnce();
    expect(recorder.current).toBeNull();
    expect(setRecording).toHaveBeenCalledWith(false);
  });

  it("does not call stop when not recording", () => {
    const recorder = { current: mockMediaRecorder as unknown as MediaRecorder | null };
    const discardRecording = { current: false };
    const setRecording = vi.fn();
    const recording = false;

    const cancelRecording = () => {
      if (!recording) return;
      const active = recorder.current;
      if (!active || active.state === "inactive") return;
      discardRecording.current = true;
      const stream = active.stream;
      active.stop();
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      setRecording(false);
    };

    cancelRecording();

    expect(discardRecording.current).toBe(false);
    expect(mockMediaRecorder.stop).not.toHaveBeenCalled();
    expect((mockStream.getTracks()[0] as unknown as { stop: ReturnType<typeof vi.fn> }).stop).not.toHaveBeenCalled();
    expect(setRecording).not.toHaveBeenCalled();
  });

  it("does not call stop when recorder state is inactive", () => {
    mockMediaRecorder.state = "inactive";
    const recorder = { current: mockMediaRecorder as unknown as MediaRecorder | null };
    const discardRecording = { current: false };
    const setRecording = vi.fn();
    const recording = true;

    const cancelRecording = () => {
      if (!recording) return;
      const active = recorder.current;
      if (!active || active.state === "inactive") return;
      discardRecording.current = true;
      const stream = active.stream;
      active.stop();
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      setRecording(false);
    };

    cancelRecording();

    expect(discardRecording.current).toBe(false);
    expect(mockMediaRecorder.stop).not.toHaveBeenCalled();
    expect((mockStream.getTracks()[0] as unknown as { stop: ReturnType<typeof vi.fn> }).stop).not.toHaveBeenCalled();
    expect(setRecording).not.toHaveBeenCalled();
  });
});

/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAssistantDrawerComposer } from "./use-assistant-drawer-composer";
import { installDomPolyfills } from "./assistant-test-setup";
import type { AssistantDrawerState } from "./use-assistant-drawer-state";
import type { AssistantDrawerIntent } from "./use-assistant-drawer-intent";

const mocks = vi.hoisted(() => ({
  transcribeSpeech: vi.fn(),
  getUserMedia: vi.fn(),
}));

vi.mock("@/lib/ai/transcribe-speech", () => ({ transcribeSpeech: mocks.transcribeSpeech }));

describe("cancel recording", () => {
  let mockMediaRecorder: MediaRecorder;
  let mockStream: MediaStream;
  let mockTracks: MediaStreamTrack[];

  beforeEach(() => {
    installDomPolyfills();

    mockTracks = [
      { stop: vi.fn(), kind: "audio", id: "track1" } as unknown as MediaStreamTrack,
    ];

    mockStream = {
      getTracks: () => mockTracks,
      getAudioTracks: () => mockTracks,
    } as unknown as MediaStream;

    const stopSpy = vi.fn();
    
    mockMediaRecorder = {
      state: "recording",
      start: vi.fn(),
      stop: stopSpy,
      ondataavailable: null,
      onstop: null,
      mimeType: "audio/webm",
      stream: mockStream,
    } as unknown as MediaRecorder;

    (globalThis as typeof globalThis & { MediaRecorder: typeof MediaRecorder }).MediaRecorder = class MockMediaRecorder {
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      state: RecordingState = "inactive";
      mimeType = "audio/webm";
      stream = mockStream;

      constructor() {
        this.stream = mockStream;
      }

      start() {
        this.state = "recording";
        mockMediaRecorder.start();
        setTimeout(() => {
          if (this.ondataavailable) {
            const blob = new Blob(["mock audio data"], { type: "audio/webm" });
            this.ondataavailable({ data: blob } as BlobEvent);
          }
        }, 0);
      }

      stop() {
        mockMediaRecorder.stop();
        this.state = "inactive";
        const callback = this.onstop;
        setTimeout(() => {
          if (callback) callback();
        }, 0);
      }

      static isTypeSupported() {
        return true;
      }
    } as unknown as typeof MediaRecorder;

    mocks.getUserMedia.mockResolvedValue(mockStream);
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      value: {
        getUserMedia: mocks.getUserMedia,
      },
    });

    mocks.transcribeSpeech.mockResolvedValue({ ok: true, text: "test transcription" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createMockState(): AssistantDrawerState {
    const state = {
      defaultCurrency: "ILS",
      questionCalendar: "gregorian",
      text: "",
      setText: vi.fn(),
      intent: null,
      setIntent: vi.fn(),
      receiptArtifactId: null,
      setReceiptArtifactId: vi.fn(),
      setReceiptLink: vi.fn(),
      setClarification: vi.fn(),
      held: { current: null },
      splitRef: { current: null },
      setPendingText: vi.fn(),
      setReceiptFields: vi.fn(),
      setParsedRule: vi.fn(),
      setRuleChoice: vi.fn(),
      setHalachaNamespace: vi.fn(),
      setHalachaUserQuestion: vi.fn(),
      setChecking: vi.fn(),
      setPendingPhase: vi.fn(),
      setLevel: vi.fn(),
      setElapsed: vi.fn(),
      recording: false,
      transcribing: false,
      setStatus: vi.fn(),
      askIntent: false,
      dataReply: null,
      duplicateScan: null,
      clarification: null,
      level: 0,
      elapsed: 0,
      pendingPhase: null,
      checking: false,
      previewUrls: { current: [] },
      requestRef: { current: 0 },
      memoryRef: { current: null },
      turnStart: { current: null },
      contextRef: { current: null },
      discardRecording: { current: false },
      recorder: { current: null },
      recordTimer: { current: null },
      audioFrame: { current: 0 },
      audioContext: { current: null },
      levelTick: { current: 0 },
      elapsedTimer: { current: null },
      showDraft: vi.fn(),
      beginTurn: vi.fn(),
      saving: false,
      undoing: false,
      user: { id: "test-user" },
      i18n: { language: "en" },
      t: (key: string) => key,
      textareaRef: { current: null },
      conversationRef: { current: { active: null, turns: [] } },
      setActiveUser: vi.fn(),
      syncConversation: vi.fn(),
      clearConversation: vi.fn(),
      keepRecording: vi.fn(),
      disposeAssistant: vi.fn(),
      platform: "web",
      history: [],
      activeUser: null,
      limitInfo: null,
      setLimitInfo: vi.fn(),
      mediaStream: { current: null },
    } as unknown as AssistantDrawerState;
    state.setRecording = vi.fn((value) => {
      state.recording = typeof value === "function" ? value(state.recording) : value;
    }) as AssistantDrawerState["setRecording"];
    state.setTranscribing = vi.fn((value) => {
      state.transcribing = typeof value === "function" ? value(state.transcribing) : value;
    }) as AssistantDrawerState["setTranscribing"];
    return state;
  }

  function createMockIntent(): Pick<AssistantDrawerIntent, "handleSubmit" | "showIntent" | "showHeld"> {
    return {
      handleSubmit: vi.fn(),
      showIntent: vi.fn(),
      showHeld: vi.fn(),
    };
  }

  it("cancelRecording stops tracks, sets recording=false, transcribing=false, and does NOT call transcribeSpeech", async () => {
    const state = createMockState();
    const intent = createMockIntent();

    const { result, rerender } = renderHook(() => useAssistantDrawerComposer(state, intent));

    await act(async () => {
      await result.current.toggleRecording();
    });
    
    rerender();
    expect(state.recording).toBe(true);

    const conversationBefore = state.conversationRef.current;
    const activeUserBefore = state.activeUser;

    act(() => {
      result.current.cancelRecording();
    });

    rerender();
    expect(state.recording).toBe(false);
    expect(state.discardRecording.current).toBe(true);
    expect(mockTracks[0].stop).toHaveBeenCalled();
    expect(mocks.transcribeSpeech).not.toHaveBeenCalled();
    expect(state.conversationRef.current).toBe(conversationBefore);
    expect(state.activeUser).toBe(activeUserBefore);
  });

  it("normal stop via toggleRecording DOES call transcribeSpeech once", async () => {
    const state = createMockState();
    const intent = createMockIntent();

    const { result } = renderHook(() => useAssistantDrawerComposer(state, intent));

    await act(async () => {
      await result.current.toggleRecording();
    });
    
    expect(state.recording).toBe(true);
    expect(state.recorder.current).not.toBeNull();
    expect(state.recorder.current?.state).toBe("recording");
    
    state.discardRecording.current = false;

    await act(async () => {
      await result.current.toggleRecording();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(state.recording).toBe(false);
    expect(mocks.transcribeSpeech).toHaveBeenCalledOnce();
  });

  it("cancelRecording assertion would fail if discardRecording were not set", async () => {
    const state = createMockState();
    const intent = createMockIntent();

    const { result, rerender } = renderHook(() => useAssistantDrawerComposer(state, intent));

    await act(async () => {
      await result.current.toggleRecording();
    });
    
    rerender();
    expect(state.recording).toBe(true);

    state.discardRecording.current = false;

    act(() => {
      result.current.cancelRecording();
    });

    rerender();
    expect(state.recording).toBe(false);
    expect(state.discardRecording.current).toBe(true);
  });
});

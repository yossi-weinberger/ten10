import { create } from "zustand";
import { useDonationStore } from "@/lib/store";
import type { CalendarType } from "@/lib/calendar";

type CalendarPreviewState = {
  preview: CalendarType | null;
  setPreview: (calendarType: CalendarType) => void;
  clearPreview: () => void;
};

/** Session-only display calendar. Never written to saved settings. */
export const useCalendarPreview = create<CalendarPreviewState>((set) => ({
  preview: null,
  setPreview: (calendarType) => set({ preview: calendarType }),
  clearPreview: () => set({ preview: null }),
}));

export function useEffectiveCalendarType(): CalendarType {
  const saved = useDonationStore((state) => state.settings.calendarType);
  const preview = useCalendarPreview((state) => state.preview);
  return preview ?? saved;
}

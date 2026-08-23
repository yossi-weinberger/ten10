import { useCallback, useEffect, useMemo, useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";

export interface LoadedSelectionState {
  checked: CheckedState;
  selectedLoadedCount: number;
  loadedCount: number;
}

export interface LoadedSelectionSnapshot extends LoadedSelectionState {
  selectedIds: Set<string>;
}

export function toggleSelectedId(
  selectedIds: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(selectedIds);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
}

export function toggleAllLoadedIds(
  selectedIds: ReadonlySet<string>,
  loadedIds: readonly string[],
): Set<string> {
  const next = pruneSelectionToLoadedIds(selectedIds, loadedIds);
  const allLoadedSelected =
    loadedIds.length > 0 && loadedIds.every((id) => next.has(id));

  for (const id of loadedIds) {
    if (allLoadedSelected) {
      next.delete(id);
    } else {
      next.add(id);
    }
  }

  return next;
}

export function pruneSelectionToLoadedIds(
  selectedIds: ReadonlySet<string>,
  loadedIds: readonly string[],
): Set<string> {
  const loaded = new Set(loadedIds);

  return new Set([...selectedIds].filter((id) => loaded.has(id)));
}

function setsEqual(first: ReadonlySet<string>, second: ReadonlySet<string>) {
  if (first.size !== second.size) {
    return false;
  }

  for (const value of first) {
    if (!second.has(value)) {
      return false;
    }
  }

  return true;
}

export function pruneSelectionStateToLoadedIds(
  selectedIds: Set<string>,
  loadedIds: readonly string[],
): Set<string> {
  const prunedSelectedIds = pruneSelectionToLoadedIds(selectedIds, loadedIds);

  return setsEqual(selectedIds, prunedSelectedIds)
    ? selectedIds
    : prunedSelectedIds;
}

export function getLoadedSelectionState(
  selectedIds: ReadonlySet<string>,
  loadedIds: readonly string[],
): LoadedSelectionState {
  const selectedLoadedCount = loadedIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const loadedCount = loadedIds.length;

  if (selectedLoadedCount === 0 || loadedCount === 0) {
    return {
      checked: false,
      selectedLoadedCount,
      loadedCount,
    };
  }

  if (selectedLoadedCount === loadedCount) {
    return {
      checked: true,
      selectedLoadedCount,
      loadedCount,
    };
  }

  return {
    checked: "indeterminate",
    selectedLoadedCount,
    loadedCount,
  };
}

export function getLoadedSelectionSnapshot(
  selectedIds: ReadonlySet<string>,
  loadedIds: readonly string[],
): LoadedSelectionSnapshot {
  const prunedSelectedIds = pruneSelectionToLoadedIds(selectedIds, loadedIds);
  const selectionState = getLoadedSelectionState(prunedSelectedIds, loadedIds);

  return {
    ...selectionState,
    selectedIds: prunedSelectedIds,
  };
}

export function useLoadedRowSelection(loadedIds: readonly string[]) {
  const loadedIdsKey = loadedIds.join("\u0000");
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const loadedIdsSet = useMemo(() => new Set(loadedIds), [loadedIds]);

  useEffect(() => {
    // Render already uses the pruned snapshot; this sync only cleans raw state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection((current) => pruneSelectionStateToLoadedIds(current, loadedIds));
  }, [loadedIds, loadedIdsKey]);

  const snapshot = getLoadedSelectionSnapshot(selection, loadedIds);

  const toggle = useCallback((id: string) => {
    if (!loadedIdsSet.has(id)) {
      setSelection((current) =>
        pruneSelectionStateToLoadedIds(current, loadedIds),
      );
      return;
    }

    setSelection((current) =>
      toggleSelectedId(
        pruneSelectionStateToLoadedIds(current, loadedIds),
        id,
      ),
    );
  }, [loadedIds, loadedIdsSet]);

  const toggleAllLoaded = useCallback(() => {
    setSelection((current) => toggleAllLoadedIds(current, loadedIds));
  }, [loadedIds]);

  const clear = useCallback(() => {
    setSelection((current) => (current.size === 0 ? current : new Set()));
  }, []);

  return {
    selectedIds: snapshot.selectedIds,
    selectedCount: snapshot.selectedIds.size,
    selectedLoadedCount: snapshot.selectedLoadedCount,
    loadedCount: snapshot.loadedCount,
    checked: snapshot.checked,
    toggle,
    toggleAllLoaded,
    clear,
  };
}

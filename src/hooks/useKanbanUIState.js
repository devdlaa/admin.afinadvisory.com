import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "kanban_ui";

// ── Raw read/write ─────────────────────────────────────────
function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function readPipeline(pipelineId) {
  return readAll()[pipelineId] ?? null;
}

function writePipeline(pipelineId, pipelineConfig) {
  const all = readAll();
  all[pipelineId] = pipelineConfig;
  writeAll(all);
}

// ── Hook ───────────────────────────────────────────────────
/**
 * Persists collapsed stage IDs + column width to localStorage per pipeline.
 * Syncs automatically when stages are added or removed.
 *
 * @param {string}   pipelineId   - active pipeline ID
 * @param {Array}    stages       - full stage list from Redux (all stages, open + closed)
 * @param {number}   defaultWidth - fallback width if nothing saved
 */
export function useKanbanUIState(pipelineId, stages, defaultWidth = 400) {
  // ── Initialise from localStorage ─────────────────────────
  const [collapsedIds, setCollapsedIds] = useState(() => {
    if (!pipelineId || !stages.length) return new Set();
    return buildCollapsedSet(pipelineId, stages);
  });

  const [committedWidth, setCommittedWidth] = useState(() => {
    if (!pipelineId) return defaultWidth;
    return readPipeline(pipelineId)?.width ?? defaultWidth;
  });

  // ── Re-initialise when pipeline switches ─────────────────
  // (KanbanBoard has key={pipelineId} so this is actually a fresh
  //  mount every time — but guard anyway for safety)
  const prevPipelineRef = useRef(pipelineId);
  useEffect(() => {
    if (prevPipelineRef.current === pipelineId) return;
    prevPipelineRef.current = pipelineId;

    setCollapsedIds(buildCollapsedSet(pipelineId, stages));
    setCommittedWidth(readPipeline(pipelineId)?.width ?? defaultWidth);
  }, [pipelineId]);

  // ── Sync when stages list changes (added / removed stages) ─
  // Runs after pipeline is already loaded, when stages change.
  const prevStageKeyRef = useRef(stages.map((s) => s.id).join(","));
  useEffect(() => {
    const key = stages.map((s) => s.id).join(",");
    if (key === prevStageKeyRef.current) return;
    prevStageKeyRef.current = key;

    // Merge: keep existing collapsed state, add new stages as uncollapsed,
    // drop removed stages from storage
    setCollapsedIds((prev) => {
      const currentIds = new Set(stages.map((s) => s.id));
      // Remove stale IDs
      const next = new Set([...prev].filter((id) => currentIds.has(id)));
      // Persist the cleaned-up set
      persistStages(pipelineId, stages, next);
      return next;
    });
  }, [stages, pipelineId]);

  // ── Collapse / uncollapse ─────────────────────────────────
  const collapse = useCallback(
    (stageId) => {
      setCollapsedIds((prev) => {
        const next = new Set([...prev, stageId]);
        persistStages(pipelineId, stages, next);
        return next;
      });
    },
    [pipelineId, stages],
  );

  const uncollapse = useCallback(
    (stageId) => {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        next.delete(stageId);
        persistStages(pipelineId, stages, next);
        return next;
      });
    },
    [pipelineId, stages],
  );

  // ── Width ─────────────────────────────────────────────────
  const saveWidth = useCallback(
    (width) => {
      setCommittedWidth(width);
      const config = readPipeline(pipelineId) ?? { stages: {} };
      config.width = width;
      writePipeline(pipelineId, config);
    },
    [pipelineId],
  );

  return {
    collapsedIds,
    collapse,
    uncollapse,
    committedWidth,
    saveWidth,
  };
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Build the initial collapsed Set for a pipeline.
 * - Loads saved stage states from localStorage
 * - Drops stageIds that no longer exist in the current stage list
 * - New stages (not in storage) default to uncollapsed
 */
function buildCollapsedSet(pipelineId, stages) {
  const saved = readPipeline(pipelineId)?.stages ?? {};
  const currentIds = new Set(stages.map((s) => s.id));

  const collapsed = new Set();
  for (const [stageId, stageConfig] of Object.entries(saved)) {
    // Only keep if stage still exists AND was collapsed
    if (currentIds.has(stageId) && stageConfig.collapsed) {
      collapsed.add(stageId);
    }
  }
  return collapsed;
}

/**
 * Write the full stage map back to localStorage.
 * Preserves only stageIds present in the current stages array.
 */
function persistStages(pipelineId, stages, collapsedSet) {
  const config = readPipeline(pipelineId) ?? { width: 400 };
  const stagesMap = {};
  for (const stage of stages) {
    stagesMap[stage.id] = { collapsed: collapsedSet.has(stage.id) };
  }
  config.stages = stagesMap;
  writePipeline(pipelineId, config);
}

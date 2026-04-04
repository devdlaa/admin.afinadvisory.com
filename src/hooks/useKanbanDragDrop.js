import { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  moveLeadOptimistic,
  rollbackLeadMove,
  updateLeadStageThunk,
} from "@/store/slices/leadsSlice";

export function useKanbanDragDrop(pipelineId) {
  const dispatch = useDispatch();

  // { leadId, fromStageId }
  const dragRef = useRef(null);
  const [overStageId, setOverStageId] = useState(null);
  const [overLeadIndex, setOverLeadIndex] = useState(null);
  const [draggingLeadId, setDraggingLeadId] = useState(null);

  /* ── Card handlers (spread onto <LeadCard>) ── */
  const getDragHandlers = useCallback(
    (leadId, stageId) => ({
      draggable: true,
      onDragStart: (e) => {
        dragRef.current = { leadId, fromStageId: stageId };
        setDraggingLeadId(leadId);
        // ghost image: semi-transparent clone
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", leadId);
      },
      onDragEnd: () => {
        dragRef.current = null;
        setDraggingLeadId(null);
        setOverStageId(null);
        setOverLeadIndex(null);
      },
    }),
    [],
  );

  /* ── Drop-zone handlers (spread onto each stage body) ── */
  const getDropZoneHandlers = useCallback(
    (toStageId, isCollapsed) => {
      if (isCollapsed) return {}; // collapsed boards can't receive drops

      return {
        onDragOver: (e) => {
          e.preventDefault(); // allow drop
          e.dataTransfer.dropEffect = "move";
          setOverStageId(toStageId);
        },
        onDragLeave: (e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setOverStageId((prev) => (prev === toStageId ? null : prev));
            setOverLeadIndex(null);
          }
        },
        onDrop: (e) => {
          e.preventDefault();
          setOverStageId(null);
          setOverLeadIndex(null);
          setDraggingLeadId(null);

          const { leadId, fromStageId } = dragRef.current ?? {};
          dragRef.current = null;

          if (!leadId || !fromStageId) return;
          if (fromStageId === toStageId) return; // same column → no-op

          // 1) Optimistic move (instant UI)
          dispatch(
            moveLeadOptimistic({
              pipelineId,
              leadId,
              fromStageId,
              toStageId,
            }),
          );

          // 2) API call → rollback on failure
          dispatch(
            updateLeadStageThunk({
              leadId,
              stageId: toStageId,
              pipelineId, // needed by fulfilled reducer
            }),
          )
            .unwrap()
            .catch(() => {
              dispatch(rollbackLeadMove({ leadId }));
            });
        },
      };
    },
    [dispatch, pipelineId],
  );

  return {
    draggingLeadId,
    overStageId,
    overLeadIndex,
    setOverLeadIndex,
    getDragHandlers,
    getDropZoneHandlers,
  };
}

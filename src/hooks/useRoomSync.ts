"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface RoomStateData {
  interviewId: string;
  questionId: string;
  code: string | null;
  workspaceData: string | null;
  language: string;
  updatedBy: string;
  version: number;
}

interface SyncEvent {
  id: string;
  timestampMs: number;
  type: string;
  payload: Record<string, string | undefined>;
}

interface UseRoomSyncOptions {
  interviewId: string;
  userId: string;
  activeQuestionId: string | null;
  enabled: boolean;
  onRemoteCode?: (code: string, questionId: string) => void;
  onRemoteWorkspace?: (data: Record<string, unknown>, questionId: string) => void;
  onNewEvents?: (events: SyncEvent[]) => void;
}

export function useRoomSync({
  interviewId,
  userId,
  activeQuestionId,
  enabled,
  onRemoteCode,
  onRemoteWorkspace,
  onNewEvents,
}: UseRoomSyncOptions) {
  const [connected, setConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const versionRef = useRef(0);
  const lastEventMsRef = useRef(0);
  const isLocalEditRef = useRef(false);

  const pushState = useCallback(
    async (data: {
      code?: string;
      workspaceData?: Record<string, unknown>;
      language?: string;
    }) => {
      if (!activeQuestionId || !enabled) return;

      isLocalEditRef.current = true;
      try {
        const res = await fetch(`/api/interviews/${interviewId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: activeQuestionId,
            version: versionRef.current,
            ...data,
            workspaceData: data.workspaceData,
          }),
        });
        if (res.ok) {
          const state = await res.json();
          versionRef.current = state.version;
        }
      } finally {
        setTimeout(() => {
          isLocalEditRef.current = false;
        }, 500);
      }
    },
    [interviewId, activeQuestionId, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function poll() {
      if (!active) return;
      try {
        const res = await fetch(
          `/api/interviews/${interviewId}/sync?since=${lastEventMsRef.current}`
        );
        if (!res.ok) return;

        const data = await res.json();
        setConnected(true);

        const remoteUsers = new Set(
          (data.roomStates as RoomStateData[]).map((s) => s.updatedBy)
        );
        setParticipantCount(Math.max(1, remoteUsers.size));

        if (!isLocalEditRef.current && activeQuestionId) {
          const state = (data.roomStates as RoomStateData[]).find(
            (s) => s.questionId === activeQuestionId && s.updatedBy !== userId
          );
          if (state) {
            if (state.code && state.version > versionRef.current) {
              versionRef.current = state.version;
              onRemoteCode?.(state.code, state.questionId);
            }
            if (state.workspaceData) {
              try {
                const ws = JSON.parse(state.workspaceData);
                onRemoteWorkspace?.(ws, state.questionId);
              } catch {
                /* ignore */
              }
            }
          }
        }

        if (data.events?.length > 0) {
          onNewEvents?.(data.events);
          const maxMs = Math.max(...data.events.map((e: SyncEvent) => e.timestampMs));
          lastEventMsRef.current = Math.max(lastEventMsRef.current, maxMs + 1);
        }
      } catch {
        setConnected(false);
      }
    }

    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    interviewId,
    userId,
    activeQuestionId,
    enabled,
    onRemoteCode,
    onRemoteWorkspace,
    onNewEvents,
  ]);

  return { connected, participantCount, pushState };
}

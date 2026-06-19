"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useInterviewRoomOptional } from "@/contexts/InterviewRoomContext";
import type { LayoutContext } from "../types";

// Load Excalidraw dynamically to prevent Next.js SSR errors (Excalidraw uses window/canvas APIs)
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400">
        <span className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mr-2" />
        Loading collaborative whiteboard...
      </div>
    ),
  }
);

export function SystemDesignLayout({ ctx }: { ctx: LayoutContext }) {
  const room = useInterviewRoomOptional();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const isRemote = useRef(false);
  const broadcastDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Broadcast local changes to the room
  const broadcastState = useCallback(
    (nextElements: any[]) => {
      if (isRemote.current || ctx.readOnly) return;
      ctx.onWorkspaceChange({ elements: nextElements });
      if (room && ctx.question) {
        room.emitWhiteboardUpdate(ctx.question.id, {
          elements: nextElements,
          notes: "",
        });
      }
    },
    [ctx, room]
  );

  // Debounce broadcast updates to prevent overwhelming the socket channel
  const debouncedBroadcast = useCallback(
    (nextElements: any[]) => {
      if (broadcastDebounceRef.current) clearTimeout(broadcastDebounceRef.current);
      broadcastDebounceRef.current = setTimeout(() => {
        broadcastState(nextElements);
      }, 250);
    },
    [broadcastState]
  );

  // Initialize canvas elements from workspaceData once the API is ready
  useEffect(() => {
    if (excalidrawAPI && ctx.workspaceData?.elements) {
      isRemote.current = true;
      excalidrawAPI.updateScene({ elements: ctx.workspaceData.elements });
      setTimeout(() => {
        isRemote.current = false;
      }, 50);
    }
  }, [excalidrawAPI, ctx.workspaceData?.elements]);

  // Listen for whiteboard events from the other participant
  useEffect(() => {
    if (!room || !ctx.question || !excalidrawAPI) return;

    return room.onWhiteboardUpdate(({ questionId, elements: remoteElements, userId }) => {
      if (questionId !== ctx.question?.id || userId === room.userId) return;
      isRemote.current = true;
      excalidrawAPI.updateScene({
        elements: remoteElements || [],
      });
      setTimeout(() => {
        isRemote.current = false;
      }, 100);
    });
  }, [room, ctx.question, excalidrawAPI]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (broadcastDebounceRef.current) clearTimeout(broadcastDebounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white overflow-hidden relative min-h-[500px] h-full w-full">
      <div className="flex-1 h-full w-full">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="light"
          viewModeEnabled={ctx.readOnly}
          onChange={(elements) => {
            if (ctx.readOnly || isRemote.current) return;
            debouncedBroadcast(elements);
          }}
        />
      </div>
    </div>
  );
}
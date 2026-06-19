"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";

interface Participant {
  userId: string;
  userName: string;
  role: string;
  socketId: string;
}

interface RoomEvent {
  id: string;
  timestampMs: number;
  type: string;
  payload: Record<string, string | undefined>;
}

type Listener = (data: unknown) => void;

interface InterviewRoomContextValue {
  connected: boolean;
  participantCount: number;
  userId: string;
  emitCodeUpdate: (questionId: string, code: string, language: string) => void;
  emitWhiteboardUpdate: (
    questionId: string,
    data: { elements: unknown[]; notes: string; strokes?: unknown[] }
  ) => void;
  emitRoomEvent: (event: RoomEvent) => void;
  emitQuestionSwitch: (questionIdx: number, questionId: string, title: string) => void;
  emitLayoutToggle: (tool: "NONE" | "WHITEBOARD" | "RESUME" | "CODE_EDITOR") => void;
  onCodeUpdate: (cb: (data: { questionId: string; code: string; language: string; userId: string }) => void) => () => void;
  onWhiteboardUpdate: (
    cb: (data: {
      questionId: string;
      elements: unknown[];
      notes: string;
      strokes?: unknown[];
      userId: string;
    }) => void
  ) => () => void;
  onRoomEvent: (cb: (event: RoomEvent) => void) => () => void;
  onQuestionSwitch: (
    cb: (data: { questionIdx: number; questionId: string; title: string }) => void
  ) => () => void;
  onLayoutToggle: (cb: (data: { tool: "NONE" | "WHITEBOARD" | "RESUME" | "CODE_EDITOR" }) => void) => () => void;
  onRoomState: (cb: (state: Record<string, unknown>) => void) => () => void;
  onParticipantsList: (cb: (participants: Participant[]) => void) => () => void;
  onUserJoined: (cb: (participant: Participant) => void) => () => void;
  onUserLeft: (cb: (data: { userId: string; socketId: string }) => void) => () => void;
  onWebRTCOffer: (cb: (data: { fromSocketId: string; fromUserName: string; offer: RTCSessionDescriptionInit }) => void) => () => void;
  onWebRTCAnswer: (cb: (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => void) => () => void;
  onWebRTCIce: (cb: (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => void) => () => void;
  sendWebRTCOffer: (targetSocketId: string, offer: RTCSessionDescriptionInit) => void;
  sendWebRTCAnswer: (targetSocketId: string, answer: RTCSessionDescriptionInit) => void;
  sendWebRTCIce: (targetSocketId: string, candidate: RTCIceCandidateInit) => void;
}

const InterviewRoomContext = createContext<InterviewRoomContextValue | null>(null);

export function InterviewRoomProvider({
  interviewId,
  userId,
  userName,
  role,
  children,
}: {
  interviewId: string;
  userId: string;
  userName: string;
  role: string;
  children: ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());
  const [connected, setConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const bindSocketListeners = useCallback((socket: Socket) => {
    listenersRef.current.forEach((callbacks, event) => {
      callbacks.forEach((cb) => socket.on(event, cb));
    });
  }, []);

  useEffect(() => {
    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;
    bindSocketListeners(socket);

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-room", { interviewId, userId, userName, role });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("participants-list", (participants: Participant[]) => {
      setParticipantCount(participants.length + 1);
    });

    socket.on("user-joined", () => {
      setParticipantCount((c) => c + 1);
    });

    socket.on("user-left", () => {
      setParticipantCount((c) => Math.max(1, c - 1));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [interviewId, userId, userName, role, bindSocketListeners]);

  const subscribe = useCallback(<T,>(event: string, cb: (data: T) => void) => {
    const wrapped = cb as Listener;
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(wrapped);
    socketRef.current?.on(event, wrapped);

    return () => {
      listenersRef.current.get(event)?.delete(wrapped);
      socketRef.current?.off(event, wrapped);
    };
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const value: InterviewRoomContextValue = {
    connected,
    participantCount,
    userId,
    emitCodeUpdate: (questionId, code, language) =>
      emit("code-update", { questionId, code, language }),
    emitWhiteboardUpdate: (questionId, data) =>
      emit("whiteboard-update", { questionId, ...data }),
    emitRoomEvent: (event) => emit("room-event", event),
    emitQuestionSwitch: (questionIdx, questionId, title) =>
      emit("question-switch", { questionIdx, questionId, title }),
    emitLayoutToggle: (tool) => 
      emit("layout-toggle", { tool }),
    onCodeUpdate: (cb) => subscribe("code-update", cb),
    onWhiteboardUpdate: (cb) => subscribe("whiteboard-update", cb),
    onRoomEvent: (cb) => subscribe("room-event", cb),
    onQuestionSwitch: (cb) => subscribe("question-switch", cb),
    onLayoutToggle: (cb) => subscribe("layout-toggle", cb),
    onRoomState: (cb) => subscribe("room-state", cb),
    onParticipantsList: (cb) => subscribe("participants-list", cb),
    onUserJoined: (cb) => subscribe("user-joined", cb),
    onUserLeft: (cb) => subscribe("user-left", cb),
    onWebRTCOffer: (cb) => subscribe("webrtc-offer", cb),
    onWebRTCAnswer: (cb) => subscribe("webrtc-answer", cb),
    onWebRTCIce: (cb) => subscribe("webrtc-ice-candidate", cb),
    sendWebRTCOffer: (targetSocketId, offer) =>
      emit("webrtc-offer", { targetSocketId, offer }),
    sendWebRTCAnswer: (targetSocketId, answer) =>
      emit("webrtc-answer", { targetSocketId, answer }),
    sendWebRTCIce: (targetSocketId, candidate) =>
      emit("webrtc-ice-candidate", { targetSocketId, candidate }),
  };

  return (
    <InterviewRoomContext.Provider value={value}>
      {children}
    </InterviewRoomContext.Provider>
  );
}

export function useInterviewRoom() {
  const ctx = useContext(InterviewRoomContext);
  if (!ctx) throw new Error("useInterviewRoom must be used inside InterviewRoomProvider");
  return ctx;
}

export function useInterviewRoomOptional() {
  return useContext(InterviewRoomContext);
}
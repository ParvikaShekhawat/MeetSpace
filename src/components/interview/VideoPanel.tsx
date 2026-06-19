"use client";

import { useEffect, useRef, useState } from "react";
import { User, Mic } from "lucide-react";
import { useInterviewRoomOptional } from "@/contexts/InterviewRoomContext";

interface VideoPanelProps {
  socket?: any;
  interviewId: string;
  userName: string;
  remoteName: string;
  isInterviewer: boolean;
}

export function VideoPanel({ socket: propSocket, interviewId, userName, remoteName, isInterviewer }: VideoPanelProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Type-cast context to any safely to look up the socket instance without breaking compilation
  const roomContext = useInterviewRoomOptional() as any;
  const socket = propSocket || roomContext?.socket;

  const [cameraOn] = useState(true);
  const [micOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [targetSocket, setTargetSocket] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let localMediaStream: MediaStream | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        localMediaStream = s;
        setStream(s);
        if (localRef.current) localRef.current.srcObject = s;

        initPeerConnection(s);
      })
      .catch((err) => console.log("Camera access deferred:", err));

    function initPeerConnection(localStream: MediaStream) {
      const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
      const pc = new RTCPeerConnection(configuration);
      pcRef.current = pc;

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteRef.current) remoteRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && targetSocket && socket) {
          socket.emit("webrtc-ice-candidate", {
            targetSocketId: targetSocket,
            candidate: event.candidate,
          });
        }
      };
    }

    return () => {
      active = false;
      localMediaStream?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, [targetSocket, socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on("participants-list", (others: any[]) => {
      if (others.length > 0) {
        const peer = others[0].socketId;
        setTargetSocket(peer);
        
        if (isInterviewer && pcRef.current) {
          pcRef.current.createOffer().then((offer) => {
            pcRef.current?.setLocalDescription(offer);
            socket.emit("webrtc-offer", { targetSocketId: peer, offer });
          });
        }
      }
    });

    socket.on("user-joined", (user: any) => {
      setTargetSocket(user.socketId);
      if (isInterviewer && pcRef.current) {
        pcRef.current.createOffer().then((offer) => {
          pcRef.current?.setLocalDescription(offer);
          socket.emit("webrtc-offer", { targetSocketId: user.socketId, offer });
        });
      }
    });

    socket.on("webrtc-offer", async ({ fromSocketId, offer }: any) => {
      setTargetSocket(fromSocketId);
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit("webrtc-answer", { targetSocketId: fromSocketId, answer });
      }
    });

    socket.on("webrtc-answer", async ({ answer }: any) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("webrtc-ice-candidate", async ({ candidate }: any) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("user-left", () => {
      setRemoteStream(null);
      if (remoteRef.current) remoteRef.current.srcObject = null;
    });

    return () => {
      socket.off("participants-list");
      socket.off("user-joined");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("user-left");
    };
  }, [socket, isInterviewer]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => { t.enabled = cameraOn; });
    stream?.getAudioTracks().forEach((t) => { t.enabled = micOn; });
  }, [cameraOn, micOn, stream]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* CANDIDATE FEED CARD (Top) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#1e293b]">
        {remoteStream ? (
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
            {/* Fallback image simulation matching standard avatar frame */}
            <div className="h-full w-full bg-[#111827] flex items-center justify-center">
              <span className="text-xs text-slate-500 font-medium">Awaiting Candidate Feed...</span>
            </div>
          </div>
        )}
        
        {/* Name Overlay Label Pinned Bottom Left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          <span className="text-[11px] font-medium text-white tracking-wide">
            {remoteName || "Alex Rivera (Candidate)"}
          </span>
        </div>
      </div>

      {/* INTERVIEWER FEED CARD (Bottom) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#dbeafe]">
        {cameraOn && stream ? (
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#dbeafe]">
            <User className="h-8 w-8 text-[#93c5fd]" strokeWidth={1.5} />
          </div>
        )}

        {/* Live Audio Indicator Pinned Top Right */}
        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-md bg-[#bbf7d0]">
          <Mic className="h-3 w-3 text-[#16a34a]" />
        </div>

        {/* Status Overlay Label Pinned Bottom Left */}
        <div className="absolute bottom-3 left-3 rounded-md bg-[#334155] px-2 py-1">
          <span className="text-[11px] font-medium text-white tracking-wide">
            You (Interviewer)
          </span>
        </div>
      </div>
    </div>
  );
}
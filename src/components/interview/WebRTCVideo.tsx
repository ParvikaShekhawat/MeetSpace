"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Video, VideoOff, Mic, MicOff, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useInterviewRoom } from "@/contexts/InterviewRoomContext";

interface WebRTCVideoProps {
  userName: string;
  isInterviewer: boolean;
  layout?: "sidebar" | "fullscreen";
}

interface PendingPeer {
  socketId: string;
  userName: string;
  isInitiator: boolean;
  offer?: RTCSessionDescriptionInit;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function WebRTCVideo({ userName, isInterviewer, layout = "sidebar" }: WebRTCVideoProps) {
  const room = useInterviewRoom();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingPeersRef = useRef<PendingPeer[]>([]);
  const orphanIceRef = useRef<Map<string, any[]>>(new Map());
  const [mediaReady, setMediaReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteName, setRemoteName] = useState("Waiting for peer...");
  const [mediaError, setMediaError] = useState<string | null>(null);

  const createPeerConnection = useCallback(
    (targetSocketId: string, targetName: string, isInitiator: boolean, offer?: RTCSessionDescriptionInit) => {
      if (peersRef.current.has(targetSocketId)) return peersRef.current.get(targetSocketId)!;

      if (!localStreamRef.current) {
        pendingPeersRef.current.push({ socketId: targetSocketId, userName: targetName, isInitiator, offer });
        return null;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setRemoteConnected(true);
          setRemoteName(targetName);
        }
      };

      // Queue for ICE candidates that arrive before remote description is set
      const iceCandidatesQueue: RTCIceCandidateInit[] = orphanIceRef.current.get(targetSocketId) || [];
      orphanIceRef.current.delete(targetSocketId);
      (pc as any)._iceQueue = iceCandidatesQueue;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          room.sendWebRTCIce(targetSocketId, event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setRemoteConnected(false);
          setRemoteName("Reconnecting...");
          setTimeout(() => {
            if (peersRef.current.get(targetSocketId) === pc) {
               peersRef.current.delete(targetSocketId);
               createPeerConnection(targetSocketId, targetName, true);
            }
          }, 3000);
        }
        if (pc.connectionState === "connected") {
          setRemoteConnected(true);
          setRemoteName(targetName);
        }
      };

      peersRef.current.set(targetSocketId, pc);

      if (isInitiator) {
        pc.createOffer()
          .then((o) => pc.setLocalDescription(o))
          .then(() => {
            if (pc.localDescription) {
              room.sendWebRTCOffer(targetSocketId, pc.localDescription);
            }
          })
          .catch(console.error);
      } else if (!isInitiator && offer) {
        // We received an offer, set remote desc immediately, then process queued ICE
        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => {
            const queue = (pc as any)._iceQueue || [];
            queue.forEach((c: any) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
            (pc as any)._iceQueue = [];
          })
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => {
            if (pc.localDescription) {
              room.sendWebRTCAnswer(targetSocketId, pc.localDescription);
            }
          })
          .catch(console.error);
      }

      return pc;
    },
    [room]
  );

  const flushPendingPeers = useCallback(() => {
    const pending = [...pendingPeersRef.current];
    pendingPeersRef.current = [];
    pending.forEach(({ socketId, userName, isInitiator, offer }) => {
      createPeerConnection(socketId, userName, isInitiator, offer);
    });
  }, [createPeerConnection]);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setMediaReady(true);
        flushPendingPeers();
      })
      .catch(() => {
        setMediaError("Allow camera & mic access in browser settings");
        setMediaReady(true); // Proceed anyway to receive remote video
        flushPendingPeers();
      });

    return () => {
      active = false;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
    };
  }, [flushPendingPeers]);

  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = cameraOn;
    });
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = micOn;
    });
  }, [cameraOn, micOn]);

  useEffect(() => {
    if (!mediaReady) return;

    const unsubs = [
      room.onParticipantsList((participants) => {
        participants.forEach((p) => {
          createPeerConnection(p.socketId, p.userName, true);
        });
      }),
      room.onUserJoined((p) => {
        setRemoteName(p.userName);
      }),
      room.onUserLeft(({ socketId }) => {
        const pc = peersRef.current.get(socketId);
        pc?.close();
        peersRef.current.delete(socketId);
        setRemoteConnected(false);
        setRemoteName("Waiting for peer...");
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }),
      room.onWebRTCOffer(({ fromSocketId, fromUserName, offer }) => {
        setRemoteName(fromUserName);
        createPeerConnection(fromSocketId, fromUserName, false, offer);
      }),
      room.onWebRTCAnswer(({ fromSocketId, answer }) => {
        const pc = peersRef.current.get(fromSocketId);
        if (pc) {
          pc.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
              const queue = (pc as any)._iceQueue || [];
              queue.forEach((c: any) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
              (pc as any)._iceQueue = [];
            })
            .catch(console.error);
        }
      }),
      room.onWebRTCIce(({ fromSocketId, candidate }) => {
        const pc = peersRef.current.get(fromSocketId);
        if (pc) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          } else {
            ((pc as any)._iceQueue = (pc as any)._iceQueue || []).push(candidate);
          }
        } else {
          const orphans = orphanIceRef.current.get(fromSocketId) || [];
          orphans.push(candidate);
          orphanIceRef.current.set(fromSocketId, orphans);
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [room, createPeerConnection, mediaReady]);

  if (layout === "fullscreen") {
    return (
      <div className="relative flex-1 w-full h-full min-h-[450px] bg-slate-950 overflow-hidden rounded-2xl border border-slate-800">
        {/* Remote Video (Big Rectangle) */}
        {remoteConnected ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#090d16]/80 text-slate-400">
            <Video className="h-16 w-16 text-slate-600 animate-pulse" />
            <p className="mt-4 text-sm font-semibold">{remoteName}</p>
            <p className="mt-1 text-xs text-slate-500">Connecting to peer call...</p>
          </div>
        )}

        {/* Remote Name Badge */}
        {remoteConnected && (
          <div className="absolute bottom-4 left-4 z-20">
            <span className="rounded-md bg-black/60 px-3 py-1 text-xs text-white font-medium">{remoteName}</span>
          </div>
        )}

        {/* Local Video (Shorter Box of itself / floating PIP) */}
        <div className="absolute bottom-4 right-4 z-10 w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/20 shadow-2xl transition-all duration-300">
          {cameraOn && !mediaError ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover mirror" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
              {mediaError || "Camera off"}
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] text-white">You</span>
          </div>
          {!micOn && (
            <div className="absolute right-1.5 top-1.5 rounded-full bg-red-600/90 p-0.5">
              <MicOff className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Floating Media Controls overlay on full screen */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <button
            onClick={() => setCameraOn(!cameraOn)}
            className={`rounded-full p-2 transition-colors ${cameraOn ? "text-white hover:bg-white/10" : "bg-red-600 text-white"}`}
          >
            {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMicOn(!micOn)}
            className={`rounded-full p-2 transition-colors ${micOn ? "text-white hover:bg-white/10" : "bg-red-600 text-white"}`}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          {room.connected ? (
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Connecting" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-3">
      <div className="flex items-center gap-1.5 px-1">
        {room.connected ? (
          <>
            <Wifi className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400">Socket.io connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-amber-400">Connecting...</span>
          </>
        )}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-700">
        {cameraOn && !mediaError ? (
          <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover mirror" />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-800">
            <p className="text-xs text-slate-400">{mediaError || "Camera off"}</p>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white">You</span>
          <Badge variant="sky" className="text-[9px]">{isInterviewer ? "Interviewer" : "Candidate"}</Badge>
        </div>
        {!micOn && (
          <div className="absolute right-2 top-2 rounded-full bg-red-600/90 p-1">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-700">
        {remoteConnected ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-slate-800/80">
            <Video className="h-8 w-8 text-slate-600" />
            <p className="mt-2 text-xs text-slate-400">{remoteName}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {room.connected ? "Open this room in another browser as the other role" : "Connecting to room..."}
            </p>
          </div>
        )}
        {remoteConnected && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white">{remoteName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          onClick={() => setCameraOn(!cameraOn)}
          className={`rounded-full p-2.5 transition-colors ${cameraOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white"}`}
        >
          {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setMicOn(!micOn)}
          className={`rounded-full p-2.5 transition-colors ${micOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white"}`}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
      </div>

      <style jsx global>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
}

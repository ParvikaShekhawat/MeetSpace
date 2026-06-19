"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { WebRTCVideo } from "./WebRTCVideo";

interface InterviewVideoProps {
  interviewId: string;
  userName: string;
  remoteName: string;
  isInterviewer: boolean;
}

export function InterviewVideo({
  interviewId,
  userName,
  remoteName,
  isInterviewer,
}: InterviewVideoProps) {
  const [livekit, setLivekit] = useState<{
    configured: boolean;
    url: string | null;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const configRes = await fetch("/api/livekit/token");
        const config = await configRes.json();
        setLivekit(config);

        if (config.configured) {
          const tokenRes = await fetch("/api/livekit/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interviewId }),
          });
          if (tokenRes.ok) {
            const data = await tokenRes.json();
            setToken(data.token);
          } else {
            setError("Could not join video room");
          }
        }
      } catch {
        setError("Video init failed");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!livekit?.configured || !token || !livekit.url) {
    return <WebRTCVideo userName={userName} isInterviewer={isInterviewer} />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2">
        <Wifi className="h-3 w-3 text-emerald-400" />
        <span className="text-[10px] font-medium text-emerald-400">LiveKit Connected</span>
      </div>
      <div className="lk-room flex-1 overflow-hidden [&_.lk-video-conference]:h-full [&_.lk-video-conference]:bg-slate-900">
        <LiveKitRoom
          token={token}
          serverUrl={livekit.url}
          connect={true}
          audio={true}
          video={true}
          data-lk-theme="default"
          style={{ height: "100%" }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
      {error && <p className="p-2 text-center text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

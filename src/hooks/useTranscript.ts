"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTranscriptOptions {
  enabled: boolean;
  onTranscript: (text: string, isFinal: boolean) => void;
}

type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function useTranscript({ enabled, onTranscript }: UseTranscriptOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const w = window as Window & { SpeechRecognition?: new () => RecognitionInstance; webkitSpeechRecognition?: new () => RecognitionInstance };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const start = useCallback(() => {
    const w = window as Window & { SpeechRecognition?: new () => RecognitionInstance; webkitSpeechRecognition?: new () => RecognitionInstance };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor || !enabled) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript?.trim();
        if (text) onTranscriptRef.current(text, result.isFinal);
      }
    };

    recognition.onend = () => {
      setListening(false);
      if (enabled && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setListening(true);
        } catch {
          /* ignore */
        }
      }
    };

    recognition.onerror = () => setListening(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [enabled]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    if (enabled && supported) {
      start();
      return () => stop();
    }
    stop();
  }, [enabled, supported, start, stop]);

  return { listening, supported };
}

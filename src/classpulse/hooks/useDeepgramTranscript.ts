import { useState, useRef, useCallback, useEffect } from "react";

const DG_URL = "wss://api.deepgram.com/v1/listen";
const DG_PARAMS = new URLSearchParams({
  model: "nova-2",
  language: "en",
  interim_results: "true",
  smart_format: "true",
  punctuate: "true",
  numerals: "true",
  endpointing: "300",
  vad_events: "true",
}).toString();

export function useDeepgramTranscript() {
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setIsListening(false);
    setInterimText("");
  }, []);

  const start = useCallback(async () => {
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY as string;
    if (!apiKey) {
      console.error("[Deepgram] VITE_DEEPGRAM_API_KEY is not set");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      console.error("[Deepgram] Microphone access denied");
      return;
    }
    streamRef.current = stream;

    // Browser WebSocket auth via subprotocol (headers not supported in browsers)
    const ws = new WebSocket(`${DG_URL}?${DG_PARAMS}`, ["token", apiKey]);
    wsRef.current = ws;

    ws.onopen = () => {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      recorder.start(250);
      setIsListening(true);
    };

    ws.onmessage = (e) => {
      let msg: {
        type: string;
        is_final: boolean;
        channel?: { alternatives?: { transcript: string }[] };
      };
      try {
        msg = JSON.parse(e.data as string);
      } catch {
        return;
      }

      if (msg.type !== "Results") return;

      const text = msg.channel?.alternatives?.[0]?.transcript ?? "";

      if (msg.is_final) {
        if (text.trim()) setFinalTranscript((prev) => prev + text + " ");
        setInterimText("");
      } else {
        setInterimText(text);
      }
    };

    ws.onerror = () => stop();
    ws.onclose = () => {
      setIsListening(false);
      setInterimText("");
    };
  }, [stop]);

  useEffect(() => {
    return stop;
  }, [stop]);

  return { finalTranscript, interimText, isListening, start, stop };
}

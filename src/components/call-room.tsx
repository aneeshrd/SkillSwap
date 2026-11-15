"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase =
  | "starting"
  | "no-media"
  | "waiting"
  | "connecting"
  | "connected"
  | "peer-left"
  | "ended"
  | "error";

interface Props {
  sessionId: string;
  token: string;
  iceServers: RTCIceServer[];
  hasTurn: boolean;
  selfName: string;
  peerName: string;
  skillName: string;
  durationMinutes: number;
  scheduledAt: string;
}

const PHASE_COPY: Record<Phase, string> = {
  starting: "Setting up your camera and microphone…",
  "no-media": "SkillSwap needs your camera and microphone",
  waiting: "Waiting for them to join",
  connecting: "Connecting…",
  connected: "Connected",
  "peer-left": "They left the call",
  ended: "Call ended",
  error: "Something went wrong",
};

export function CallRoom(props: Props) {
  const {
    sessionId,
    token,
    iceServers,
    hasTurn,
    peerName,
    skillName,
    durationMinutes,
  } = props;

  const [phase, setPhase] = useState<Phase>("starting");
  const [detail, setDetail] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const startedAt = useRef<number | null>(null);
  const leaving = useRef(false);

  const post = useCallback((message: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  /* ------------------------------------------------------------ teardown */
  const teardown = useCallback(() => {
    leaving.current = true;
    try {
      post({ type: "bye" });
    } catch {
      /* socket already closed */
    }
    ws.current?.close();
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    pc.current?.close();
    localStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    pc.current = null;
    ws.current = null;
    localStream.current = null;
    screenStream.current = null;
  }, [post]);

  /* ----------------------------------------------------------- lifecycle */
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!window.isSecureContext) {
        setPhase("error");
        setDetail(
          "Browsers only allow camera access over HTTPS. Open this page on the secure address."
        );
        return;
      }

      // 1. Local media first — no point signalling without it.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        setPhase("no-media");
        setDetail(
          name === "NotAllowedError"
            ? "Your browser blocked access. Allow the camera and microphone for this site, then reload."
            : name === "NotFoundError"
              ? "No camera or microphone was found on this device."
              : "We couldn't start your camera and microphone."
        );
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;

      // 2. Peer connection.
      const connection = new RTCPeerConnection({ iceServers });
      pc.current = connection;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      connection.ontrack = (event) => {
        if (remoteVideo.current && event.streams[0]) {
          remoteVideo.current.srcObject = event.streams[0];
        }
      };
      connection.onicecandidate = (event) => {
        if (event.candidate) post({ type: "ice", candidate: event.candidate.toJSON() });
      };
      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        if (state === "connected") {
          startedAt.current ??= Date.now();
          setPhase("connected");
        } else if (state === "failed") {
          setPhase("error");
          setDetail(
            hasTurn
              ? "The connection failed. One of you may be on a network that blocks video calls."
              : "The connection failed. This usually means a restrictive network — this deployment has no TURN relay configured, which is what gets through them."
          );
        } else if (state === "disconnected" && !leaving.current) {
          setPhase("connecting");
        }
      };

      async function drainIce() {
        for (const candidate of pendingIce.current.splice(0)) {
          await connection.addIceCandidate(candidate).catch(() => {});
        }
      }

      // 3. Signalling.
      const scheme = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(
        `${scheme}://${window.location.host}/ws/call?token=${encodeURIComponent(token)}`
      );
      ws.current = socket;

      socket.onopen = () => {
        if (!cancelled) setPhase("waiting");
      };

      socket.onclose = () => {
        if (!leaving.current && !cancelled) {
          setPhase((current) => (current === "connected" ? "peer-left" : current));
        }
      };

      socket.onerror = () => {
        if (!cancelled) {
          setPhase("error");
          setDetail("Lost the connection to the signalling server.");
        }
      };

      socket.onmessage = async (event) => {
        let message: Record<string, unknown>;
        try {
          message = JSON.parse(event.data as string);
        } catch {
          return;
        }

        switch (message.type) {
          case "joined": {
            setPhase(message.peer ? "connecting" : "waiting");
            break;
          }
          case "peer-joined": {
            // We were here first, so we make the offer.
            setPhase("connecting");
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            post({ type: "offer", sdp: connection.localDescription });
            break;
          }
          case "offer": {
            await connection.setRemoteDescription(
              new RTCSessionDescription(message.sdp as RTCSessionDescriptionInit)
            );
            await drainIce();
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            post({ type: "answer", sdp: connection.localDescription });
            break;
          }
          case "answer": {
            await connection.setRemoteDescription(
              new RTCSessionDescription(message.sdp as RTCSessionDescriptionInit)
            );
            await drainIce();
            break;
          }
          case "ice": {
            const candidate = message.candidate as RTCIceCandidateInit;
            if (connection.remoteDescription) {
              await connection.addIceCandidate(candidate).catch(() => {});
            } else {
              pendingIce.current.push(candidate);
            }
            break;
          }
          case "bye":
          case "peer-left": {
            if (remoteVideo.current) remoteVideo.current.srcObject = null;
            setPhase("peer-left");
            break;
          }
          case "full": {
            setPhase("error");
            setDetail("Two people are already in this call.");
            break;
          }
        }
      };
    }

    start();
    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------------------- timer */
  useEffect(() => {
    if (phase !== "connected") return;
    const id = setInterval(() => {
      if (startedAt.current) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ------------------------------------------------------------ controls */
  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const videoSender = () =>
    pc.current?.getSenders().find((s) => s.track?.kind === "video") ?? null;

  const stopSharing = useCallback(async () => {
    screenStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current = null;
    const camera = localStream.current?.getVideoTracks()[0];
    if (camera) await videoSender()?.replaceTrack(camera);
    if (localVideo.current) localVideo.current.srcObject = localStream.current;
    setSharing(false);
  }, []);

  const startSharing = async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStream.current = display;
      const track = display.getVideoTracks()[0];
      // replaceTrack swaps the outgoing video without renegotiating.
      await videoSender()?.replaceTrack(track);
      if (localVideo.current) localVideo.current.srcObject = display;
      track.onended = () => void stopSharing();
      setSharing(true);
    } catch {
      /* the picker was dismissed */
    }
  };

  const leave = () => {
    teardown();
    setPhase("ended");
  };

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const overrun = elapsed > durationMinutes * 60;

  /* ----------------------------------------------------------------- end */
  if (phase === "ended") {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="text-[2rem]">Call ended</h1>
        <p className="mt-3 leading-relaxed text-muted">
          You spoke for {mmss}. Credits only move once you{" "}
          <strong className="text-ink">both confirm</strong> the session happened.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/sessions" className="btn btn-primary btn-lg">
            Confirm this session
          </Link>
          <Link href={`/call/${sessionId}`} className="btn btn-ghost btn-lg">
            Rejoin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 py-5">
      {/* ------------------------------------------------------- stage --- */}
      <div
        className="relative flex-1 overflow-hidden rounded-2xl"
        style={{ background: "var(--c-ink-panel)", minHeight: "28rem" }}
      >
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="size-full object-cover"
          aria-label={`${peerName}'s camera`}
        />

        {phase !== "connected" ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <p
                className="font-display text-xl font-bold tracking-[-0.02em]"
                style={{ color: "var(--c-on-ink)" }}
              >
                {PHASE_COPY[phase]}
              </p>
              {detail ? (
                <p
                  className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
                  style={{ color: "var(--c-on-ink-muted)" }}
                >
                  {detail}
                </p>
              ) : null}
              {phase === "waiting" ? (
                <p
                  className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
                  style={{ color: "var(--c-on-ink-muted)" }}
                >
                  Leave this page open — {peerName.split(" ")[0]} joins from their own
                  dashboard.
                </p>
              ) : null}
              {phase === "peer-left" ? (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn btn-on-ink btn-sm" onClick={leave}>
                    End and confirm
                  </button>
                </div>
              ) : null}
              {phase === "no-media" ? (
                <button
                  type="button"
                  className="btn btn-on-ink btn-sm mt-6"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* self view */}
        <div
          className="absolute bottom-4 right-4 overflow-hidden rounded-xl border"
          style={{
            width: "min(13rem, 34vw)",
            aspectRatio: "16 / 10",
            borderColor: "rgb(255 255 255 / 0.22)",
            background: "#000",
          }}
        >
          <video
            ref={localVideo}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
            style={{ transform: sharing ? "none" : "scaleX(-1)" }}
            aria-label="Your camera"
          />
          {!camOn && !sharing ? (
            <div
              className="absolute inset-0 grid place-items-center text-xs font-semibold"
              style={{ background: "var(--c-ink-panel-2)", color: "var(--c-on-ink-muted)" }}
            >
              Camera off
            </div>
          ) : null}
        </div>

        {/* status strip */}
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <span
            className="pill"
            style={{ background: "rgb(0 0 0 / 0.45)", color: "var(--c-on-ink)" }}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{
                background:
                  phase === "connected" ? "var(--c-verify)" : "var(--c-credit-bright)",
              }}
            />
            {skillName} · {peerName}
          </span>
          {phase === "connected" ? (
            <span
              className="pill nums"
              style={{
                background: "rgb(0 0 0 / 0.45)",
                color: overrun ? "var(--c-credit-bright)" : "var(--c-on-ink)",
              }}
              title={`Booked for ${durationMinutes} minutes`}
            >
              {mmss} / {durationMinutes}:00
            </span>
          ) : null}
          {sharing ? (
            <span className="pill" style={{ background: "var(--c-brand)", color: "#fff" }}>
              Sharing your screen
            </span>
          ) : null}
        </div>
      </div>

      {/* ----------------------------------------------------- controls --- */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={toggleMic}
          className={`btn btn-sm ${micOn ? "btn-quiet" : "btn-danger"}`}
          aria-pressed={!micOn}
        >
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          type="button"
          onClick={toggleCam}
          className={`btn btn-sm ${camOn ? "btn-quiet" : "btn-danger"}`}
          aria-pressed={!camOn}
          disabled={sharing}
        >
          {camOn ? "Turn camera off" : "Turn camera on"}
        </button>
        <button
          type="button"
          onClick={sharing ? stopSharing : startSharing}
          className={`btn btn-sm ${sharing ? "btn-primary" : "btn-quiet"}`}
        >
          {sharing ? "Stop sharing" : "Share screen"}
        </button>
        <button type="button" onClick={leave} className="btn btn-danger btn-sm">
          Leave call
        </button>
      </div>

      <p className="text-center text-xs text-faint">
        Video goes directly between the two of you. SkillSwap passes the connection details
        and nothing else — no recording, no stored audio or video.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

function remainingFromExpiry(expiresAt: number, serverOffsetMs: number) {
  const estimatedServerNow = Date.now() + serverOffsetMs;
  return Math.max(Math.ceil((expiresAt - estimatedServerNow) / 1_000), 0);
}

export function useExamTimer({
  expiresAt,
  serverNow,
  active,
  onExpire,
}: {
  expiresAt: string;
  serverNow: string;
  active: boolean;
  onExpire: () => void;
}) {
  const expiresAtMs = new Date(expiresAt).getTime();
  const serverNowMs = new Date(serverNow).getTime();
  const [remainingSeconds, setRemainingSeconds] = useState(() => (
    Math.max(Math.ceil((expiresAtMs - serverNowMs) / 1_000), 0)
  ));
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!active || expiredRef.current) return;
    const serverOffsetMs = serverNowMs - Date.now();

    const update = () => {
      const remaining = remainingFromExpiry(expiresAtMs, serverOffsetMs);
      setRemainingSeconds(remaining);
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.setTimeout(() => onExpireRef.current(), 0);
      }
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [active, expiresAtMs, serverNowMs]);

  return remainingSeconds;
}

export function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

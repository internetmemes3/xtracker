"use client";

import { useEffect, useState } from "react";
import { getStreamStatus, type StreamStatus as Status } from "@/lib/api";
import { Activity, AlertTriangle, Wifi, WifiOff } from "lucide-react";

export default function StreamStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const s = await getStreamStatus();
        if (mounted) {
          setStatus(s);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError("Backend unreachable");
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        <WifiOff className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (!status) return null;

  const isWaiting = status.isRunning && status.waitingForRules;
  const isHealthy = status.isRunning && !status.waitingForRules && status.retryCount === 0;
  const isRetrying = status.isRunning && !status.waitingForRules && status.retryCount > 0;

  let color = "border-[#2f3336] bg-[#16181c] text-[#71767b]";
  if (isHealthy) color = "border-green-500/30 bg-green-500/10 text-green-400";
  else if (isRetrying) color = "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  else if (isWaiting) color = "border-blue-500/30 bg-blue-500/10 text-blue-400";

  let icon = <Activity className="h-4 w-4" />;
  if (isHealthy) icon = <Wifi className="h-4 w-4" />;
  else if (isRetrying) icon = <AlertTriangle className="h-4 w-4" />;

  let label = "Stream idle";
  if (isHealthy) label = "Stream connected";
  else if (isRetrying) label = `Reconnecting (attempt ${status.retryCount})`;
  else if (isWaiting) label = "Waiting for rules — add an account to start";

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { ConnectionState } from "../components/hud/ConnectionStatus";

/**
 * useConnectionStatus - Hook to monitor browser online/offline status
 *
 * Requirements: 37.6
 */
export function useConnectionStatus(): {
  isOnline: boolean;
  connectionState: ConnectionState;
} {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
    };
    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return (): void => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionState: isOnline ? "connected" : "offline",
  };
}

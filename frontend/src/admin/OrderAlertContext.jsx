import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api";

const OrderAlertContext = createContext(null);

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 15000];
const MUTE_STORAGE_KEY = "aaiji_admin_order_alerts_muted";

function wsUrl(path) {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}

// A short, dependency-free beep synthesized with the Web Audio API --
// avoids needing to source/ship a binary sound asset. Wrapped so it can
// never throw: browsers routinely block audio before any user gesture
// (section 10's "respect autoplay restrictions... no errors").
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    // audio blocked/unsupported -- silently skip, never break the page
  }
}

function showBrowserNotification(alert) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const n = new Notification("🔔 New Order Received", {
      body: `Order #${alert.order_id} — ${alert.customer_name} — ₹${alert.amount}`,
      tag: `order-${alert.order_id}`, // replaces any earlier notification for the same order instead of stacking
    });
    n.onclick = () => {
      window.focus();
      window.location.href = `/admin/orders/${alert.order_id}`;
    };
  } catch {
    // Notification API blocked/unsupported -- silently skip
  }
}

export function OrderAlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]); // unacknowledged new orders, newest first
  const [status, setStatus] = useState("connecting"); // connecting | live | reconnecting | disconnected
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const wsRef = useRef(null);
  const lastSeqRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const closedByUsRef = useRef(false);
  const seenOrderIdsRef = useRef(new Set());
  const mountedRef = useRef(true);

  const setMutedPersisted = useCallback((value) => {
    setMuted(value);
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
    } catch {
      // localStorage unavailable (private browsing etc.) -- preference just won't persist
    }
  }, []);

  const connect = useCallback(() => {
    closedByUsRef.current = false;
    setStatus((s) => (s === "disconnected" ? "reconnecting" : "connecting"));

    const ws = new WebSocket(wsUrl(`/api/admin/order-alerts/ws?since_seq=${lastSeqRef.current}`));
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("live");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.seq) lastSeqRef.current = Math.max(lastSeqRef.current, msg.seq);

      // Dedup: a reconnect replay or an already-known order should never
      // produce a second toast/sound/notification for the same order.
      if (seenOrderIdsRef.current.has(msg.order_id)) {
        setAlerts((prev) => (prev.some((a) => a.order_id === msg.order_id) ? prev : [msg, ...prev]));
        return;
      }
      seenOrderIdsRef.current.add(msg.order_id);
      setAlerts((prev) => [msg, ...prev]);

      if (!msg.replay) {
        // Only a genuinely NEW live arrival gets the toast/sound/browser
        // notification -- the initial replay-on-connect (already-existing
        // unacknowledged orders) populates the list silently.
        if (!muted) playBeep();
        showBrowserNotification(msg);
      }
    };

    ws.onclose = () => {
      if (closedByUsRef.current || !mountedRef.current) return;
      setStatus("reconnecting");
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    connect();
    return () => {
      mountedRef.current = false;
      closedByUsRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissAlert = useCallback(async (orderId) => {
    setAlerts((prev) => prev.filter((a) => a.order_id !== orderId));
    try {
      await api.post(`/admin/orders/${orderId}/acknowledge`);
    } catch {
      // best-effort -- the order still shows up in the Orders list regardless
    }
  }, []);

  return (
    <OrderAlertContext.Provider value={{ alerts, status, muted, setMuted: setMutedPersisted, dismissAlert }}>
      {children}
    </OrderAlertContext.Provider>
  );
}

export function useOrderAlerts() {
  const ctx = useContext(OrderAlertContext);
  if (!ctx) throw new Error("useOrderAlerts must be used within OrderAlertProvider");
  return ctx;
}

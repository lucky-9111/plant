import { TERMINAL_STATUSES, TRACKER_STEPS, statusLabel } from "../utils/orderStatus";

export default function OrderTracker({ status }) {
  if (TERMINAL_STATUSES.includes(status)) {
    return (
      <div className="alert alert-error" style={{ marginTop: 20 }}>
        This order was <strong>{status}</strong>.
      </div>
    );
  }

  const currentIndex = Math.max(0, TRACKER_STEPS.indexOf(status));
  const progressPct = (currentIndex / (TRACKER_STEPS.length - 1)) * 86;

  return (
    <div className="order-tracker-wrap">
      <div className="order-tracker">
        <div className="order-tracker-progress" style={{ "--progress": `${progressPct}%` }} />
        {TRACKER_STEPS.map((step, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "";
          return (
            <div key={step} className={`order-tracker-step ${state}`}>
              <span className="order-tracker-dot">{i < currentIndex ? "✓" : i + 1}</span>
              <span className="order-tracker-label">{statusLabel(step)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

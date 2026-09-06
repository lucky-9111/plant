import { useRef } from "react";

// A thin draggable divider between stacked chart panels. `onResize` is
// called with the pixel delta (positive = dragging down) while dragging;
// the panel itself owns clamping its height to a sane min/max.
export default function ResizeHandle({ onResize }) {
  const draggingRef = useRef(false);
  const lastYRef = useRef(0);

  function handleMouseDown(e) {
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(e) {
    if (!draggingRef.current) return;
    const delta = e.clientY - lastYRef.current;
    lastYRef.current = e.clientY;
    onResize(delta);
  }

  function handleMouseUp() {
    draggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        height: 5, cursor: "row-resize", background: "transparent", flexShrink: 0,
        borderTop: "1px solid #21262d",
      }}
      title="Drag to resize"
    />
  );
}

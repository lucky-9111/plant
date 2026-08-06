export default function Avatar({ name, src, size = 48 }) {
  if (src) {
    return (
      <img
        className="avatar"
        src={src}
        alt={name}
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="avatar avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

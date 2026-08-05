import { useSettings } from "../context/SettingsContext";

export default function WhatsAppButton() {
  const settings = useSettings();
  const number = settings.whatsapp;
  if (!number) return null;

  return (
    <a
      className="whatsapp-fab"
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
    >
      💬
    </a>
  );
}

import { useAuth } from "../context/AuthContext";
import AccessDenied from "./pages/AccessDenied";

// UX layer only -- hides a page the sidebar wouldn't have linked to anyway
// (e.g. a direct URL visit). The backend enforces the real boundary; this
// only avoids flashing a broken/empty page while that 403 comes back.
export default function RouteGuard({ module, action = "VIEW", children }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(module, action)) return <AccessDenied />;
  return children;
}

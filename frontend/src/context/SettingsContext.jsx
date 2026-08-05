import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get("/settings").then(setSettings).catch(() => setSettings({}));
  }, []);

  return (
    <SettingsContext.Provider value={settings || {}}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

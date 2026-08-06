import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title || "Aaiji Nursery";
    return () => {
      document.title = previous;
    };
  }, [title]);
}

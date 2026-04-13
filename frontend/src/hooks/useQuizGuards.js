import { useEffect } from "react";

export function useQuizGuards() {
  useEffect(() => {
    const preventContextMenu = (event) => {
      event.preventDefault();
    };
    const preventClipboard = (event) => {
      event.preventDefault();
    };
    const preventDevToolsShortcuts = (event) => {
      if (
        event.key === "F12" ||
        (event.ctrlKey &&
          event.shiftKey &&
          (event.key === "I" || event.key === "J" || event.key === "C")) ||
        (event.ctrlKey && event.key === "u")
      ) {
        event.preventDefault();
      }
    };
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventClipboard);
    document.addEventListener("cut", preventClipboard);
    document.addEventListener("paste", preventClipboard);
    document.addEventListener("keydown", preventDevToolsShortcuts);
    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventClipboard);
      document.removeEventListener("cut", preventClipboard);
      document.removeEventListener("paste", preventClipboard);
      document.removeEventListener("keydown", preventDevToolsShortcuts);
    };
  }, []);
}

import { Excalidraw } from "@excalidraw/excalidraw";
import { useRef, useEffect } from "react";

export default function App() {
  const apiRef = useRef(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // handle Ctrl+S from main process
    window.electronAPI.onTriggerSave(async () => {
      if (!apiRef.current) return;
      const elements = apiRef.current.getSceneElements();
      const appState = apiRef.current.getAppState();
      const data = JSON.stringify({ elements, appState }, null, 2);
      await window.electronAPI.saveFile(data);
    });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => (apiRef.current = api)}
      />
    </div>
  );
}
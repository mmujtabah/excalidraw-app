import { Excalidraw } from "@excalidraw/excalidraw";
import { useRef, useEffect } from "react";

export default function App() {
  const apiRef = useRef(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleSave = async () => {
      if (!apiRef.current) return;
      const elements = apiRef.current.getSceneElements();
      const appState = apiRef.current.getAppState();
      const data = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "excalidraw-app",
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
      });
      await window.electronAPI.saveFile(data);
    };

    const handleOpen = async () => {
      if (!apiRef.current) return;
      const data = await window.electronAPI.openFile();
      if (!data) return;
      const parsed = JSON.parse(data);
      apiRef.current.updateScene({
        elements: parsed.elements,
        appState: parsed.appState,
      });
    };

    window.electronAPI.onTriggerSave(handleSave);
    window.electronAPI.onTriggerOpen(handleOpen);

    // cleanup to prevent duplicate listeners
    return () => {
      window.electronAPI.removeSaveListener(handleSave);
      window.electronAPI.removeOpenListener(handleOpen);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw excalidrawAPI={(api) => (apiRef.current = api)} />
    </div>
  );
}
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { useRef, useEffect } from "react";

export default function App() {
  const apiRef = useRef(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onTriggerSave(async () => {
      if (!apiRef.current) return;
      const elements = apiRef.current.getSceneElements();
      const appState = apiRef.current.getAppState();
      const data = JSON.stringify({ elements, appState }, null, 2);
      await window.electronAPI.saveFile(data);
    });
  }, []);

  const handleExportPNG = async () => {
    if (!apiRef.current || !window.electronAPI) return;
    const elements = apiRef.current.getSceneElements();
    const appState = apiRef.current.getAppState();
    const blob = await exportToBlob({ elements, appState, mimeType: "image/png" });
    const reader = new FileReader();
    reader.onload = async () => {
      await window.electronAPI.saveImage(reader.result, "png");
    };
    reader.readAsDataURL(blob);
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => (apiRef.current = api)}
        renderTopRightUI={() => (
          <button
            onClick={handleExportPNG}
            style={{
              padding: "6px 12px",
              background: "#6965db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Export PNG
          </button>
        )}
      />
    </div>
  );
}
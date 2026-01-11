import { ReactNode, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export type PanelLocation =
  | "top"
  | "bottom"
  | "topLeft"
  | "bottomLeft"
  | "topRight"
  | "bottomRight";

interface PanelLayoutProps {
  top?: ReactNode;
  bottom?: ReactNode;
  topLeft?: ReactNode;
  bottomLeft?: ReactNode;
  topRight?: ReactNode;
  bottomRight?: ReactNode;
  children: ReactNode; // Canvas area
  onPanelDrop: (panelId: string, location: PanelLocation) => void;
}

export function PanelLayout({
  top,
  bottom,
  topLeft,
  bottomLeft,
  topRight,
  bottomRight,
  children,
  onPanelDrop,
}: PanelLayoutProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("text/plain")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (location: PanelLocation) => (e: React.DragEvent) => {
    e.preventDefault();
    const panelId = e.dataTransfer.getData("text/plain");
    if (panelId) {
      onPanelDrop(panelId, location);
    }
    setIsDragging(false);
    dragCounter.current = 0;
  };

  // Helper to check if a side has any content
  const hasLeft = !!topLeft || !!bottomLeft;
  const hasRight = !!topRight || !!bottomRight;
  const hasTop = !!top;
  const hasBottom = !!bottom;

  return (
    <div
      className="relative h-full w-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => {
        setIsDragging(false);
        dragCounter.current = 0;
      }}
    >
      <PanelGroup direction="vertical" className="h-full">
        {/* TOP PANEL */}
        {hasTop && (
          <>
            <Panel
              defaultSize={20}
              minSize={15}
              maxSize={40}
              className="relative"
            >
              <div className="h-full w-full relative">{top}</div>
            </Panel>
            <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-sky-500 cursor-row-resize" />
          </>
        )}

        {/* MIDDLE SECTION (Horizontal: Left - Center - Right) */}
        <Panel className="flex-1 relative">
          <PanelGroup
            direction="horizontal"
            className="flex h-full element-drop-container"
          >
            {/* Left Column */}
            {hasLeft && (
              <>
                <Panel
                  defaultSize={20}
                  minSize={15}
                  maxSize={40}
                  className="relative flex flex-col"
                >
                  <PanelGroup direction="vertical">
                    {/* Top/First Panel */}
                    {(topLeft || bottomLeft) && (
                      <Panel
                        defaultSize={topLeft && bottomLeft ? 50 : 100}
                        className="relative"
                      >
                        <div className="h-full w-full relative">
                          {topLeft || bottomLeft}
                        </div>
                      </Panel>
                    )}

                    {/* Resize Handle if both exist */}
                    {topLeft && bottomLeft && (
                      <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-sky-500 cursor-row-resize" />
                    )}

                    {/* Bottom Panel - only if both exist */}
                    {topLeft && bottomLeft && (
                      <Panel defaultSize={50} className="relative">
                        <div className="h-full w-full relative">
                          {bottomLeft}
                        </div>
                      </Panel>
                    )}
                  </PanelGroup>
                </Panel>
                <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-sky-500 transition-colors cursor-col-resize" />
              </>
            )}

            {/* Center Canvas */}
            <Panel className="relative flex-1">
              <div className="relative h-full w-full">{children}</div>
            </Panel>

            {/* Right Column */}
            {hasRight && (
              <>
                <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-sky-500 transition-colors cursor-col-resize" />
                <Panel
                  defaultSize={20}
                  minSize={15}
                  maxSize={40}
                  className="relative flex flex-col"
                >
                  <PanelGroup direction="vertical">
                    {(topRight || bottomRight) && (
                      <Panel
                        defaultSize={topRight && bottomRight ? 50 : 100}
                        className="relative"
                      >
                        <div className="h-full w-full relative">
                          {topRight || bottomRight}
                        </div>
                      </Panel>
                    )}

                    {topRight && bottomRight && (
                      <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-sky-500 cursor-row-resize" />
                    )}

                    {topRight && bottomRight && (
                      <Panel defaultSize={50} className="relative">
                        <div className="h-full w-full relative">
                          {bottomRight}
                        </div>
                      </Panel>
                    )}
                  </PanelGroup>
                </Panel>
              </>
            )}
          </PanelGroup>
        </Panel>

        {/* BOTTOM PANEL */}
        {hasBottom && (
          <>
            <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-sky-500 cursor-row-resize" />
            <Panel
              defaultSize={20}
              minSize={15}
              maxSize={40}
              className="relative"
            >
              <div className="h-full w-full relative">{bottom}</div>
            </Panel>
          </>
        )}
      </PanelGroup>

      {/* Drop Overlays */}
      {isDragging && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col">
          {/* Top Zone - 10% */}
          <div
            className="h-[10%] w-full flex pointer-events-auto bg-sky-500/10 border-b-2 border-dashed border-sky-400 hover:bg-sky-500/30 transition-colors items-center justify-center text-white/50 font-bold"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleDrop("top")}
          >
            Top
          </div>

          {/* Middle Section - 80% */}
          <div className="flex-1 flex w-full">
            {/* Left Zone - 20% */}
            <div className="w-1/5 h-full flex flex-col pointer-events-auto">
              <div
                className="flex-1 bg-sky-500/10 border-r-2 border-b-2 border-dashed border-sky-400 hover:bg-sky-500/30 transition-colors flex items-center justify-center text-white/50 font-bold"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={handleDrop("topLeft")}
              >
                Top Left
              </div>
              <div
                className="flex-1 bg-sky-500/10 border-r-2 border-t-2 border-dashed border-sky-400 hover:bg-sky-500/30 transition-colors flex items-center justify-center text-white/50 font-bold"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={handleDrop("bottomLeft")}
              >
                Bottom Left
              </div>
            </div>

            {/* Center Spacer */}
            <div className="flex-1" />

            {/* Right Zone - 20% */}
            <div className="w-1/5 h-full flex flex-col pointer-events-auto">
              <div
                className="flex-1 bg-sky-500/10 border-l-2 border-b-2 border-dashed border-sky-400 hover:bg-sky-500/30 transition-colors flex items-center justify-center text-white/50 font-bold"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={handleDrop("topRight")}
              >
                Top Right
              </div>
              <div
                className="flex-1 bg-sky-500/10 border-l-2 border-t-2 border-dashed border-sky-400 hover:bg-sky-500/30 transition-colors flex items-center justify-center text-white/50 font-bold"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={handleDrop("bottomRight")}
              >
                Bottom Right
              </div>
            </div>
          </div>

          {/* Bottom Zone - 10% */}
          <div
            className="h-[10%] w-full flex pointer-events-auto bg-sky-500/10 border-t-2 border-dashed border-sky-400 hover:bg-sky-500/30 transition-colors items-center justify-center text-white/50 font-bold"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleDrop("bottom")}
          >
            Bottom
          </div>
        </div>
      )}
    </div>
  );
}

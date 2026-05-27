import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Brush,
  Eraser,
  Pipette,
  RotateCcw,
  Download,
  PaintBucket,
  FilePlus2,
  Save,
  Upload,
  Slash,
  Square,
  Move,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const DEFAULT_BRUSH_SIZES = [1, 4, 8, 14, 24];
const OPACITY_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const CANVAS_PRESETS = [
  { label: "Gartic 4:3", width: 1200, height: 900 },
  { label: "Small 4:3", width: 800, height: 600 },
  { label: "Square", width: 1080, height: 1080 },
  { label: "HD wide", width: 1920, height: 1080 },
  { label: "Portrait", width: 900, height: 1200 },
];
const SWATCHES = [
  "#000000", "#ffffff", "#7a7a7a", "#c9c9c9",
  "#d94c4c", "#f28c28", "#ffd447", "#7ed957",
  "#3bc7a5", "#4ba3ff", "#6f5cff", "#d85cff",
];

const PAPER_SWATCHES = [
  "#ffffff", "#f6f0e4", "#efe7d2", "#e4d8bf",
  "#dadada", "#c9c9c9", "#111111",
];

const DEFAULT_SHORTCUTS = {
  brush: "b",
  eraser: "e",
  fill: "g",
  line: "l",
  rectangle: "u",
  picker: "x",
  pan: "h",
  canvasMask: "f",
  canvasMaskMove: "m",
  reference: "r",
};

const SHORTCUT_LABELS = {
  brush: "Brush",
  eraser: "Eraser",
  fill: "Fill",
  line: "Line",
  rectangle: "Rectangle",
  picker: "Color picker",
  pan: "Move / pan",
  canvasMask: "Canvas mask",
  canvasMaskMove: "Move canvas mask",
  reference: "Reference",
};


const APP_THEMES = [
  {
    id: "soft",
    label: "Soft grey",
    appBg: "#f4f4f5",
    panelBg: "#ffffff",
    panelBorder: "#e4e4e7",
    text: "#09090b",
    muted: "#71717a",
    accent: "#18181b",
    accentText: "#ffffff",
  },
  {
    id: "midnight",
    label: "Midnight",
    appBg: "#0f1020",
    panelBg: "#181a2e",
    panelBorder: "#2f3355",
    text: "#f4f4f5",
    muted: "#a1a1aa",
    accent: "#7c3aed",
    accentText: "#ffffff",
  },
  {
    id: "purple",
    label: "Purple dusk",
    appBg: "#21162d",
    panelBg: "#2f2140",
    panelBorder: "#5b3b73",
    text: "#f8f3ff",
    muted: "#c7b5d9",
    accent: "#c084fc",
    accentText: "#1f102e",
  },
  {
    id: "warm",
    label: "Warm paper",
    appBg: "#eee3d1",
    panelBg: "#fff9ef",
    panelBorder: "#d9c7ad",
    text: "#24160b",
    muted: "#7c6754",
    accent: "#8b5e34",
    accentText: "#fff8ef",
  },
  {
    id: "ocean",
    label: "Deep ocean",
    appBg: "#071b22",
    panelBg: "#0d2b35",
    panelBorder: "#1f5261",
    text: "#ecfeff",
    muted: "#9bd4dd",
    accent: "#22d3ee",
    accentText: "#06242b",
  },
  {
    id: "rose",
    label: "Dusty rose",
    appBg: "#2b1720",
    panelBg: "#3a202b",
    panelBorder: "#704254",
    text: "#fff1f2",
    muted: "#e7b8c4",
    accent: "#fb7185",
    accentText: "#2b0d16",
  },
];


function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((part) => part + part).join("")
    : clean.padEnd(6, "0").slice(0, 6);

  return {
    r: parseInt(value.slice(0, 2), 16) || 0,
    g: parseInt(value.slice(2, 4), 16) || 0,
    b: parseInt(value.slice(4, 6), 16) || 0,
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4)));
}

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function clampCanvasNumber(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(100, Math.min(6000, Math.round(number)));
}

function IconButton({ active, children, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-11 w-11 rounded-2xl border flex items-center justify-center transition shadow-sm ${
        active
          ? "bg-zinc-900 text-white border-zinc-900"
          : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function GarticStyleDrawingApp() {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const mainRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const referenceImageBoxRef = useRef(null);
  const projectInputRef = useRef(null);
  const referenceInputRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const undoStackRef = useRef([]);
  const sizeIndexRef = useRef(1);
  const strokeBaseCanvasRef = useRef(null);
  const strokeLayerRef = useRef(null);
  const pendingLoadedProjectRef = useRef(null);
  const focusDragRef = useRef(null);
  const referencePanelDragRef = useRef(null);
  const referenceMaskDragRef = useRef(null);
  const nextSettingsPaperColorRef = useRef(null);
  const shapeStartRef = useRef(null);
  const panDragRef = useRef(null);

  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#000000");
  const [brushPresets, setBrushPresets] = useState(DEFAULT_BRUSH_SIZES);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [customBrushSize, setCustomBrushSize] = useState("");
  const [opacity, setOpacity] = useState(10);
  const [hue, setHue] = useState(0);
  const [lightness, setLightness] = useState(50);
  const [paperColor, setPaperColor] = useState("#ffffff");
  const [showGrid, setShowGrid] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 900 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [draftWidth, setDraftWidth] = useState(1200);
  const [draftHeight, setDraftHeight] = useState(900);
  const [status, setStatus] = useState("Unsaved sketch");
  const [loadToken, setLoadToken] = useState(0);
  const [themeId, setThemeId] = useState("soft");
  const [showThemes, setShowThemes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [focusMaskEnabled, setFocusMaskEnabled] = useState(false);
  const [focusMoveMode, setFocusMoveMode] = useState(false);
  const [focusRect, setFocusRect] = useState({ x: 300, y: 220, width: 450, height: 340 });
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageAspect, setReferenceImageAspect] = useState(1);
  const [referenceVisible, setReferenceVisible] = useState(false);
  const [referencePanel, setReferencePanel] = useState({ x: 360, y: 80, width: 360, height: 300 });
  const [referenceZoom, setReferenceZoom] = useState(1);
  const [referenceMaskEnabled, setReferenceMaskEnabled] = useState(false);
  const [referenceMaskMoveMode, setReferenceMaskMoveMode] = useState(false);
  const [referenceMaskRect, setReferenceMaskRect] = useState({ x: 25, y: 20, width: 50, height: 55 });
  const [sharedMaskSize, setSharedMaskSize] = useState({ width: 290, height: 190 });
  const [canvasMaskPos, setCanvasMaskPos] = useState({ x: 140, y: 110 });
  const [referenceMaskPos, setReferenceMaskPos] = useState({ x: 70, y: 60 });

  const activeSize = brushPresets[sizeIndex] || brushPresets[0] || DEFAULT_BRUSH_SIZES[0];
  const theme = APP_THEMES.find((item) => item.id === themeId) || APP_THEMES[0];

  function setBrushSizeIndex(index) {
    const nextIndex = Math.max(0, Math.min(brushPresets.length - 1, index));
    sizeIndexRef.current = nextIndex;
    setSizeIndex(nextIndex);
  }

  function addBrushPreset() {
    const nextSize = Math.max(1, Math.min(200, Math.round(Number(customBrushSize))));
    if (!Number.isFinite(nextSize)) return;

    const nextPresets = Array.from(new Set([...brushPresets, nextSize])).sort((a, b) => a - b);
    const nextIndex = nextPresets.indexOf(nextSize);

    setBrushPresets(nextPresets);
    sizeIndexRef.current = nextIndex;
    setSizeIndex(nextIndex);
    setCustomBrushSize("");
    setStatus(`Added brush size ${nextSize}px`);
  }

  function removeBrushPreset(indexToRemove) {
    if (brushPresets.length <= 1) {
      setStatus("Keep at least one brush preset");
      return;
    }

    const removedSize = brushPresets[indexToRemove];
    const nextPresets = brushPresets.filter((_, index) => index !== indexToRemove);
    const nextIndex = Math.max(
      0,
      Math.min(
        nextPresets.length - 1,
        sizeIndexRef.current > indexToRemove
          ? sizeIndexRef.current - 1
          : sizeIndexRef.current === indexToRemove
            ? Math.max(0, indexToRemove - 1)
            : sizeIndexRef.current
      )
    );

    setBrushPresets(nextPresets);
    sizeIndexRef.current = nextIndex;
    setSizeIndex(nextIndex);
    setStatus(`Removed brush size ${removedSize}px`);
  }

  function getActiveBrushSize() {
    return brushPresets[sizeIndexRef.current] || brushPresets[0] || DEFAULT_BRUSH_SIZES[0];
  }

  function shortcutKey(action) {
    return String(shortcuts[action] || DEFAULT_SHORTCUTS[action] || "").toLowerCase();
  }

  function shortcutLabel(action) {
    const key = shortcutKey(action);
    return key ? key.toUpperCase() : "—";
  }

  function updateShortcut(action, value) {
    const clean = String(value || "").trim().toLowerCase().slice(0, 1);
    setShortcuts((current) => ({ ...current, [action]: clean }));
  }

  function setZoomValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setCanvasZoom(Math.max(0.25, Math.min(6, number)));
  }

  function zoomIn() {
    setCanvasZoom((zoom) => Math.min(6, Math.round((zoom + 0.25) * 100) / 100));
  }

  function zoomOut() {
    setCanvasZoom((zoom) => Math.max(0.25, Math.round((zoom - 0.25) * 100) / 100));
  }

  function setReferenceZoomValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setReferenceZoom(Math.max(0.25, Math.min(6, number)));
  }

  function zoomReferenceIn() {
    setReferenceZoom((zoom) => Math.min(6, Math.round((zoom + 0.25) * 100) / 100));
  }

  function zoomReferenceOut() {
    setReferenceZoom((zoom) => Math.max(0.25, Math.round((zoom - 0.25) * 100) / 100));
  }

  function clampCanvasMaskPos(pos) {
    const display = canvasWrapRef.current?.getBoundingClientRect();
    if (!display) return { x: Math.max(0, Math.round(pos.x)), y: Math.max(0, Math.round(pos.y)) };
    return {
      x: Math.max(0, Math.min(Math.max(0, display.width - sharedMaskSize.width), Math.round(pos.x))),
      y: Math.max(0, Math.min(Math.max(0, display.height - sharedMaskSize.height), Math.round(pos.y))),
    };
  }

  function clampReferenceMaskPos(pos) {
    const box = referenceImageBoxRef.current?.getBoundingClientRect();
    if (!box) return { x: Math.max(0, Math.round(pos.x)), y: Math.max(0, Math.round(pos.y)) };
    return {
      x: Math.max(0, Math.min(Math.max(0, box.width - sharedMaskSize.width), Math.round(pos.x))),
      y: Math.max(0, Math.min(Math.max(0, box.height - sharedMaskSize.height), Math.round(pos.y))),
    };
  }

  function nudgeCanvasMask(dx, dy) {
    setCanvasMaskPos((pos) => clampCanvasMaskPos({ x: pos.x + dx, y: pos.y + dy }));
  }

  function nudgeReferenceMaskViewport(dx, dy) {
    setReferenceMaskPos((pos) => clampReferenceMaskPos({ x: pos.x + dx, y: pos.y + dy }));
  }

  function setSharedMaskSizeValue(field, value) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return;
    setSharedMaskSize((size) => ({
      ...size,
      [field]: Math.max(20, Math.min(1200, number)),
    }));
  }

  function getCanvasSnapshot() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function restoreCanvasSnapshot(snapshot) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(snapshot, 0, 0);
  }

  function colorsAreClose(data, index, target, tolerance = 32) {
    return (
      Math.abs(data[index] - target.r) <= tolerance &&
      Math.abs(data[index + 1] - target.g) <= tolerance &&
      Math.abs(data[index + 2] - target.b) <= tolerance &&
      Math.abs(data[index + 3] - target.a) <= tolerance
    );
  }

  function blendChannel(base, paint, alpha) {
    return Math.round(paint * alpha + base * (1 - alpha));
  }

  function compositeChannel(top, topAlpha, bottom) {
    return Math.round(top * topAlpha + bottom * (1 - topAlpha));
  }

  function compositePixelOverPaper(pixel) {
    const paper = hexToRgb(paperColor);
    const alpha = pixel[3] / 255;

    return {
      r: compositeChannel(pixel[0], alpha, paper.r),
      g: compositeChannel(pixel[1], alpha, paper.g),
      b: compositeChannel(pixel[2], alpha, paper.b),
    };
  }

  function composeExportCanvas() {
    const canvas = canvasRef.current;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const ctx = exportCanvas.getContext("2d");
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    return exportCanvas;
  }

  function floodFill(point) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const startX = Math.floor(point.x);
    const startY = Math.floor(point.y);

    if (startX < 0 || startY < 0 || startX >= width || startY >= height) return false;

    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const startIndex = (startY * width + startX) * 4;
    const target = {
      r: data[startIndex],
      g: data[startIndex + 1],
      b: data[startIndex + 2],
      a: data[startIndex + 3],
    };

    const paint = hexToRgb(color);
    const paintAlpha = opacity / 100;
    const visited = new Uint8Array(width * height);
    const stack = [[startX, startY]];
    let changed = 0;

    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= width || y >= height) continue;

      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) continue;
      visited[pixelIndex] = 1;

      const dataIndex = pixelIndex * 4;
      if (!colorsAreClose(data, dataIndex, target)) continue;

      const baseAlpha = data[dataIndex + 3] / 255;
      const outAlpha = paintAlpha + baseAlpha * (1 - paintAlpha);

      if (outAlpha <= 0) {
        data[dataIndex] = 0;
        data[dataIndex + 1] = 0;
        data[dataIndex + 2] = 0;
        data[dataIndex + 3] = 0;
      } else {
        data[dataIndex] = Math.round((paint.r * paintAlpha + data[dataIndex] * baseAlpha * (1 - paintAlpha)) / outAlpha);
        data[dataIndex + 1] = Math.round((paint.g * paintAlpha + data[dataIndex + 1] * baseAlpha * (1 - paintAlpha)) / outAlpha);
        data[dataIndex + 2] = Math.round((paint.b * paintAlpha + data[dataIndex + 2] * baseAlpha * (1 - paintAlpha)) / outAlpha);
        data[dataIndex + 3] = Math.round(outAlpha * 255);
      }

      changed++;

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    if (changed > 0) {
      ctx.putImageData(image, 0, 0);
      return true;
    }

    return false;
  }

  function clampFocusRect(rect, size = canvasSize) {
    const width = Math.max(60, Math.min(size.width, Math.round(rect.width)));
    const height = Math.max(60, Math.min(size.height, Math.round(rect.height)));
    const x = Math.max(0, Math.min(size.width - width, Math.round(rect.x)));
    const y = Math.max(0, Math.min(size.height - height, Math.round(rect.y)));
    return { x, y, width, height };
  }

  function nudgeFocusRect(dx, dy) {
    setFocusRect((rect) => clampFocusRect({ ...rect, x: rect.x + dx, y: rect.y + dy }));
  }

  function resizeFocusRect(dw, dh) {
    setFocusRect((rect) => clampFocusRect({ ...rect, width: rect.width + dw, height: rect.height + dh }));
  }

  function clampPercentRect(rect) {
    const width = Math.max(8, Math.min(100, Number(rect.width)));
    const height = Math.max(8, Math.min(100, Number(rect.height)));
    const x = Math.max(0, Math.min(100 - width, Number(rect.x)));
    const y = Math.max(0, Math.min(100 - height, Number(rect.y)));
    return { x, y, width, height };
  }

  function nudgeReferenceMask(dx, dy) {
    setReferenceMaskRect((rect) => clampPercentRect({ ...rect, x: rect.x + dx, y: rect.y + dy }));
  }

  function resizeReferenceMask(dw, dh) {
    setReferenceMaskRect((rect) => clampPercentRect({ ...rect, width: rect.width + dw, height: rect.height + dh }));
  }

  function resizeReferencePanel(dw, dh) {
    setReferencePanel((panel) => ({
      ...panel,
      width: Math.max(180, Math.min(900, panel.width + dw)),
      height: Math.max(140, Math.min(760, panel.height + dh)),
    }));
  }

  function matchReferenceMaskToCanvasMask() {
    setReferenceMaskPos(clampReferenceMaskPos(canvasMaskPos));
  }


  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const ctx = canvas.getContext("2d");
    const pendingProject = pendingLoadedProjectRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pendingProject?.imageData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        undoStackRef.current = [getCanvasSnapshot()]
        setStatus("Project loaded");
        nextSettingsPaperColorRef.current = null;
      };
      img.src = pendingProject.imageData;
      pendingLoadedProjectRef.current = null;
    } else {
      undoStackRef.current = [getCanvasSnapshot()]
      setStatus(`New canvas · ${canvas.width} × ${canvas.height}`);
    }

    const overlayCtx = overlay.getContext("2d");
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  }, [canvasSize.width, canvasSize.height, loadToken]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;

      if (/^[1-9]$/.test(event.key)) {
        const nextIndex = Number(event.key) - 1;
        if (nextIndex < brushPresets.length) {
          setBrushSizeIndex(nextIndex);
        }
      }

      const key = event.key.toLowerCase();

      if (key === shortcutKey("brush")) setTool("brush");
      if (key === shortcutKey("eraser")) setTool("eraser");
      if (key === shortcutKey("picker")) setTool("picker");
      if (key === shortcutKey("fill")) setTool("fill");
      if (key === shortcutKey("line")) setTool("line");
      if (key === shortcutKey("rectangle")) setTool("rectangle");
      if (key === shortcutKey("pan")) setTool("pan");
      if (key === shortcutKey("canvasMask")) setFocusMaskEnabled((enabled) => !enabled);
      if (key === shortcutKey("canvasMaskMove")) setFocusMoveMode((enabled) => !enabled);
      if (key === shortcutKey("reference") && referenceImage) setReferenceVisible((visible) => !visible);
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
      }
      if (event.key === "-") {
        event.preventDefault();
        zoomOut();
      }
      if (event.key === "0") {
        event.preventDefault();
        setZoomValue(1);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveProjectFile();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canvasSize, color, opacity, sizeIndex, tool, showGrid, paperColor, shortcuts, referenceImage, brushPresets]);

  function saveUndoState() {
    undoStackRef.current.push(getCanvasSnapshot());
    if (undoStackRef.current.length > 25) undoStackRef.current.shift();
    setStatus("Unsaved changes");
  }

  function undo() {
    if (undoStackRef.current.length <= 1) return;

    undoStackRef.current.pop();
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    restoreCanvasSnapshot(previous);
    setStatus("Unsaved changes");
  }

  function prepareStrokeLayer() {
    const canvas = canvasRef.current;
    const baseCanvas = document.createElement("canvas");
    const strokeLayer = document.createElement("canvas");

    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
    strokeLayer.width = canvas.width;
    strokeLayer.height = canvas.height;

    baseCanvas.getContext("2d").drawImage(canvas, 0, 0);
    strokeBaseCanvasRef.current = baseCanvas;
    strokeLayerRef.current = strokeLayer;
  }

  function redrawCanvasWithStrokeLayer() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const baseCanvas = strokeBaseCanvasRef.current;
    const strokeLayer = strokeLayerRef.current;

    if (!baseCanvas || !strokeLayer) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.save();

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.drawImage(strokeLayer, 0, 0);
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = opacity / 100;
      ctx.drawImage(strokeLayer, 0, 0);
    }

    ctx.restore();
  }

  function beginStroke(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const canvas = canvasRef.current;
    const point = getCanvasPoint(canvas, event);

    if (tool === "pan") {
      const main = mainRef.current;
      if (main) {
        panDragRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          scrollLeft: main.scrollLeft,
          scrollTop: main.scrollTop,
        };
        setStatus("Move tool · drag canvas area to pan");
      }
      return;
    }

    if (tool === "picker") {
      const ctx = canvas.getContext("2d");
      const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
      const visible = compositePixelOverPaper(pixel);
      setColor(rgbToHex(visible.r, visible.g, visible.b));
      setTool("brush");
      return;
    }

    if (tool === "fill") {
      const beforeFill = getCanvasSnapshot();
      const changed = floodFill(point);
      if (changed) {
        undoStackRef.current.push(beforeFill);
        if (undoStackRef.current.length > 25) undoStackRef.current.shift();
      }
      setStatus(changed ? "Filled area" : "Fill made no visible change");
      return;
    }

    drawingRef.current = true;
    lastPointRef.current = point;
    shapeStartRef.current = point;
    prepareStrokeLayer();

    if (tool === "line" || tool === "rectangle") {
      drawShapePreview(point);
      return;
    }

    drawDot(point);
  }

  function drawDot(point) {
    const strokeLayer = strokeLayerRef.current;
    if (!strokeLayer) return;

    const ctx = strokeLayer.getContext("2d");
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = tool === "eraser" ? "#000000" : color;
    const brushSize = getActiveBrushSize();
    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    redrawCanvasWithStrokeLayer();
  }

  function drawShapePreview(point) {
    const strokeLayer = strokeLayerRef.current;
    const start = shapeStartRef.current;
    if (!strokeLayer || !start) return;

    const ctx = strokeLayer.getContext("2d");
    ctx.clearRect(0, 0, strokeLayer.width, strokeLayer.height);
    ctx.save();
    ctx.globalAlpha = 1;

    if (tool === "line") {
      ctx.strokeStyle = color;
      ctx.lineWidth = getActiveBrushSize();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    if (tool === "rectangle") {
      const left = Math.min(start.x, point.x);
      const top = Math.min(start.y, point.y);
      const width = Math.abs(point.x - start.x);
      const height = Math.abs(point.y - start.y);
      ctx.fillStyle = color;
      ctx.fillRect(left, top, width, height);
    }

    ctx.restore();
    redrawCanvasWithStrokeLayer();
  }

  function continueStroke(event) {
    const canvas = canvasRef.current;

    if (tool === "pan" && panDragRef.current) {
      const main = mainRef.current;
      if (main) {
        main.scrollLeft = panDragRef.current.scrollLeft - (event.clientX - panDragRef.current.startX);
        main.scrollTop = panDragRef.current.scrollTop - (event.clientY - panDragRef.current.startY);
      }
      clearCursor();
      return;
    }

    const point = getCanvasPoint(canvas, event);
    drawCursor(point);

    if (!drawingRef.current || !lastPointRef.current || !strokeLayerRef.current) return;

    if (tool === "line" || tool === "rectangle") {
      drawShapePreview(point);
      return;
    }

    const strokeLayer = strokeLayerRef.current;
    const ctx = strokeLayer.getContext("2d");
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = tool === "eraser" ? "#000000" : color;
    ctx.lineWidth = getActiveBrushSize();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();

    redrawCanvasWithStrokeLayer();
    lastPointRef.current = point;
  }

  function endStroke(event) {
    if (drawingRef.current) saveUndoState();
    drawingRef.current = false;
    panDragRef.current = null;
    lastPointRef.current = null;
    shapeStartRef.current = null;
    strokeBaseCanvasRef.current = null;
    strokeLayerRef.current = null;

    if (event?.currentTarget?.releasePointerCapture && event.pointerId !== undefined) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released by the browser.
      }
    }
  }

  function drawCursor(point) {
    const overlay = overlayRef.current;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (tool === "pan") return;
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = 1;
    const brushSize = getActiveBrushSize();
    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function clearCursor() {
    const overlay = overlayRef.current;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveUndoState();
  }

  function createNewCanvas(width = draftWidth, height = draftHeight) {
    const nextWidth = clampCanvasNumber(width, canvasSize.width);
    const nextHeight = clampCanvasNumber(height, canvasSize.height);
    setDraftWidth(nextWidth);
    setDraftHeight(nextHeight);
    nextSettingsPaperColorRef.current = null;
    setCanvasSize({ width: nextWidth, height: nextHeight });
    drawingRef.current = false;
    panDragRef.current = null;
    lastPointRef.current = null;
    shapeStartRef.current = null;
    strokeBaseCanvasRef.current = null;
    strokeLayerRef.current = null;
  }

  async function saveBlobAsFile(blob, filename, pickerOptions) {
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          ...pickerOptions,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      }
    } catch (error) {
      if (error?.name === "AbortError") return false;
    }

    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1500);
      return true;
    } catch {
      return false;
    }
  }

  function downloadPng() {
    const canvas = composeExportCanvas();
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setStatus("PNG export failed");
        return;
      }

      const didSave = await saveBlobAsFile(blob, "shadepad-drawing.png", {
        types: [
          {
            description: "PNG image",
            accept: { "image/png": [".png"] },
          },
        ],
      });

      setStatus(didSave ? "PNG exported" : "PNG export cancelled or blocked");
    }, "image/png");
  }

  async function saveProjectFile() {
    const canvas = canvasRef.current;
    const project = {
      app: "shadepad",
      version: 1,
      savedAt: new Date().toISOString(),
      width: canvas.width,
      height: canvas.height,
      imageData: canvas.toDataURL("image/png"),
      settings: {
        tool,
        color,
        brushPresets,
        sizeIndex,
        opacity,
        hue,
        lightness,
        paperColor,
        showGrid,
        focusMaskEnabled,
        focusMoveMode,
        focusRect,
        referenceMaskEnabled,
        referenceMaskMoveMode,
        referenceMaskRect,
        referencePanel,
        themeId,
        shortcuts,
      },
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const didSave = await saveBlobAsFile(blob, "shadepad-project.shadepad.json", {
      types: [
        {
          description: "Shadepad project file",
          accept: { "application/json": [".json"] },
        },
      ],
    });

    setStatus(didSave ? "Project file saved" : "Project save cancelled or blocked");
  }

  async function loadProjectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const project = JSON.parse(text);

      if (!project.imageData || !project.width || !project.height) {
        setStatus("Could not load project file");
        return;
      }

      const nextWidth = clampCanvasNumber(project.width, 1200);
      const nextHeight = clampCanvasNumber(project.height, 900);
      const nextSettings = project.settings || {};

      const nextBrushPresets =
        Array.isArray(nextSettings.brushPresets) && nextSettings.brushPresets.length
          ? Array.from(
              new Set(
                nextSettings.brushPresets
                  .map((value) => Math.max(1, Math.min(200, Math.round(Number(value)))))
                  .filter((value) => Number.isFinite(value))
              )
            ).sort((a, b) => a - b)
          : DEFAULT_BRUSH_SIZES;
      const nextSizeIndex = Math.max(
        0,
        Math.min(nextBrushPresets.length - 1, Number.isInteger(nextSettings.sizeIndex) ? nextSettings.sizeIndex : 1)
      );

      setTool(nextSettings.tool || "brush");
      setColor(nextSettings.color || "#000000");
      setBrushPresets(nextBrushPresets);
      sizeIndexRef.current = nextSizeIndex;
      setSizeIndex(nextSizeIndex);
      setOpacity(nextSettings.opacity || 10);
      setHue(nextSettings.hue || 0);
      setLightness(nextSettings.lightness || 50);
      setPaperColor(nextSettings.paperColor || "#ffffff");
      nextSettingsPaperColorRef.current = nextSettings.paperColor || "#ffffff";
      setShowGrid(Boolean(nextSettings.showGrid));
      setFocusMaskEnabled(Boolean(nextSettings.focusMaskEnabled));
      setFocusMoveMode(Boolean(nextSettings.focusMoveMode));
      if (nextSettings.focusRect) {
        setFocusRect(clampFocusRect(nextSettings.focusRect, { width: nextWidth, height: nextHeight }));
      }
      setReferenceMaskEnabled(Boolean(nextSettings.referenceMaskEnabled));
      setReferenceMaskMoveMode(Boolean(nextSettings.referenceMaskMoveMode));
      if (nextSettings.referenceMaskRect) {
        setReferenceMaskRect(clampPercentRect(nextSettings.referenceMaskRect));
      }
      if (nextSettings.referencePanel) {
        setReferencePanel(nextSettings.referencePanel);
      }
      if (nextSettings.themeId && APP_THEMES.some((item) => item.id === nextSettings.themeId)) {
        setThemeId(nextSettings.themeId);
      }
      if (nextSettings.shortcuts) {
        setShortcuts({ ...DEFAULT_SHORTCUTS, ...nextSettings.shortcuts });
      }
      setDraftWidth(nextWidth);
      setDraftHeight(nextHeight);

      pendingLoadedProjectRef.current = { imageData: project.imageData };
      setCanvasSize({ width: nextWidth, height: nextHeight });
      setLoadToken((token) => token + 1);
    } catch {
      setStatus("Could not load project file");
    } finally {
      event.target.value = "";
    }
  }

  function loadReferenceImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const image = new Image();
      image.onload = () => {
        const aspect = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
        setReferenceImageAspect(aspect || 1);
        setReferenceImage(src);
        setReferenceVisible(true);
        setReferenceMaskEnabled(true);
        setReferenceMaskRect(
          clampPercentRect({
            x: focusLeft,
            y: focusTop,
            width: focusWidth,
            height: focusHeight,
          })
        );
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function beginReferencePanelDrag(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    referencePanelDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPanelX: referencePanel.x,
      startPanelY: referencePanel.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveReferencePanelDrag(event) {
    if (!referencePanelDragRef.current || referencePanelDragRef.current.mode === "resize") return;
    const drag = referencePanelDragRef.current;
    setReferencePanel((panel) => ({
      ...panel,
      x: Math.max(0, drag.startPanelX + event.clientX - drag.startX),
      y: Math.max(0, drag.startPanelY + event.clientY - drag.startY),
    }));
  }

  function endReferencePanelDrag(event) {
    referencePanelDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function beginReferenceMaskDrag(event) {
    if (!referenceMaskEnabled || !referenceMaskMoveMode) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();

    referenceMaskDragRef.current = {
      offsetX: event.clientX - rect.left - referenceMaskPos.x,
      offsetY: event.clientY - rect.top - referenceMaskPos.y,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveReferenceMaskDrag(event) {
    if (!referenceMaskDragRef.current || !referenceMaskMoveMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setReferenceMaskPos(
      clampReferenceMaskPos({
        x: event.clientX - rect.left - referenceMaskDragRef.current.offsetX,
        y: event.clientY - rect.top - referenceMaskDragRef.current.offsetY,
      })
    );
  }

  function endReferenceMaskDrag(event) {
    referenceMaskDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function removeReferenceImage() {
    setReferenceImage(null);
    setReferenceImageAspect(1);
    setReferenceVisible(false);
    setReferenceMaskEnabled(false);
  }

  function beginFocusDrag(event) {
    if (!focusMaskEnabled || !focusMoveMode) return;
    event.preventDefault();

    const display = canvasWrapRef.current?.getBoundingClientRect();
    if (!display) return;
    focusDragRef.current = {
      offsetX: event.clientX - display.left - canvasMaskPos.x,
      offsetY: event.clientY - display.top - canvasMaskPos.y,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveFocusDrag(event) {
    if (!focusDragRef.current || !focusMoveMode) return;

    const display = canvasWrapRef.current?.getBoundingClientRect();
    if (!display) return;

    setCanvasMaskPos(
      clampCanvasMaskPos({
        x: event.clientX - display.left - focusDragRef.current.offsetX,
        y: event.clientY - display.top - focusDragRef.current.offsetY,
      })
    );
  }

  function endFocusDrag(event) {
    focusDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  const focusLeftPx = canvasMaskPos.x;
  const focusTopPx = canvasMaskPos.y;
  const focusWidthPx = sharedMaskSize.width;
  const focusHeightPx = sharedMaskSize.height;

  const refLeftPx = referenceMaskPos.x;
  const refTopPx = referenceMaskPos.y;
  const refWidthPx = sharedMaskSize.width;
  const refHeightPx = sharedMaskSize.height;
  const referencePanelAspect = referencePanel.width / referencePanel.height;
  const referenceImageDisplayWidth = referenceImageAspect >= referencePanelAspect
    ? 100
    : (referenceImageAspect / referencePanelAspect) * 100;
  const referenceImageDisplayHeight = referenceImageAspect >= referencePanelAspect
    ? (referencePanelAspect / referenceImageAspect) * 100
    : 100;
  const referenceImageDisplayLeft = (100 - referenceImageDisplayWidth) / 2;
  const referenceImageDisplayTop = (100 - referenceImageDisplayHeight) / 2;

  function chooseHue(newHue) {
    setHue(Number(newHue));
    setColor(hslToHex(Number(newHue), 100, lightness));
  }

  function chooseLightness(newLightness) {
    setLightness(Number(newLightness));
    setColor(hslToHex(hue, 100, Number(newLightness)));
  }

  function applyPaperColorToCanvas(nextPaperColor = paperColor) {
    setPaperColor(nextPaperColor);
    setStatus("Paper color changed");
  }

  return (
    <div
      className="h-screen overflow-hidden p-2 md:p-3"
      style={{
        background: theme.appBg,
        color: theme.text,
        "--theme-text": theme.text,
        "--theme-muted": theme.muted,
        "--theme-panel": theme.panelBg,
        "--theme-border": theme.panelBorder,
        "--theme-button": theme.panelBg,
        "--theme-button-text": theme.text,
        "--theme-button-hover": theme.appBg,
        "--theme-accent": theme.accent,
        "--theme-accent-text": theme.accentText,
        "--theme-input": theme.panelBg,
        "--theme-input-text": theme.text,
        "--theme-input-border": theme.panelBorder,
        "--theme-range-track": theme.panelBorder,
        "--theme-range-thumb": theme.accent,
      }}
    >
      <div className="w-full max-w-none h-full min-h-0 grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-3">
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl shadow-sm p-4 pr-3 space-y-5 h-full overflow-y-auto border"
          style={{ background: theme.panelBg, borderColor: theme.panelBorder }}
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Shadepad</h1>
          </div>

          <section className="space-y-2">
            <button
              onClick={() => setShowThemes((open) => !open)}
              className="h-10 w-full rounded-2xl border flex items-center justify-between px-3 text-sm transition"
            >
              <span>Theme</span>
              <span className="flex items-center gap-2" style={{ color: theme.muted }}>
                {theme.label}
                {showThemes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {showThemes && (
              <div className="grid grid-cols-2 gap-2">
                {APP_THEMES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setThemeId(item.id)}
                    className="theme-sample min-h-10 rounded-xl border px-2 py-1 text-xs text-left transition"
                    style={{
                      background: item.panelBg,
                      borderColor: themeId === item.id ? theme.accent : item.panelBorder,
                      color: item.text,
                      boxShadow: themeId === item.id ? `0 0 0 2px ${theme.accent}` : "none",
                    }}
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="mt-1 flex gap-1">
                      <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: item.appBg }} />
                      <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: item.panelBg }} />
                      <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: item.accent }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">New canvas</div>
              <div className="text-xs" style={{ color: theme.muted }}>{canvasSize.width} × {canvasSize.height}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs" style={{ color: theme.muted }}>Width</span>
                <input
                  type="number"
                  min="100"
                  max="6000"
                  value={draftWidth}
                  onChange={(e) => setDraftWidth(e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: theme.muted }}>Height</span>
                <input
                  type="number"
                  min="100"
                  max="6000"
                  value={draftHeight}
                  onChange={(e) => setDraftHeight(e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm"
                />
              </label>
            </div>

            <button
              onClick={() => createNewCanvas()}
              className="h-11 w-full rounded-2xl bg-zinc-900 text-white flex items-center justify-center gap-2 text-sm hover:bg-zinc-700 transition"
            >
              <FilePlus2 size={16} /> Create new canvas
            </button>

            <div className="grid grid-cols-2 gap-2">
              {CANVAS_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => createNewCanvas(preset.width, preset.height)}
                  className="min-h-10 rounded-xl bg-white border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-100 transition"
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-zinc-500">{preset.width} × {preset.height}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Canvas zoom</div>
              <div className="text-xs" style={{ color: theme.muted }}>{Math.round(canvasZoom * 100)}%</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={zoomOut} className="h-9 rounded-xl border text-xs transition">−</button>
              <button onClick={() => setZoomValue(1)} className="h-9 rounded-xl border text-xs transition">100%</button>
              <button onClick={zoomIn} className="h-9 rounded-xl border text-xs transition">+</button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1, 1.5, 2].map((zoom) => (
                <button
                  key={zoom}
                  onClick={() => setZoomValue(zoom)}
                  className="h-8 rounded-xl border text-[11px] transition"
                  style={{
                    borderColor: canvasZoom === zoom ? theme.accent : theme.panelBorder,
                    boxShadow: canvasZoom === zoom ? `0 0 0 1px ${theme.accent}` : "none",
                  }}
                >
                  {Math.round(zoom * 100)}%
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0.25"
              max="4"
              step="0.25"
              value={canvasZoom}
              onChange={(e) => setZoomValue(e.target.value)}
              className="w-full accent-zinc-900"
            />

            <div className="text-xs leading-relaxed" style={{ color: theme.muted }}>
              Shortcuts: + zoom in · − zoom out · 0 reset
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-sm font-medium">Tool</div>
            <div className="flex gap-2">
              <IconButton active={tool === "brush"} onClick={() => setTool("brush")} title={`Brush · ${shortcutLabel("brush")}`}>
                <Brush size={19} />
              </IconButton>
              <IconButton active={tool === "eraser"} onClick={() => setTool("eraser")} title={`Eraser · ${shortcutLabel("eraser")}`}>
                <Eraser size={19} />
              </IconButton>
              <IconButton active={tool === "fill"} onClick={() => setTool("fill")} title={`Fill bucket · ${shortcutLabel("fill")}`}>
                <PaintBucket size={19} />
              </IconButton>
              <IconButton active={tool === "line"} onClick={() => setTool("line")} title={`Straight line · ${shortcutLabel("line")}`}>
                <Slash size={19} />
              </IconButton>
              <IconButton active={tool === "rectangle"} onClick={() => setTool("rectangle")} title={`Filled rectangle · ${shortcutLabel("rectangle")}`}>
                <Square size={19} />
              </IconButton>
              <IconButton active={tool === "picker"} onClick={() => setTool("picker")} title={`Pick color · ${shortcutLabel("picker")}`}>
                <Pipette size={19} />
              </IconButton>
              <IconButton active={tool === "pan"} onClick={() => setTool("pan")} title={`Move / pan · ${shortcutLabel("pan")}`}>
                <Move size={19} />
              </IconButton>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Brush size</div>
              <div className="text-xs" style={{ color: theme.muted }}>keys 1–9</div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {brushPresets.map((size, index) => (
                <div key={`${size}-${index}`} className="relative">
                  <button
                    onClick={() => setBrushSizeIndex(index)}
                    className={`h-12 w-full rounded-2xl border flex items-center justify-center transition ${
                      sizeIndex === index
                        ? "bg-zinc-900 border-zinc-900"
                        : "bg-white border-zinc-200 hover:bg-zinc-100"
                    }`}
                    title={`Size ${index + 1}: ${size}px`}
                  >
                    <span
                      className={`rounded-full ${sizeIndex === index ? "bg-white" : "bg-zinc-900"}`}
                      style={{ width: Math.max(3, size * 0.7), height: Math.max(3, size * 0.7) }}
                    />
                  </button>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      removeBrushPreset(index);
                    }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full border text-[11px] leading-none flex items-center justify-center transition"
                    title={`Remove ${size}px preset`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                min="1"
                max="200"
                step="1"
                value={customBrushSize}
                onChange={(event) => setCustomBrushSize(event.target.value)}
                placeholder="Custom px"
                className="h-10 rounded-xl border px-3 text-sm"
              />
              <button
                onClick={addBrushPreset}
                className="h-10 rounded-xl border px-3 text-sm transition"
              >
                Add preset
              </button>
            </div>
            <div className="text-xs" style={{ color: theme.muted }}>Current size: {activeSize}px · click × to remove presets</div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Opacity</div>
              <div className="text-sm tabular-nums font-semibold">{opacity}%</div>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-zinc-900"
            />
            <div className="grid grid-cols-10 gap-1">
              {OPACITY_STEPS.map((step) => (
                <button
                  key={step}
                  onClick={() => setOpacity(step)}
                  className={`h-7 rounded-lg text-[10px] border ${
                    opacity === step
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-sm font-medium">Color</div>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12 w-16 rounded-xl border border-zinc-200 bg-white cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-xs mb-1" style={{ color: theme.muted }}>Selected</div>
                <div className="h-8 rounded-xl border border-zinc-200" style={{ backgroundColor: color }} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs" style={{ color: theme.muted }}>Hue strip</label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => chooseHue(e.target.value)}
                className="w-full accent-zinc-900"
              />
              <label className="text-xs" style={{ color: theme.muted }}>Light / dark value</label>
              <input
                type="range"
                min="0"
                max="100"
                value={lightness}
                onChange={(e) => chooseLightness(e.target.value)}
                className="w-full accent-zinc-900"
              />
            </div>

            <div className="grid grid-cols-6 gap-2">
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  onClick={() => setColor(swatch)}
                  className={`theme-raw-color h-8 rounded-xl border transition ${color === swatch ? "ring-2 ring-zinc-900" : "border-zinc-200"}`}
                  style={{ backgroundColor: swatch }}
                  title={swatch}
                />
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-200 space-y-2">
              <div className="text-sm font-medium">Paper color</div>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={paperColor}
                  onChange={(e) => applyPaperColorToCanvas(e.target.value)}
                  className="h-12 w-16 rounded-xl border border-zinc-200 bg-white cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: theme.muted }}>Current paper</div>
                  <div className="h-8 rounded-xl border border-zinc-200" style={{ backgroundColor: paperColor }} />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {PAPER_SWATCHES.map((swatch) => (
                  <button
                    key={`paper-${swatch}`}
                    onClick={() => applyPaperColorToCanvas(swatch)}
                    className={`theme-raw-color h-8 rounded-xl border transition ${paperColor === swatch ? "ring-2 ring-zinc-900" : "border-zinc-200"}`}
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>


            </div>
          </section>

          <section className="space-y-2">
            <div className="text-sm font-medium">File / canvas actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={undo}
                className="h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center gap-2 text-sm hover:bg-zinc-700 transition"
              >
                <RotateCcw size={16} /> Undo
              </button>
              <button
                onClick={clearCanvas}
                className="h-11 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center gap-2 text-sm hover:bg-zinc-100 transition"
              >
                <PaintBucket size={16} /> Clear
              </button>
              <button
                onClick={saveProjectFile}
                className="h-11 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center gap-2 text-sm hover:bg-zinc-100 transition"
                title="Save process file · Ctrl/Cmd+S"
              >
                <Save size={16} /> Save file
              </button>
              <button
                onClick={() => projectInputRef.current?.click()}
                className="h-11 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center gap-2 text-sm hover:bg-zinc-100 transition"
              >
                <Upload size={16} /> Load file
              </button>
              <button
                onClick={downloadPng}
                className="h-11 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center gap-2 text-sm hover:bg-zinc-100 transition col-span-2"
              >
                <Download size={16} /> Export PNG
              </button>
            </div>
            <input
              ref={projectInputRef}
              type="file"
              accept=".json,.garticdraw.json,application/json"
              onChange={loadProjectFile}
              className="hidden"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-600 pt-1">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              faint background grid
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Reference</div>
              <div className="text-xs" style={{ color: theme.muted }}>R show/hide</div>
            </div>

            <button
              onClick={() => referenceInputRef.current?.click()}
              className="h-11 w-full rounded-2xl bg-white border border-zinc-200 flex items-center justify-center gap-2 text-sm hover:bg-zinc-100 transition"
            >
              Load reference image
            </button>

            <input
              ref={referenceInputRef}
              type="file"
              accept="image/*"
              onChange={loadReferenceImage}
              className="hidden"
            />

            {referenceImage && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReferenceVisible((visible) => !visible)}
                    className="h-9 rounded-xl bg-white border border-zinc-200 text-xs hover:bg-zinc-100 transition"
                  >
                    {referenceVisible ? "Hide ref" : "Show ref"}
                  </button>
                  <button
                    onClick={removeReferenceImage}
                    className="h-9 rounded-xl bg-white border border-zinc-200 text-xs hover:bg-zinc-100 transition"
                  >
                    Remove ref
                  </button>
                </div>

                <button
                  onClick={() => setReferenceMaskEnabled((enabled) => !enabled)}
                  className={`h-10 w-full rounded-xl text-sm transition ${
                    referenceMaskEnabled
                      ? "bg-zinc-900 text-white"
                      : "bg-white border border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {referenceMaskEnabled ? "Reference mask on" : "Reference mask off"}
                </button>

                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={referenceMaskMoveMode}
                    onChange={(e) => setReferenceMaskMoveMode(e.target.checked)}
                    disabled={!referenceMaskEnabled}
                  />
                  move reference mask by dragging
                </label>

                <div className="space-y-2">
                  <div className="text-xs font-medium" style={{ color: theme.muted }}>Reference window</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => resizeReferencePanel(-40, -30)} className="h-9 rounded-xl border text-xs transition">Window smaller</button>
                    <button onClick={() => resizeReferencePanel(40, 30)} className="h-9 rounded-xl border text-xs transition">Window bigger</button>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <div className="text-xs font-medium" style={{ color: theme.muted }}>Reference zoom</div>
                    <div className="text-xs" style={{ color: theme.muted }}>{Math.round(referenceZoom * 100)}%</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={zoomReferenceOut} className="h-8 rounded-xl border text-xs transition">−</button>
                    <button onClick={() => setReferenceZoomValue(1)} className="h-8 rounded-xl border text-xs transition">100%</button>
                    <button onClick={zoomReferenceIn} className="h-8 rounded-xl border text-xs transition">+</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.5, 1, 1.5, 2].map((zoom) => (
                      <button
                        key={`ref-${zoom}`}
                        onClick={() => setReferenceZoomValue(zoom)}
                        className="h-8 rounded-xl border text-[11px] transition"
                        style={{
                          borderColor: referenceZoom === zoom ? theme.accent : theme.panelBorder,
                          boxShadow: referenceZoom === zoom ? `0 0 0 1px ${theme.accent}` : "none",
                        }}
                      >
                        {Math.round(zoom * 100)}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="4"
                    step="0.25"
                    value={referenceZoom}
                    onChange={(e) => setReferenceZoomValue(e.target.value)}
                    className="w-full accent-zinc-900"
                  />

                  <div className="text-xs font-medium pt-1" style={{ color: theme.muted }}>Reference mask position</div>
                  <div className="text-xs leading-relaxed" style={{ color: theme.muted }}>
                    Same fixed size as the canvas mask. Zoom does not change the mask size.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => nudgeReferenceMaskViewport(-10, 0)} className="h-8 rounded-xl border text-xs transition">Left</button>
                    <button onClick={() => nudgeReferenceMaskViewport(10, 0)} className="h-8 rounded-xl border text-xs transition">Right</button>
                    <button onClick={() => nudgeReferenceMaskViewport(0, -10)} className="h-8 rounded-xl border text-xs transition">Up</button>
                    <button onClick={() => nudgeReferenceMaskViewport(0, 10)} className="h-8 rounded-xl border text-xs transition">Down</button>
                  </div>
                  <button
                    onClick={matchReferenceMaskToCanvasMask}
                    className="h-8 w-full rounded-xl border text-xs transition"
                  >
                    Match canvas mask position
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Focus mask</div>
              <div className="text-xs" style={{ color: theme.muted }}>F toggle · M move</div>
            </div>

            <button
              onClick={() => setFocusMaskEnabled((enabled) => !enabled)}
              className={`h-11 w-full rounded-2xl flex items-center justify-center gap-2 text-sm transition ${
                focusMaskEnabled
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
{focusMaskEnabled ? "Mask on" : "Mask off"}
            </button>

            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={focusMoveMode}
                onChange={(e) => setFocusMoveMode(e.target.checked)}
                disabled={!focusMaskEnabled}
              />
              move canvas mask by dragging
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs" style={{ color: theme.muted }}>Mask width</span>
                <input
                  type="number"
                  value={sharedMaskSize.width}
                  onChange={(e) => setSharedMaskSizeValue("width", e.target.value)}
                  className="w-full h-9 rounded-xl border px-2 text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: theme.muted }}>Mask height</span>
                <input
                  type="number"
                  value={sharedMaskSize.height}
                  onChange={(e) => setSharedMaskSizeValue("height", e.target.value)}
                  className="w-full h-9 rounded-xl border px-2 text-xs"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => nudgeCanvasMask(-10, 0)} className="h-8 rounded-xl border text-xs transition">Left</button>
              <button onClick={() => nudgeCanvasMask(10, 0)} className="h-8 rounded-xl border text-xs transition">Right</button>
              <button onClick={() => nudgeCanvasMask(0, -10)} className="h-8 rounded-xl border text-xs transition">Up</button>
              <button onClick={() => nudgeCanvasMask(0, 10)} className="h-8 rounded-xl border text-xs transition">Down</button>
            </div>

            <div className="text-xs leading-relaxed" style={{ color: theme.muted }}>
              Visual cover only. It will not export and it does not change the drawing.
            </div>
          </section>

          <section className="space-y-2">
            <button
              onClick={() => setShowSettings((open) => !open)}
              className="h-10 w-full rounded-2xl border flex items-center justify-between px-3 text-sm transition"
            >
              <span className="flex items-center gap-2"><Settings size={16} /> Settings</span>
              {showSettings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {showSettings && (
              <div className="theme-panel-card rounded-2xl border p-3 space-y-2">
                <div className="text-sm font-medium">Shortcuts</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(DEFAULT_SHORTCUTS).map((action) => (
                    <label key={action} className="space-y-1">
                      <span className="text-xs" style={{ color: theme.muted }}>{SHORTCUT_LABELS[action]}</span>
                      <input
                        type="text"
                        value={shortcutKey(action)}
                        maxLength={1}
                        onChange={(e) => updateShortcut(action, e.target.value)}
                        className="w-full h-9 rounded-xl border px-2 text-xs"
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setShortcuts(DEFAULT_SHORTCUTS)}
                  className="h-9 w-full rounded-xl border text-xs transition"
                >
                  Reset shortcuts
                </button>
              </div>
            )}
          </section>

          <section className="theme-panel-card rounded-2xl border p-3 text-xs leading-relaxed" style={{ color: theme.muted }}>
            <div className="font-medium mb-1" style={{ color: theme.text }}>Shortcuts</div>
            1–9 brush sizes · {shortcutLabel("brush")} brush · {shortcutLabel("eraser")} eraser · {shortcutLabel("fill")} fill · {shortcutLabel("line")} line · {shortcutLabel("rectangle")} rectangle · {shortcutLabel("picker")} color picker · {shortcutLabel("pan")} move · {shortcutLabel("canvasMask")} canvas mask · {shortcutLabel("canvasMaskMove")} move canvas mask · {shortcutLabel("reference")} reference · +/− zoom · 0 reset zoom · Ctrl/Cmd+Z undo · Ctrl/Cmd+S save file
          </section>
        </motion.aside>

        <main
          ref={mainRef}
          className="canvas-workspace rounded-3xl shadow-sm p-2 md:p-3 overflow-auto min-h-0 border"
          style={{ background: theme.panelBg, borderColor: theme.panelBorder }}
        >
          <div className="flex items-center justify-between gap-3 px-1 pb-3 text-sm" style={{ color: theme.muted }}>
            <div>{status}</div>
            <div className="tabular-nums">{canvasSize.width} × {canvasSize.height}px</div>
          </div>
          <div
            ref={canvasWrapRef}
            className="drawing-surface relative mx-auto shrink-0 rounded-2xl overflow-hidden border border-zinc-300 bg-white"
            style={{
              aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
              width: `${canvasSize.width * canvasZoom}px`,
              maxWidth: "none",
              backgroundColor: paperColor,
            }}
          >
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0,0,0,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.08) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
            )}
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="absolute inset-0 h-full w-full touch-none cursor-none"
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={() => {
                endStroke();
                clearCursor();
              }}
            />
            {focusMaskEnabled && (
              <div
                className={`absolute inset-0 z-10 ${focusMoveMode ? "cursor-none" : "pointer-events-none"}`}
                onPointerDown={beginFocusDrag}
                onPointerMove={moveFocusDrag}
                onPointerUp={endFocusDrag}
                onPointerCancel={endFocusDrag}
              >
                <div className="absolute bg-black/85" style={{ left: "0%", top: "0%", width: "100%", height: `${focusTopPx}px` }} />
                <div className="absolute bg-black/85" style={{ left: "0%", top: `${focusTopPx}px`, width: `${focusLeftPx}px`, height: `${focusHeightPx}px` }} />
                <div className="absolute bg-black/85" style={{ left: `${focusLeftPx + focusWidthPx}px`, top: `${focusTopPx}px`, right: "0px", height: `${focusHeightPx}px` }} />
                <div className="absolute bg-black/85" style={{ left: "0%", top: `${focusTopPx + focusHeightPx}px`, width: "100%", bottom: "0px" }} />
                <div
                  className="absolute border-2 border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
                  style={{
                    left: `${focusLeftPx}px`,
                    top: `${focusTopPx}px`,
                    width: `${focusWidthPx}px`,
                    height: `${focusHeightPx}px`,
                  }}
                />
              </div>
            )}
            <canvas
              ref={overlayRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="absolute inset-0 z-20 h-full w-full pointer-events-none"
            />
          </div>
        </main>
      </div>
        {referenceImage && referenceVisible && (
          <div
            className="fixed z-50 rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden"
            style={{ left: referencePanel.x, top: referencePanel.y, width: referencePanel.width }}
          >
            <div
              className="h-9 bg-zinc-900 text-white text-xs px-3 flex items-center justify-between cursor-move select-none"
              onPointerDown={beginReferencePanelDrag}
              onPointerMove={moveReferencePanelDrag}
              onPointerUp={endReferencePanelDrag}
              onPointerCancel={endReferencePanelDrag}
            >
              <span>Reference</span>
              <span className="text-zinc-400">{referenceMaskEnabled ? "mask on" : "mask off"}</span>
            </div>

            <div
              className={`relative bg-black ${referenceMaskEnabled && referenceMaskMoveMode ? "cursor-move" : ""}`}
              style={{ height: referencePanel.height }}

            >
              <div
                ref={referenceImageBoxRef}
                className={`absolute overflow-hidden ${referenceMaskEnabled && referenceMaskMoveMode ? "cursor-move" : ""}`}
                style={{
                  left: `${referenceImageDisplayLeft}%`,
                  top: `${referenceImageDisplayTop}%`,
                  width: `${referenceImageDisplayWidth}%`,
                  height: `${referenceImageDisplayHeight}%`,
                }}
                onPointerDown={beginReferenceMaskDrag}
                onPointerMove={moveReferenceMaskDrag}
                onPointerUp={endReferenceMaskDrag}
                onPointerCancel={endReferenceMaskDrag}
              >
                <img
                  src={referenceImage}
                  alt="Reference"
                  className="absolute inset-0 h-full w-full select-none pointer-events-none"
                  style={{ transform: `scale(${referenceZoom})`, transformOrigin: "center center" }}
                  draggable="false"
                />

                {referenceMaskEnabled && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bg-black/90" style={{ left: "0%", top: "0%", width: "100%", height: `${refTopPx}px` }} />
                    <div className="absolute bg-black/90" style={{ left: "0%", top: `${refTopPx}px`, width: `${refLeftPx}px`, height: `${refHeightPx}px` }} />
                    <div className="absolute bg-black/90" style={{ left: `${refLeftPx + refWidthPx}px`, top: `${refTopPx}px`, right: "0px", height: `${refHeightPx}px` }} />
                    <div className="absolute bg-black/90" style={{ left: "0%", top: `${refTopPx + refHeightPx}px`, width: "100%", bottom: "0px" }} />
                    <div
                      className="absolute border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.8)]"
                      style={{
                        left: `${refLeftPx}px`,
                        top: `${refTopPx}px`,
                        width: `${refWidthPx}px`,
                        height: `${refHeightPx}px`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div
                className="absolute bottom-2 right-2 h-7 w-7 rounded-lg border border-white/40 bg-black/70 text-white text-xs flex items-center justify-center cursor-nwse-resize select-none"
                title="Drag to resize reference window"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  referencePanelDragRef.current = {
                    mode: "resize",
                    startX: event.clientX,
                    startY: event.clientY,
                    startWidth: referencePanel.width,
                    startHeight: referencePanel.height,
                  };
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (referencePanelDragRef.current?.mode !== "resize") return;
                  const drag = referencePanelDragRef.current;
                  setReferencePanel((panel) => ({
                    ...panel,
                    width: Math.max(180, Math.min(900, drag.startWidth + event.clientX - drag.startX)),
                    height: Math.max(140, Math.min(760, drag.startHeight + event.clientY - drag.startY)),
                  }));
                }}
                onPointerUp={(event) => {
                  referencePanelDragRef.current = null;
                  event.currentTarget.releasePointerCapture?.(event.pointerId);
                }}
                onPointerCancel={(event) => {
                  referencePanelDragRef.current = null;
                  event.currentTarget.releasePointerCapture?.(event.pointerId);
                }}
              >
                ↘
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// src/components/DrawingCanvas.js
import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import "./DrawingCanvas.css";

export default function DrawingCanvas({ roomId, isDrawer, username }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);

  const undoStack = useRef([]);
  const UNDO_LIMIT = 12;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctxRef.current = ctx;

    const fitCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
    // eslint-disable-next-line
  }, []);

  // Save canvas state for undo
  const pushUndo = () => {
    try {
      const data = canvasRef.current.toDataURL();
      undoStack.current.push(data);
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
    } catch (err) {
      console.error("Undo error:", err);
    }
  };

  // Undo
  const doUndo = () => {
    if (!undoStack.current.length) return;
    const lastImage = undoStack.current.pop();
    socket.emit("undo", { roomId, data: lastImage });
    drawImage(lastImage);
  };

  // Draw image helper
  const drawImage = (data) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
      ctxRef.current.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
    };
    img.src = data;
  };

  // Get pointer position
  const getPointerPos = (ev) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  // Pointer events
  const pointerDown = (ev) => {
    if (!isDrawer) return;
    ev.preventDefault();
    drawing.current = true;
    pushUndo();

    const pos = getPointerPos(ev);
    last.current = pos;

    ctxRef.current.beginPath();
    ctxRef.current.moveTo(pos.x, pos.y);
  };

  const pointerMove = (ev) => {
    if (!drawing.current || !isDrawer) return;
    ev.preventDefault();

    const pos = getPointerPos(ev);
    const size = isEraser ? brushSize * 2 : brushSize;
    const strokeColor = isEraser ? "#ffffff" : color;

    ctxRef.current.lineWidth = size;
    ctxRef.current.strokeStyle = strokeColor;
    ctxRef.current.globalCompositeOperation = "source-over";
    ctxRef.current.lineTo(pos.x, pos.y);
    ctxRef.current.stroke();

    socket.emit("drawing", {
      x0: last.current.x,
      y0: last.current.y,
      x1: pos.x,
      y1: pos.y,
      color: strokeColor,
      lineWidth: size,
      roomId,
      username,
    });

    last.current = pos;
  };

  const pointerUp = (ev) => {
    if (!drawing.current || !isDrawer) return;
    ev.preventDefault();
    drawing.current = false;
    ctxRef.current.closePath();
  };

  // Socket listeners
  useEffect(() => {
    socket.on("drawing", ({ x0, y0, x1, y1, color, lineWidth }) => {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x0, y0);
      ctxRef.current.lineTo(x1, y1);
      ctxRef.current.strokeStyle = color;
      ctxRef.current.lineWidth = lineWidth;
      ctxRef.current.stroke();
    });

    socket.on("undo", ({ data }) => {
      drawImage(data);
    });

    return () => {
      socket.off("drawing");
      socket.off("undo");
    };
  }, []);

  return (
    <div className="canvas-container">
      <div className="toolbar">
        <label>
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setIsEraser(false);
            }}
            disabled={!isDrawer}
          />
        </label>

        <label>
          Size
          <input
            type="range"
            min="1"
            max="60"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            disabled={!isDrawer}
          />
        </label>

        <button onClick={() => setIsEraser(!isEraser)} disabled={!isDrawer} className="btn">
          {isEraser ? "Eraser ✓" : "Eraser"}
        </button>

        <button onClick={doUndo} disabled={!isDrawer} className="btn">
          Undo
        </button>

        <button
          onClick={() => {
            const link = document.createElement("a");
            link.download = "drawing.png";
            link.href = canvasRef.current.toDataURL("image/png");
            link.click();
          }}
          className="btn"
        >
          Save PNG
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerLeave={pointerUp}
        onTouchStart={pointerDown}
        onTouchMove={pointerMove}
        onTouchEnd={pointerUp}
      />

      {!isDrawer && <p className="watch-only">You can only watch.</p>}
    </div>
  );
}

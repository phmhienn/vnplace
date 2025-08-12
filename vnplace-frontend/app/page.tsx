"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import io from "socket.io-client";
import {
  BBOX,
  lonLatToCanvas,
  canvasToLonLat,
  canvasToRegionPixel,
  regionPixelToCanvas,
  REGION_SIZE,
} from "@/lib/mapping";

const API = process.env.NEXT_PUBLIC_API_BASE!;

// Palette demo (id → hex). Sau thêm palette thật của bạn.
const PALETTE: string[] = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#7f7f7f",
  "#964B00",
  "#ffa500",
  "#800080",
];

export default function Home() {
  const mapRef = useRef<Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [colorId, setColorId] = useState(2); // mặc định đỏ
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  // vẽ 1 ô vuông tại vị trí pixel màn hình
  function drawDot(screenX: number, screenY: number, color: string) {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(screenX - 1, screenY - 1, 2, 2); // chấm nhỏ để test realtime
  }

  useEffect(() => {
    const map = new maplibregl.Map({
      container: "map",
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      bounds: [
        [BBOX.minLon, BBOX.minLat],
        [BBOX.maxLon, BBOX.maxLat],
      ],
      fitBoundsOptions: { padding: 20 },
      attributionControl: false,
    });
    mapRef.current = map;

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    (map.getContainer() as HTMLElement).appendChild(canvas);

    function resizeCanvas() {
      const rect = (map.getContainer() as HTMLElement).getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    map.on("resize", resizeCanvas);
    map.on("load", resizeCanvas);

    // Socket
    const s = io("http://localhost:4000");
    socketRef.current = s;
    s.on("connect", () => console.log("socket connected"));
    s.on("pixel:painted", ({ rx, ry, px, py, colorId }) => {
      // chuyển rx,ry,px,py -> cx,cy -> lon,lat -> screen
      const { cx, cy } = regionPixelToCanvas(rx, ry, px, py);
      const { lon, lat } = canvasToLonLat(cx, cy);
      const p = map.project([lon, lat]);
      drawDot(p.x, p.y, PALETTE[colorId % PALETTE.length]);
    });

    map.on("click", async (e) => {
      // 1) lon/lat -> cx,cy
      const { cx, cy } = lonLatToCanvas(e.lngLat.lng, e.lngLat.lat);
      const { rx, ry, px, py } = canvasToRegionPixel(cx, cy);

      // 2) gọi API backend
      await fetch(`${API}/pixel/${rx}/${ry}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "demo-user-1",
        },
        body: JSON.stringify({ coords: [px, py], colorId }),
      });

      // 3) vẽ ngay local (không chờ socket)
      const p = map.project([e.lngLat.lng, e.lngLat.lat]);
      drawDot(p.x, p.y, PALETTE[colorId % PALETTE.length]);

      // 4) subscribe room region lần đầu
      socketRef.current?.emit("region:subscribe", { rx, ry });
    });

    return () => {
      s.close();
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !canvasRef.current) return;
    const map = mapRef.current;
    const canvas = canvasRef.current;
    const onMove = () => {
      // xóa canvas khi pan/zoom để tránh ghost pixels
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    map.on("move", onMove);
    return () => {
      map.off("move", onMove);
    };
  }, []);

  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <div id="map" style={{ position: "absolute", inset: 0 }} />
      {/* Palette đơn giản */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(255,255,255,0.9)",
          padding: 8,
          borderRadius: 6,
          display: "flex",
          gap: 6,
          zIndex: 10,
        }}
      >
        {PALETTE.map((hex, id) => (
          <button
            key={id}
            onClick={() => setColorId(id)}
            title={`color ${id}`}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: id === colorId ? "2px solid #000" : "1px solid #888",
              background: hex,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}

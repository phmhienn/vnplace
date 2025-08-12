export const BBOX = {
  minLon: 102.14,
  minLat: 8.18,
  maxLon: 109.46,
  maxLat: 23.39,
};
export const BOARD = { width: 4000, height: 8000 };
export const REGION_SIZE = 512;

export function lonLatToCanvas(lon: number, lat: number) {
  const u = (lon - BBOX.minLon) / (BBOX.maxLon - BBOX.minLon);
  const v = (lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat);
  const cx = Math.floor(u * BOARD.width);
  const cy = Math.floor((1 - v) * BOARD.height);
  return { cx, cy };
}
export function canvasToLonLat(cx: number, cy: number) {
  const u = cx / BOARD.width;
  const v = 1 - cy / BOARD.height;
  const lon = BBOX.minLon + u * (BBOX.maxLon - BBOX.minLon);
  const lat = BBOX.minLat + v * (BBOX.maxLat - BBOX.minLat);
  return { lon, lat };
}
export function canvasToRegionPixel(cx: number, cy: number) {
  const rx = Math.floor(cx / REGION_SIZE);
  const ry = Math.floor(cy / REGION_SIZE);
  const px = cx % REGION_SIZE;
  const py = cy % REGION_SIZE;
  return { rx, ry, px, py };
}
export function regionPixelToCanvas(
  rx: number,
  ry: number,
  px: number,
  py: number
) {
  const cx = rx * REGION_SIZE + px;
  const cy = ry * REGION_SIZE + py;
  return { cx, cy };
}

import { redis } from "./redis";
import { config } from "./config";

const RS = config.board.regionSize;

function regionKey(rx: number, ry: number) {
  return `region:${rx}:${ry}`;
}

export async function getRegion(rx: number, ry: number): Promise<Buffer> {
  const key = regionKey(rx, ry);
  let buf = await redis.getBuffer(key);
  if (!buf || buf.length !== RS * RS) {
    buf = Buffer.alloc(RS * RS, 0);
    await redis.set(key, buf);
  }
  return buf;
}

export async function setPixel(
  rx: number,
  ry: number,
  px: number,
  py: number,
  colorId: number
) {
  const key = regionKey(rx, ry);
  let buf = await redis.getBuffer(key);
  if (!buf || buf.length !== RS * RS) buf = Buffer.alloc(RS * RS, 0);
  const idx = py * RS + px;
  buf[idx] = colorId & 0xff;
  await redis.set(key, buf);
}

export async function getRegionSlice(rx: number, ry: number) {
  const buf = await getRegion(rx, ry);
  return buf;
}

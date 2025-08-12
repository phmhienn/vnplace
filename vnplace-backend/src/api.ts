import { Router } from "express";
import { setPixel, getRegionSlice } from "./board";
import { db } from "./db";
import { redis } from "./redis";
import { config } from "./config";

export const api = Router();

// MVP: giả lập userId từ header (sau này thay OAuth/JWT)
function getUserId(req: any) {
  return req.header("x-user-id") || "anonymous-user";
}

async function getCharges(userId: string) {
  const key = `user:${userId}:charges`;
  const raw = await redis.get(key);
  const now = Date.now();
  const cd = config.charges.cooldownMs;
  const maxC = config.charges.maxCharges;

  let count = maxC,
    updatedAt = now;
  if (raw) {
    const s = JSON.parse(raw);
    count = s.count;
    updatedAt = s.updatedAt;
    const delta = Math.floor((now - updatedAt) / cd);
    if (delta > 0) {
      count = Math.min(maxC, count + delta);
      updatedAt = updatedAt + delta * cd;
    }
  }
  await redis.set(key, JSON.stringify({ count, updatedAt }));
  return { count, cooldownMs: cd, updatedAt };
}

async function consumeCharge(userId: string) {
  const key = `user:${userId}:charges`;
  const { count, cooldownMs, updatedAt } = await getCharges(userId);
  if (count < 1) return { ok: false, count, cooldownMs };
  const newState = { count: count - 1, updatedAt: Date.now() };
  await redis.set(key, JSON.stringify(newState));
  return { ok: true, count: newState.count, cooldownMs };
}

// GET /me → charges
api.get("/me", async (req, res) => {
  const uid = getUserId(req);
  const charges = await getCharges(uid);
  res.json({ user: uid, charges });
});

// GET /board/:rx/:ry → trả về buffer (binary) hoặc base64
api.get("/board/:rx/:ry", async (req, res) => {
  const rx = Number(req.params.rx),
    ry = Number(req.params.ry);
  const buf = await getRegionSlice(rx, ry);
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(buf);
});

// POST /pixel/:rx/:ry  { coords:[px,py], colorId }
api.post("/pixel/:rx/:ry", async (req, res) => {
  const rx = Number(req.params.rx),
    ry = Number(req.params.ry);
  const { coords, colorId } = req.body || {};
  const [px, py] = coords || [];
  if (![rx, ry, px, py, colorId].every(Number.isFinite)) {
    return res.status(400).json({ painted: 0, reason: "bad_input" });
  }
  if (
    px < 0 ||
    py < 0 ||
    px >= config.board.regionSize ||
    py >= config.board.regionSize
  ) {
    return res.status(400).json({ painted: 0, reason: "out_of_bounds" });
  }

  const uid = getUserId(req);
  const token = await consumeCharge(uid);
  if (!token.ok) return res.status(429).json({ painted: 0, charges: token });

  await setPixel(rx, ry, px, py, colorId);

  // ghi log async
  db.query(
    "INSERT INTO paint_event(user_id, region_x, region_y, pixel_x, pixel_y, color_id) VALUES($1,$2,$3,$4,$5,$6)",
    [uid, rx, ry, px, py, colorId]
  ).catch(() => {});

  // phát realtime
  req.app
    .get("io")
    .to(`r:${rx}:${ry}`)
    .emit("pixel:painted", { rx, ry, px, py, colorId, userId: uid });

  res.json({
    painted: 1,
    charges: { count: token.count, cooldownMs: token.cooldownMs },
  });
});

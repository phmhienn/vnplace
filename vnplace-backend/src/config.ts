import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  redisUrl: process.env.REDIS_URL!,
  dbUrl: process.env.DATABASE_URL!,
  board: {
    width: Number(process.env.BOARD_WIDTH || 4000),
    height: Number(process.env.BOARD_HEIGHT || 8000),
    regionSize: Number(process.env.REGION_SIZE || 512),
  },
  charges: {
    cooldownMs: Number(process.env.COOLDOWN_MS || 30000),
    maxCharges: Number(process.env.MAX_CHARGES || 16),
  },
};

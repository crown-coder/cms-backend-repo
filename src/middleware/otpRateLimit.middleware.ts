import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

const limiter = new RateLimiterMemory({
  points: 5,
  duration: 300,
});

export const otpRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userKey = (req as any).user?.id
    ? `user:${(req as any).user.id}`
    : "user:anonymous";
  const ipKey = `ip:${req.ip}`;

  try {
    await Promise.all([limiter.consume(userKey), limiter.consume(ipKey)]);
    next();
  } catch {
    res.status(429).json({ message: "Too many attempts. Try again later." });
  }
};

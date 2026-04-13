import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.slice(7);
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server configuration error" });
    }
    const payload = jwt.verify(token, secret);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

import { verifyAuthToken } from "../utils/auth.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid auth token" });
  }

  try {
    req.user = verifyAuthToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired, login again" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient role access" });
    }
    return next();
  };
}

export const adminGuard = (req, res, next) => {
  if (req.headers.authorization !== "ADMIN_SECRET") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};


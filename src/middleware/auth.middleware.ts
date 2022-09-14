import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
dotenv.config();

const authMiddleware = (req: any, res: any, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token: string = req.headers.authorization.split(" ")[1]; // "Bearer TOKEN"
    if (!token) {
      return res.status(401).json({ message: "Нет авторизации" });
    }
    const decoded = jwt.verify(token, process.env.jwtSecret);
    req.user = (<any>decoded).userId;
    next();
  } catch (e) {
    res.status(401).json({ message: "Нет авторизации" });
  }
};

export default authMiddleware;

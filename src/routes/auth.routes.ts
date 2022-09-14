import { Router } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { body, check, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import sendMail from "../modules/nodemailer";
dotenv.config();
const router = Router();

router.post(
  "/register",
  [
    check("email", "Input correct email").normalizeEmail().isEmail(),
    check("password", "Input password").exists(),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
          message: "Некорректный данные при входе в систему",
          ok: false,
        });
      }
      const { email, password, ...body } = req.body;
      const candidate = await User.findOne({ email });
      if (candidate) {
        return res
          .status(400)
          .json({ message: "This User already exist!", ok: false });
      }
      const passwordHashed = await bcrypt.hash(password, 12);
      const user = new User({
        email,
        password: passwordHashed,
        ...body,
      });
      await user.save();
      return res.status(201).json({ message: "пользователь создан", ok: true });
    } catch (e) {
      throw e;
    }
  }
);

router.post(
  "/login",
  [
    check("email", "Input correct email").normalizeEmail().isEmail(),
    check("password", "Input password").exists(),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
          message: "Некорректный данные при входе в систему",
        });
      }
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Пользователь не найден" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Неверный пароль, попробуйте снова" });
      }
      const token = jwt.sign({ userId: user.id }, process.env.jwtSecret, {
        expiresIn: "24h",
      });
      res.json({ token, name: user.name });
    } catch (e) {
      throw e;
    }
  }
);

router.post(
  "/restorePassword/email",
  [check("email", "Input correct email").normalizeEmail().isEmail()],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
          message: "Некорректный данные при входе в систему",
          ok: false,
        });
      }
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ message: "Пользователь не найден", ok: false });
      }
      const code = Math.floor(Math.random() * 10000).toString();
      const codeHashed = await bcrypt.hash(code, 12);
      sendMail(email, code);
      res.json({ id: user._id, codeHashed: codeHashed, ok: true });
    } catch (e) {
      throw e;
    }
  }
);

router.post(
  "/restorePassword/password",
  [
    check("password", "Input password").exists(),
    check("code", "Input code").exists(),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
          message: "Некорректный данные при входе в систему",
          ok: false,
        });
      }
      const { code, codeHashed, password, id } = req.body;
      const isMatch = await bcrypt.compare(code, codeHashed);
      if (!isMatch) {
        return res
          .status(400)
          .json({ meessag: "Not correct check-code", ok: false });
      }
      const passwordHashed = await bcrypt.hash(password, 12);
      User.findByIdAndUpdate(id, { password: passwordHashed }, (err) => {
        if (err) return res.status(400).send({ err: err, ok: false });
      });
      res.json({ message: "Password has been updated", ok: true });
    } catch (e) {
      throw e;
    }
  }
);

export default router;

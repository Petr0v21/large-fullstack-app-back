import { Router } from "express";
import User from "../models/User";
import * as dotenv from "dotenv";
import authMiddleware from "../middleware/auth.middleware";
import Post from "../models/Post";
import { deleteFile, getObjectSignedUrl, uploadFileS3 } from "../modules/s3";
import multer from "multer";
import { promisify } from "util";
import { unlink } from "fs";
import crypto from "crypto";

dotenv.config();
const router = Router();
const unlinkFile = promisify(unlink);
const upload = multer({ dest: "uploads/" });
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

router.get("/info", authMiddleware, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user).select({
      _id: 0,
      __v: 0,
      links: 0,
      password: 0,
    });
    if (user.image != "") user.url = await getObjectSignedUrl(user.image);
    return res.json(user);
  } catch (e) {
    throw e;
  }
});

router.post("/onePost", authMiddleware, async (req: any, res: any) => {
  try {
    const post = await Post.findById(req.body.id).select({
      __v: 0,
      _id: 0,
      links: 0,
      owner: 0,
    });
    for (let i = 0; i < post.images.length; i++) {
      post.url[i] = await getObjectSignedUrl(post.images[i]);
    }
    res.send(post);
  } catch (e) {
    throw e;
  }
});

router.get("/posts", authMiddleware, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user);
    const posts = [];
    for (let i = 0; i < user.links.length; i++) {
      const post = await Post.findById(user.links[i]);
      posts.push(post);
    }
    return res.send(posts);
  } catch (e) {
    throw e;
  }
});

router.post(
  "/updateUser",
  authMiddleware,
  upload.single("image"),
  async (req: any, res: any) => {
    try {
      if (req.body) {
        await User.findByIdAndUpdate(req.user, { ...req.body });
      }
      const user = await User.findById(req.user);
      if (req.file) {
        if (user.image != "") {
          await deleteFile(user.image);
        }
        const imageName = generateFileName();
        const result = await uploadFileS3(req.file, imageName);
        await unlinkFile(req.file.path);
        user.image = imageName;
      }
      user.save();
      return res.send({ message: "User has been updated" });
    } catch (e) {
      throw e;
    }
  }
);

export default router;

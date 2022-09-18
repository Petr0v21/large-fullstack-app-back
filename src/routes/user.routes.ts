import { Router } from "express";
import User from "../models/User";
import * as dotenv from "dotenv";
import authMiddleware from "../middleware/auth.middleware";
import Post from "../models/Post";
import { getObjectSignedUrl } from "../modules/s3";
dotenv.config();
const router = Router();

router.get("/info", authMiddleware, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user).select({
      _id: 0,
      __v: 0,
      links: 0,
      password: 0,
    });
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

router.get("/posts", async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user);
    const posts = [];
    for (let i = 0; i < user.links.length; i++) {
      const post = await Post.findById(user.links[i]);
      posts.push(post);
    }
    for (let post of posts) {
      for (let i = 0; i < post.images.length; i++) {
        post.url[i] = await getObjectSignedUrl(post.images[i]);
      }
    }
    return res.send(posts);
  } catch (e) {
    throw e;
  }
});

router.post("/updateUser", authMiddleware, async (req: any, res: any) => {
  try {
    const user = await User.findByIdAndUpdate(req.user, { ...req.body });
    return res.send({ message: "User has been updated" });
  } catch (e) {
    throw e;
  }
});

export default router;

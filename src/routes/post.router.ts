import { Router } from "express";
import User from "../models/User";
import * as dotenv from "dotenv";
import Post from "../models/Post";
import middleWare from "../middleware/auth.middleware";
import { getObjectSignedUrl, uploadFileS3 } from "../modules/s3";
import multer from "multer";
import { promisify } from "util";
import { unlink } from "fs";
import crypto from "crypto";
import { check, validationResult } from "express-validator";
import Comment from "../models/Comment";
dotenv.config();
const router = Router();
const unlinkFile = promisify(unlink);
const upload = multer({ dest: "uploads/" });
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

router.post(
  "/create",
  middleWare,
  upload.array("image"),
  async (req: any, res) => {
    try {
      const files = req.files;
      const father = await User.findById(req.user);
      if (!father) return res.status(400).json({ message: "User not exist" });
      const post = new Post({
        ...req.body,
        owner: req.user,
        ownerName: father.name,
      });
      father.links.push(post._id);
      for (let file of files) {
        const imageName = generateFileName();
        const result = await uploadFileS3(file, imageName);
        await unlinkFile(file.path);
        post.images.push(imageName);
      }
      post.save();
      father.save();
      return res.status(201).json({ message: "Пост создан" });
    } catch (e) {
      throw e;
    }
  }
);

router.post("/list", async (req: any, res) => {
  try {
    const list = await Post.find(
      req.body.filter,
      { __v: 0 },
      {
        limit: 5,
        skip: (req.body.page - 1) * 5,
      }
    );
    const lengthListPages = Math.ceil((await Post.count(req.body.filter)) / 5);
    const amount = [];
    for (let i = 1; i <= lengthListPages; i++) {
      amount.push(i);
    }
    for (let post of list) {
      for (let i = 0; i < post.images.length; i++) {
        post.url[i] = await getObjectSignedUrl(post.images[i]);
      }
    }
    let owner = [];
    let user: any;
    for (let post of list) {
      let user = await User.findById(post.owner);
      post.ownerName = user.name;
    }
    res.send({ list: list, pages: amount });
  } catch (error) {
    throw error;
  }
});

router.post("/listselected", async (req: any, res) => {
  try {
    const list = await Post.find(
      {
        _id: { $in: req.body.ids },
        ...req.body.filter,
      },
      { __v: 0 },
      {
        limit: 5,
        skip: (req.body.page - 1) * 5,
      }
    );
    const lengthListPages = Math.ceil((await Post.count(req.body.filter)) / 5);
    const amount = [];
    for (let i = 1; i <= lengthListPages; i++) {
      amount.push(i);
    }
    for (let post of list) {
      for (let i = 0; i < post.images.length; i++) {
        post.url[i] = await getObjectSignedUrl(post.images[i]);
      }
    }
    res.send({ list: list, pages: amount });
  } catch (error) {
    throw error;
  }
});

router.post("/delete", middleWare, async (req: any, res) => {
  try {
    const user = await User.findById(req.user);
    user.links = user.links.filter(
      (idPost) => idPost.toString() !== req.body.id
    );
    const result = await Post.findByIdAndDelete(req.body.id);
    user.save();
    res.json({ message: "Post has been deleted" });
  } catch (error) {
    throw error;
  }
});

router.post(
  "/update",
  middleWare,
  upload.array("image"),
  async (req: any, res) => {
    try {
      const files = req.files;
      const { id, images, rating, ...body } = req.body;
      if (body) {
        await Post.findByIdAndUpdate(id, body);
      }
      const post = await Post.findById(id);
      if (Array.isArray(images)) {
        images.map((img) => {
          post.images = post.images.filter((elem) => elem !== img);
        });
      } else if (images) {
        post.images = post.images.filter((elem) => elem !== images);
      }
      if (files) {
        for (let file of files) {
          const imageName = generateFileName();
          const result = await uploadFileS3(file, imageName);
          await unlinkFile(file.path);
          post.images.push(imageName);
        }
      }
      post.save();
      return res.status(201).json({ message: "Post has been updated" });
    } catch (e) {
      throw e;
    }
  }
);

router.get("/:id", async (req: any, res: any) => {
  try {
    const post = await Post.findById(req.params.id).select({
      __v: 0,
      _id: 0,
    });
    for (let i = 0; i < post.images.length; i++) {
      post.url[i] = await getObjectSignedUrl(post.images[i]);
    }
    res.send(post);
  } catch (e) {
    throw e;
  }
});

router.post(
  "/comment",
  [
    check("email", "Input correct email").normalizeEmail().isEmail(),
    check("name", "Input name").exists(),
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
      const father = await Post.findById(req.body.id, { links: 1, rating: 1 });
      if (!father)
        return res.status(400).json({ message: "Post father not exist" });
      const { id, ...body } = req.body;
      const comment = new Comment({ ...body, owner: father._id });
      father.links.push(comment._id);
      father.rating.average =
        (father.rating.average * father.rating.amount +
          Number(req.body.rating)) /
        (father.rating.amount + 1);
      father.rating.amount++;
      father.save();
      comment.save();
      return res.status(201).json({ message: "коментарий создан" });
    } catch (e) {
      throw e;
    }
  }
);

router.post("/getcomment", async (req: any, res: any) => {
  try {
    const list = await Comment.find(
      {
        _id: { $in: req.body.ids },
        ...req.body.filter,
      },
      { __v: 0 },
      {
        limit: 5,
        skip: (req.body.page - 1) * 5,
      }
    );
    const lengthListPages = Math.ceil((await Post.count(req.body.filter)) / 5);
    const amount = [];
    for (let i = 1; i <= lengthListPages; i++) {
      amount.push(i);
    }
    res.send({ list: list, pages: amount });
    return res.status(201).json({ message: "коментарий создан" });
  } catch (e) {
    throw e;
  }
});

export default router;

import { Router } from "express";
import User from "../models/User";
import * as dotenv from "dotenv";
import Post from "../models/Post";
import middleWare from "../middleware/auth.middleware";
import { deleteFile, getObjectSignedUrl, uploadFileS3 } from "../modules/s3";
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
      const { priceAmount, priceValue, ...body } = req.body;
      if (!father) return res.status(400).json({ message: "User not exist" });
      const post = new Post({
        ...body,
        price: {
          amount: priceAmount,
          value: priceValue,
        },
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

router.get("/search/:title", async (req: any, res: any) => {
  try {
    const poststitle = await Post.find(
      { title: { $regex: `${req.params.title}`, $options: "i" } },
      { title: 1 },
      { limit: 10 }
    );
    res.send(poststitle);
  } catch (e) {
    throw e;
  }
});

router.post("/list", async (req: any, res) => {
  try {
    let lengthListPages;
    let list;
    let countNum;
    if (req.body.filter) {
      const { title, price, location, order } = req.body.filter;
      let filterprice: any;
      let sortOrder = {};
      switch (order) {
        case "Від меншої ціни":
          sortOrder = { "price.amount": 1 };
          break;
        case "Від найбільшої ціни":
          sortOrder = { "price.amount": -1 };
          break;
        case "По даті":
          sortOrder = { _id: -1 };
          break;
        default:
          sortOrder = { "rating.average": 1 };
      }
      switch (price) {
        case "До 100грн":
          filterprice = { $lte: 100 };
          break;
        case "Від 100грн":
          filterprice = { $gte: 100 };
          break;
        default:
          filterprice = { $gte: 0 };
      }
      let filterObj = {};
      Object.entries(req.body.filter).map((val) => {
        switch (val[0]) {
          case "title":
            filterObj = {
              ...filterObj,
              title: { $regex: `${title}`, $options: "i" },
            };
            break;
          case "location":
            filterObj = {
              ...filterObj,
              location: { $regex: `${location}`, $options: "i" },
            };
            break;
          case "category":
            filterObj = { ...filterObj, category: val[1] };
            break;
          case "price":
            filterObj = { ...filterObj, "price.amount": filterprice };
            break;
          default:
        }
      });
      list = await Post.find(
        filterObj,
        { __v: 0 },
        {
          sort: sortOrder,
          limit: 5,
          skip: (req.body.page - 1) * 5,
        }
      );
      countNum = await Post.count(filterObj);
      lengthListPages = Math.ceil(countNum / 5);
    } else {
      list = await Post.find(
        {},
        {},
        {
          sort: { "rating.average": -1 },
          limit: 5,
          skip: (req.body.page - 1) * 5,
        }
      );
      countNum = await Post.count();
      lengthListPages = Math.ceil(countNum / 5);
    }
    const amount = [];
    for (let i = 1; i <= lengthListPages; i++) {
      amount.push(i);
    }
    for (let post of list) {
      let user = await User.findById(post.owner);
      post.ownerName = user.name;
    }
    res.send({ list: list, pages: amount, count: countNum });
  } catch (error) {
    throw error;
  }
});

router.post("/ownerposts", async (req: any, res: any) => {
  try {
    const user = await User.findById(req.body.user);
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

router.post("/listselected", async (req: any, res) => {
  try {
    const list = await Post.find(
      {
        _id: { $in: req.body.ids },
      },
      { __v: 0 }
    );
    res.send({ list: list });
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
    const post = await Post.findById(req.body.id);
    post.images.map((name) => deleteFile(name));
    post.links.map(async (id) => await Comment.findByIdAndDelete(id));
    await Post.findByIdAndDelete(req.body.id);
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
      const { id, images, rating, priceAmount, priceValue, ...body } = req.body;
      let priceObj = {
        amount: priceAmount,
        value: priceValue,
      };
      if (body) {
        await Post.findByIdAndUpdate(id, body);
      }
      if (Object.values(priceObj).find((arg) => arg !== "")) {
        await Post.findByIdAndUpdate(id, {
          price: priceObj,
        });
      }
      const post = await Post.findById(id);
      if (Array.isArray(images)) {
        images.map(async (img) => {
          post.images = post.images.filter((elem) => elem !== img);
          await deleteFile(img);
        });
      } else if (images) {
        post.images = post.images.filter((elem) => elem !== images);
        await deleteFile(images);
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

router.post("/comment/like", async (req: any, res: any) => {
  try {
    const { id } = req.body;
    const comment = await Comment.findById(id);
    comment.likes = req.body.likes;
    comment.save();
    return res.status(201).json({ message: "коментарий updated" });
  } catch (e) {
    throw e;
  }
});

router.post("/getcomment", async (req: any, res: any) => {
  try {
    const list = await Comment.find({
      _id: { $in: req.body.ids },
    });
    return res.send(list);
  } catch (e) {
    throw e;
  }
});

export default router;

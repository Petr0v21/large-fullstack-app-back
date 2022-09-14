import express from "express";
import { unlink } from "fs";
import multer from "multer";
import { promisify } from "util";
import { getFileStream, uploadFile } from "./s3.js";
import auth from "./routes/auth.routes.ts";
import middleWare from "./middleware/auth.middleware";

const unlinkFile = promisify(unlink);
const upload = multer({ dest: "uploads/" });
const app = express();
app.use(express.json());
app.use("/api/auth", auth);

app.get("/images/:key", (req, res) => {
  console.log(req.params);
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
});

app.post("/images", upload.single("image"), async (req, res) => {
  const file = req.file;
  console.log(file);
  const body = req.body;
  console.log("Body: ", body);
  // apply filter
  // resize

  // const result = await uploadFile(file);
  // await unlinkFile(file.path);
  // console.log(result);
  // const description = req.body.description;
  // res.send({ imagePath: `/images/${result.Key}` });
});

app.listen(8080, () => console.log("listening on port 8080"));

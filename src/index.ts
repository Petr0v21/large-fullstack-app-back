import express from "express";
import auth from "./routes/auth.routes";
import post from "./routes/post.router";
import user from "./routes/user.routes";
import cors from "cors";
import mongoose from "mongoose";
import favicon from "express-favicon";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  favicon(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/2300px-React-icon.svg.png"
  )
);
app.use(express.json());
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use("/api/auth", auth);
app.use("/api/post", post);
app.use("/api/user", user);

async function start() {
  try {
    await mongoose.connect(
      "mongodb+srv://user:010101@cluster0.pskaane.mongodb.net/?retryWrites=true&w=majority",
      {
        //   useNewUrlParser: true,
        //   useUnifiedTopology: true,
        // useCreateIndex: true
      }
    );
    app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
  } catch (e) {
    throw e;
    // console.log("Server Error:", e.message);
    // process.exit(1);
  }
}
start();

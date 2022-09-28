import { model, Schema, Types } from "mongoose";

const PostSchema: Schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User" },
  ownerName: { type: String, required: true },
  title: { type: String, required: true },
  rating: {
    average: { type: Number, default: "0", required: true },
    amount: { type: Number, default: 0, required: true },
  },
  price: {
    amount: { type: Number, default: "0", required: true },
    value: { type: String, required: true },
  },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  images: [{ type: String, required: true }],
  url: [{ type: String, required: true }],
  links: [{ type: Types.ObjectId, ref: "Link" }],
});

export default model("Post", PostSchema);

import { model, Schema, Types } from "mongoose";

const UserSchema: Schema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  age: { type: String, default: "" },
  addInf: { type: String, default: "" },
  image: { type: String, required: true },
  url: { type: String, required: true },
  links: [{ type: Types.ObjectId, ref: "Link" }],
});

export default model("User", UserSchema);

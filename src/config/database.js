import mongoose from "mongoose";
import config from "./config.js";

async function connectDB(){
    if (!config.MONGO_URI) {
        throw new Error("MONGO_URI is not set in the environment");
    }

    await mongoose.connect(config.MONGO_URI)
    console.log("MongoDB connected successfully");
}
export default connectDB;
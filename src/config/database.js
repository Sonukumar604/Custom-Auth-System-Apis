import mongoose from "mongoose";
import dns from "node:dns";
import config from "./config.js";

async function connectDB() {
    try {
        console.log("Connecting to MongoDB...");

        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        await mongoose.connect(config.MONGO_URI);

        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB Connection Error");
        console.error(err);
        process.exit(1);
    }
}

export default connectDB;

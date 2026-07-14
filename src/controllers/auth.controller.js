import crypto from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: [true, "Username must be unique"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: [true, "Email must be unique"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    }
});

const userModel = mongoose.models.users ?? mongoose.model("users", userSchema);


export async function register(req, res){
    const { username, email, password} = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Username, email, and password are required"
        });
    }

    const isAlreadyRegistered = await userModel.findOne({
        $or: [
            {username: username},
            {email: email}
        ]
    })
    if(isAlreadyRegistered){
        return res.status(409).json({
            message: "Username or email already exists"
        })
    }
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
    const user = await userModel.create({
        username, 
        email,
        password: hashedPassword
    })
    const token = jwt.sign({id: user._id}, config.JWT_SECRET, {expiresIn: "1d"})
    return res.status(201).json({
        message: "User registered successfully",
        user:{
            username: user.username,
            email: user.email
        },
        token
    })
}
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
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not set in the environment");
    }

    const accessToken = jwt.sign({id: user._id}, jwtSecret, {expiresIn: "15m"})
    const refreshToken = jwt.sign({id: user._id}, jwtSecret, {expiresIn: "7d"})
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    res.status(201).json({
        message: "User registered successfully",
        user:{
            username: user.username,
            email: user.email
        },
        accessToken
    })
}

export async function getMe(req, res){
    const token = req.headers.authorization?.split(" ")[ 1 ];
    if(!token){
        return res.status(401).json({
            message: "token not found"
        })
    }
    const decoded = jwt.verify(token, config.JWT_SECRET)
    const user = await userModel.findById(decoded.id)

    res.status(200).json({
        message: "User fetched successfully",
        user:{
            username: user.username,
            email: user.email
        }
    })
}

export async function refreshToken(req, res){
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        return res.status(401).json({
            success: false,
            message: "Refresh token not found"
        })
    }
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET)
    const accessToken = jwt.sign({id: decoded.id}, config.JWT_SECRET, {expiresIn: "15m"})

    const newRefreshToken = jwt.sign({id: decoded.id}, config.JWT_SECRET, {expiresIn: "7d"})
    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.status(200).json({
        message: "Access token refreshed successfully",
        accessToken
    })
}
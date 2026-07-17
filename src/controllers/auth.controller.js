import userModel from "../models/user.model.js";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";
import otpModel from "../models/otp.model.js";
import { sendEmail } from "../services/email.service.js";
import { generateOtp, getOtpHtml } from "../utils/utils.js";

// ================= Register =================

export async function register(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Username, email and password are required"
        });
    }

    const existingUser = await userModel.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    if (existingUser) {
        return res.status(409).json({
            message: "Username or email already exists"
        });
    }

    const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

    const user = await userModel.create({
        username,
        email,
        password: hashedPassword
    });

    const otp = generateOtp();

    const html = getOtpHtml(otp);

    const otpHash = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    await otpModel.create({
        email,
        user: user._id,
        otpHash
    });

    await sendEmail(
        email,
        "OTP Verification",
        `Your OTP is ${otp}`,
        html
    );

    return res.status(201).json({
        message: "User registered successfully. Please verify your email.",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    });
}

// ================= Verify Email =================

export async function verifyEmail(req, res) {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({
            message: "Email and OTP are required"
        });
    }

    const otpHash = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const otpDoc = await otpModel.findOne({
        email,
        otpHash
    });

    if (!otpDoc) {
        return res.status(400).json({
            message: "Invalid OTP"
        });
    }

    const user = await userModel.findByIdAndUpdate(
        otpDoc.user,
        {
            verified: true
        },
        {
            new: true
        }
    );

    await otpModel.deleteMany({
        user: otpDoc.user
    });

    return res.status(200).json({
        message: "Email verified successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    });
}

// ================= Login =================

export async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    if (!user.verified) {
        return res.status(401).json({
            message: "Please verify your email before logging in."
        });
    }

    const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

    if (hashedPassword !== user.password) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const refreshToken = jwt.sign(
        {
            id: user._id
        },
        config.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

    const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    const session = await sessionModel.create({
        user: user._id,
        refreshTokenHash,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
    });

    const accessToken = jwt.sign(
        {
            id: user._id,
            sessionId: session._id
        },
        config.JWT_SECRET,
        {
            expiresIn: "15m"
        }
    );

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
        message: "User logged in successfully",
        user: {
            username: user.username,
            email: user.email
        },
        accessToken
    });
}

// ================= Get Me =================

export async function getMe(req, res) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token not found"
        });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await userModel.findById(decoded.id);

    return res.status(200).json({
        message: "User fetched successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    });
}

// ================= Refresh Token =================

export async function refreshToken(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh token not found"
        });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    const session = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false
    });

    if (!session) {
        return res.status(401).json({
            message: "Invalid refresh token"
        });
    }

    const accessToken = jwt.sign(
        {
            id: decoded.id
        },
        config.JWT_SECRET,
        {
            expiresIn: "15m"
        }
    );

    const newRefreshToken = jwt.sign(
        {
            id: decoded.id
        },
        config.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

    const newRefreshTokenHash = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

    session.refreshTokenHash = newRefreshTokenHash;

    await session.save();

    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
        message: "Access token refreshed successfully",
        accessToken
    });
}

// ================= Logout =================

export async function logout(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh token not found"
        });
    }

    const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    const session = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false
    });

    if (!session) {
        return res.status(401).json({
            message: "Invalid session"
        });
    }

    session.revoked = true;

    await session.save();

    res.clearCookie("refreshToken");

    return res.status(200).json({
        message: "Logged out successfully"
    });
}

// ================= Logout All =================

export async function logoutAll(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh token not found"
        });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    await sessionModel.updateMany(
        {
            user: decoded.id,
            revoked: false
        },
        {
            revoked: true
        }
    );

    res.clearCookie("refreshToken");

    return res.status(200).json({
        message: "Logged out from all devices successfully"
    });
}
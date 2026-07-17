import dotenv from "dotenv";
dotenv.config({ override: true });

if(!process.env.MONGO_URI){
    throw new Error("MONGO_URI is not set in the environment");
}
if(!process.env.JWT_SECRET){
    throw new Error("JWT_SECRET is not set in the environment");
}
if(!process.env.GOOGLE_CLIENT_ID){
    throw new Error("GOOGLE_CLIENT_ID is not set in the environment");
}
if(!process.env.GOOGLE_CLIENT_SECRET){
    throw new Error("GOOGLE_CLIENT_SECRET is not set in the environment");
}
if(!process.env.GOOGLE_REFRESH_TOKEN){
    throw new Error("GOOGLE_REFRESH_TOKEN is not set in the environment");
}
if(!process.env.GOOGLE_USER){
    throw new Error("GOOGLE_USER is not set in the environment");
}

const config = {
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_USER: process.env.GOOGLE_USER
}
export default config;
import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("MONGODB_URI not set in environment (check backend/.env)");
    process.exit(1);
}

async function main() {
    try {
        console.log(
            "Trying to connect to MongoDB using URI:",
            uri.replace(/(mongodb:\/\/)(.*@)/, "$1***@"),
        );
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ Connected to MongoDB");
        const db = mongoose.connection.db;
        const colls = await db.listCollections().toArray();
        console.log(
            "Collections:",
            colls.map((c) => c.name),
        );
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ Connection error:", err.message || err);
        process.exit(1);
    }
}

main();

import dotenv from "dotenv";
dotenv.config(); // ✅ MUST be first

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import flashcardRoutes from "./routes/flashcardRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";

// ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* -----------------------------------------------------
   ENV CHECK (CORRECT VARIABLES)
----------------------------------------------------- */
console.log("GROQ KEY LOADED:", !!process.env.GROQ_API_KEY);
console.log("MONGODB URI LOADED:", !!process.env.MONGODB_URI);

if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY missing in .env");
}

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI missing in .env");
}

/* -----------------------------------------------------
   DATABASE
----------------------------------------------------- */
connectDB();

/* -----------------------------------------------------
   MIDDLEWARE
----------------------------------------------------- */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -----------------------------------------------------
   ROUTES
----------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/progress", progressRoutes);

/* -----------------------------------------------------
   ERROR HANDLING
----------------------------------------------------- */
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

/* -----------------------------------------------------
   SERVER START
----------------------------------------------------- */
const PORT = process.env.PORT || 5000;
const MODE = process.env.NODE_ENV || "development";

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${MODE} mode on port ${PORT}`);
});

/* -----------------------------------------------------
   PROCESS SAFETY
----------------------------------------------------- */
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

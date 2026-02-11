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
   ENV CHECK
----------------------------------------------------- */
console.log("MONGODB URI LOADED:", !!process.env.MONGODB_URI);
console.log("GROQ KEY LOADED:", !!process.env.GROQ_API_KEY);

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI missing");
}
if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY missing");
}

/* -----------------------------------------------------
   DATABASE
----------------------------------------------------- */
connectDB();

/* -----------------------------------------------------
   ✅ CORS (Node 22 SAFE)
----------------------------------------------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "https://ai-learning-assistant-frontend-five.vercel.app",
  "https://ai-learning-assistant-backend-4kro.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("❌ CORS blocked:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* -----------------------------------------------------
   BODY PARSERS
----------------------------------------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* -----------------------------------------------------
   STATIC FILES
----------------------------------------------------- */
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

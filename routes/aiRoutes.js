import express from "express";
import {
  generateFlashcards,
  generateQuiz,
  generateSummary,
  chat,
  explainConcept,
  getChatHistory, // ✅ ADD THIS
} from "../controllers/aiController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

// 🔐 Protect all AI routes
router.use(protect);

// 🤖 AI features
router.post("/generate-flashcards", generateFlashcards);
router.post("/generate-quiz", generateQuiz);
router.post("/generate-summary", generateSummary);
router.post("/chat", chat);
router.post("/explain-concept", explainConcept);

// 💬 Chat history (THIS FIXES THE 404)
router.get("/chat-history/:documentId", getChatHistory);

export default router;

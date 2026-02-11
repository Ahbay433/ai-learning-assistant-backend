import express from "express";
import protect from "../middleware/auth.js";

import {
  generateFlashcards,
  generateQuiz,
  generateSummary,
  chat,
  explainConcept,
  deleteFlashcardSet,
} from "../controllers/flashcardController.js";

const router = express.Router();

// 🔐 Protect all routes
router.use(protect);

/**
 * =========================
 * AI Flashcard & Quiz Routes
 * =========================
 */

// Generate flashcards from document
router.post("/generate", generateFlashcards);

// Generate quiz from document
router.post("/quiz", generateQuiz);

// Generate summary
router.post("/summary", generateSummary);

// Chat with document
router.post("/chat", chat);

// Explain concept from document
router.post("/explain", explainConcept);

// Delete flashcard set
router.delete("/:id", deleteFlashcardSet);

export default router;

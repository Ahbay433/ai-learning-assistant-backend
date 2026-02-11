import express from "express";
import protect from "../middleware/auth.js";

import {
  generateFlashcards,
  generateQuiz,
  generateSummary,
  chat,
  explainConcept,
  deleteFlashcardSet,
  getFlashcardsByDocument,   // 👈 ADD THIS
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

// ✅ GET flashcards for a document
router.get("/:documentId", getFlashcardsByDocument);

// Delete flashcard set
router.delete("/:id", deleteFlashcardSet);

import Flashcard from "../models/Flashcard.js";

/**
 * =========================
 * GET ALL FLASHCARD SETS
 * =========================
 */
router.get("/", async (req, res) => {
  try {
    const flashcardSets = await Flashcard.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: flashcardSets,
    });
  } catch (error) {
    console.error("GET ALL FLASHCARDS ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch flashcard sets",
    });
  }
});

export default router;

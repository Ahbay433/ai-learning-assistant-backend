import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as groqService from "../utils/groqService.js";
import { findRelevantChunks } from "../utils/textChunker.js";

/**
 * =========================
 * Generate Flashcards
 * =========================
 */
export const generateFlashcards = async (req, res) => {
  try {
    const { documentId, count = 10 } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    if (!document.extractedText?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Document text is empty",
      });
    }

    const cards = await groqService.generateFlashcards(
      document.extractedText,
      Number(count)
    );

    const flashcardSet = await Flashcard.create({
      userId: req.user.id,
      documentId,
      cards,
    });

    return res.status(201).json({
      success: true,
      data: flashcardSet,
      message: "Flashcards generated successfully",
    });
  } catch (error) {
    console.error("FLASHCARD ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate flashcards",
    });
  }
};

/**
 * =========================
 * Generate Quiz
 * =========================
 */
export const generateQuiz = async (req, res) => {
  try {
    const { documentId, count = 5, title } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    const questions = await groqService.generateQuiz(
      document.extractedText,
      Number(count)
    );

    const quiz = await Quiz.create({
      userId: req.user.id,
      documentId,
      title: title || `${document.title} - Quiz`,
      questions,
      totalQuestions: questions.length,
      userAnswers: [],
      score: 0,
    });

    return res.status(201).json({
      success: true,
      data: quiz,
      message: "Quiz generated successfully",
    });
  } catch (error) {
    console.error("QUIZ ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate quiz",
    });
  }
};

/**
 * =========================
 * Generate Summary
 * =========================
 */
export const generateSummary = async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    const summary = await groqService.generateSummary(
      document.extractedText
    );

    document.summary = summary;
    await document.save();

    return res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error("SUMMARY ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate summary",
    });
  }
};

/**
 * =========================
 * Chat With Document
 * =========================
 */
export const chat = async (req, res) => {
  try {
    const { documentId, message } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!documentId || !message) {
      return res.status(400).json({
        success: false,
        error: "documentId and message are required",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    const relevantChunks = findRelevantChunks(
      document.chunks,
      message,
      3
    );

    const answer = await groqService.chatWithDocument(
      relevantChunks,
      message
    );

    await ChatHistory.create({
      userId: req.user.id,
      documentId,
      role: "user",
      message,
    });

    await ChatHistory.create({
      userId: req.user.id,
      documentId,
      role: "assistant",
      message: answer,
    });

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Chat failed",
    });
  }
};

/**
 * =========================
 * Explain Concept
 * =========================
 */
export const explainConcept = async (req, res) => {
  try {
    const { documentId, concept } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!documentId || !concept) {
      return res.status(400).json({
        success: false,
        error: "documentId and concept are required",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    const relevantChunks = findRelevantChunks(
      document.chunks,
      concept,
      3
    );

    if (!relevantChunks.length) {
      return res.status(200).json({
        success: true,
        data: {
          explanation:
            "The concept could not be found clearly in this document.",
        },
      });
    }

    const context = relevantChunks
      .map(chunk => chunk.content)
      .join("\n\n");

    const explanation = await groqService.explainConcept(
      concept,
      context
    );

    return res.status(200).json({
      success: true,
      data: { concept, explanation },
    });
  } catch (error) {
    console.error("EXPLAIN ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to explain concept",
    });
  }
};

/**
 * =========================
 * ✅ DELETE FLASHCARD SET (FIX)
 * =========================
 */
export const deleteFlashcardSet = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const flashcardSet = await Flashcard.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        error: "Flashcard set not found",
      });
    }

    await flashcardSet.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Flashcard set deleted successfully",
    });
  } catch (error) {
    console.error("DELETE FLASHCARD ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete flashcard set",
    });
  }
};

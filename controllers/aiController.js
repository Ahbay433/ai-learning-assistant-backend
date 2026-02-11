import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as groqService from "../utils/groqService.js";
import { findRelevantChunks } from "../utils/textChunker.js";

/* -----------------------------------------------------
   Helper: get document text safely
----------------------------------------------------- */
const getDocumentText = (document) => {
  if (document.extractedText?.trim()) return document.extractedText;
  if (document.content?.trim()) return document.content;
  if (document.text?.trim()) return document.text;

  if (Array.isArray(document.chunks) && document.chunks.length) {
    return document.chunks.map((c) => c.content).join("\n\n");
  }

  return "";
};

/* =========================
   Generate Flashcards
========================= */
export const generateFlashcards = async (req, res) => {
  try {
    // ✅ FIXED LINE
    const { documentId, count = 10 } = req.body;

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

    const text = getDocumentText(document);

    if (!text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Document has no text",
      });
    }

    const cards = await groqService.generateFlashcards(text, Number(count));

    const flashcardSet = await Flashcard.create({
      userId: req.user.id,
      documentId,
      cards,
    });

    res.status(201).json({ success: true, data: flashcardSet });
  } catch (err) {
    console.error("FLASHCARD ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate flashcards",
    });
  }
};

/* =========================
   Generate Quiz
========================= */
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

    const text = document ? getDocumentText(document) : "";

    if (!text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Document not ready or empty",
      });
    }

    const questions = await groqService.generateQuiz(text, Number(count));

    const quiz = await Quiz.create({
      userId: req.user.id,
      documentId,
      title: title || `${document.title} - Quiz`,
      questions,
      totalQuestions: questions.length,
      userAnswers: [],
      score: 0,
    });

    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    console.error("QUIZ ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate quiz",
    });
  }
};

/* =========================
   Generate Summary
========================= */
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

    const text = getDocumentText(document);

    console.log("🧠 Summary text length:", text.length);
    console.log("🧠 Summary preview:", text.slice(0, 200));

    if (!text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Document has no text to summarize",
      });
    }

    const summary = await groqService.generateSummary(text);

    document.summary = summary;
    await document.save();

    res.json({ success: true, data: { summary } });
  } catch (err) {
    console.error("SUMMARY ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate summary",
    });
  }
};

/* =========================
   Chat With Document
========================= */
export const chat = async (req, res) => {
  try {
    const { documentId, message } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id,
      status: "ready",
    });

    if (!document || !document.chunks?.length) {
      return res.status(400).json({
        success: false,
        error: "Document not ready for chat",
      });
    }

    const relevantChunks = findRelevantChunks(document.chunks, message, 3);
    const answer = await groqService.chatWithDocument(relevantChunks, message);

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

    res.json({ success: true, answer });
  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Chat failed",
    });
  }
};

/* =========================
   Get Chat History
========================= */
export const getChatHistory = async (req, res) => {
  try {
    const { documentId } = req.params;

    const chats = await ChatHistory.find({
      userId: req.user.id,
      documentId,
    })
      .sort({ createdAt: 1 })
      .select("role message createdAt");

    res.json({ success: true, data: chats });
  } catch (err) {
    console.error("CHAT HISTORY ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch chat history",
    });
  }
};

/* =========================
   Explain Concept
========================= */
export const explainConcept = async (req, res) => {
  try {
    const { documentId, concept } = req.body;

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    const relevantChunks = findRelevantChunks(document.chunks, concept, 3);

    if (!relevantChunks.length) {
      return res.json({
        success: true,
        data: {
          explanation:
            "The concept could not be found clearly in this document.",
        },
      });
    }

    const context = relevantChunks.map((c) => c.content).join("\n\n");
    const explanation = await groqService.explainConcept(concept, context);

    res.json({ success: true, data: { concept, explanation } });
  } catch (err) {
    console.error("EXPLAIN ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to explain concept",
    });
  }
};

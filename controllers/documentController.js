import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";

import { extractTextFromPDF } from "../utils/pdfParser.js";
import { chunkText } from "../utils/textChunker.js";

import fs from "fs/promises";
import mongoose from "mongoose";

/**
 * @desc    Upload PDF document
 * @route   POST /api/documents/upload
 * @access  Private
 */
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF file",
      });
    }

    const { title } = req.body;

    if (!title) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Please provide a document title",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    // ✅ Correct: userId field
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: fileUrl,
      fileSize: req.file.size,
      status: "processing",
    });

    // Process PDF asynchronously
    processPDF(document._id, req.file.path).catch((err) =>
      console.error("PDF processing error:", err)
    );

    res.status(201).json({
      success: true,
      data: document,
      message: "Document uploaded successfully. Processing in progress...",
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

/**
 * Helper: Process PDF → extract text → chunk → update document
 */
const processPDF = async (documentId, filePath) => {
  try {
    const { text } = await extractTextFromPDF(filePath);

    if (!text || !text.trim()) {
      throw new Error("No text extracted from PDF");
    }

    const chunks = chunkText(text, 500, 50);

    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks,
      status: "ready",
    });

    console.log(`✅ Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, {
      status: "failed",
    });
  }
};

/**
 * @desc    Get all user documents
 * @route   GET /api/documents
 * @access  Private
 */
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.aggregate([
      {
        // ✅ Correct match: userId
        $match: {
          userId: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "flashcards",
          localField: "_id",
          foreignField: "document",
          as: "flashcardSets",
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "_id",
          foreignField: "document",
          as: "quizzes",
        },
      },
      {
        $addFields: {
          flashcardCount: { $size: "$flashcardSets" },
          quizCount: { $size: "$quizzes" },
        },
      },
      {
        $project: {
          extractedText: 0,
          chunks: 0,
          flashcardSets: 0,
          quizzes: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single document
 * @route   GET /api/documents/:id
 * @access  Private
 */
export const getDocument = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid document ID",
      });
    }

    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id, // ✅ Correct
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id, // ✅ Correct
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    await Flashcard.deleteMany({ document: document._id });
    await Quiz.deleteMany({ document: document._id });

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update document title
 * @route   PUT /api/documents/:id
 * @access  Private
 */
export const updateDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id, // ✅ Correct
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    if (req.body.title) {
      document.title = req.body.title;
    }

    await document.save();

    res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

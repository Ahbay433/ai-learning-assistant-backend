import express from "express";

import {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  updateDocument,
} from "../controllers/documentController.js";

import protect from "../middleware/auth.js";
import upload from "../config/multer.js";

const router = express.Router();

// 🔐 Protect all document routes
router.use(protect);

/**
 * @route   POST /api/documents/upload
 * @desc    Upload PDF document
 * @access  Private
 */
router.post("/upload", upload.single("file"), uploadDocument);

/**
 * @route   GET /api/documents
 * @desc    Get all user documents
 * @access  Private
 */
router.get("/", getDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document
 * @access  Private
 */
router.get("/:id", getDocument);

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document title
 * @access  Private
 */
router.put("/:id", updateDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete("/:id", deleteDocument);

export default router;

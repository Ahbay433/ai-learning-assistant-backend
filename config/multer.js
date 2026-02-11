import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory: /uploads/documents
const uploadDir = path.join(__dirname, "../uploads/documents");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeFileName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${uniqueSuffix}-${safeFileName}`);
  },
});

// Allow only PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Default 10MB if env not set
    fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  },
});

export default upload;

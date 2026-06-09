import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the briefs upload directory exists
const briefUploadDir = path.join(__dirname, "..", "uploads", "briefs");
if (!fs.existsSync(briefUploadDir)) {
  fs.mkdirSync(briefUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, briefUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `brief-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif", ".svg",
    ".psd", ".ai", ".eps", ".pdf",
    ".max", ".3ds", ".obj", ".fbx", ".blend", ".skp",
    ".dwg", ".dxf",
    ".zip", ".rar", ".7z",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${ext}`), false);
  }
};

const briefUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

export default briefUpload;

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "3d-files");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter: accept common 3D file formats + archives
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    ".obj", ".fbx", ".stl", ".gltf", ".glb", ".blend",
    ".3ds", ".dae", ".ply", ".step", ".stp", ".iges",
    ".max", ".c4d", ".ma", ".mb", ".skp",
    ".zip", ".rar", ".7z",
    ".png", ".jpg", ".jpeg", ".tiff", ".psd", ".pdf",
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Type de fichier non autorisé: ${ext}. Extensions acceptées: ${allowedExtensions.join(", ")}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max
  },
});

export default upload;

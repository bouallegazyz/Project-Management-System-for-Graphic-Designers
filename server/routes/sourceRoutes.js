import express from "express";
import { protectRoute, isAdminRoute } from "../middlewares/authMiddleware.js";
import sourceUpload from "../middlewares/sourceUploadMiddleware.js";
import { uploadSources, getSources, deleteSource, downloadSource } from "../controllers/sourceController.js";

const router = express.Router();

// Admin: upload source files to a recipient (multiple files)
router.post("/upload", protectRoute, isAdminRoute, sourceUpload.array("files"), uploadSources);

// List source files (admin sees all, user sees own received)
router.get("/", protectRoute, getSources);

// Download one source file
router.get("/:id/download", protectRoute, downloadSource);

// Delete (admin, sender, or recipient)
router.delete("/:id", protectRoute, deleteSource);

export default router;

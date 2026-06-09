import express from "express";
import { protectRoute, isAdminRoute } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  uploadFile3D,
  getFiles3D,
  getFile3D,
  reviewFile3D,
  deleteFile3D,
} from "../controllers/fileController.js";

const router = express.Router();

// Upload a 3D file (any authenticated user / graphic designer)
router.post("/upload", protectRoute, upload.single("file"), uploadFile3D);

// Get all files (admin sees all, user sees own)
router.get("/", protectRoute, getFiles3D);

// Get a single file
router.get("/:id", protectRoute, getFile3D);

// Admin: approve or reject a file
router.put("/review/:id", protectRoute, isAdminRoute, reviewFile3D);

// Delete a file
router.delete("/:id", protectRoute, deleteFile3D);

export default router;

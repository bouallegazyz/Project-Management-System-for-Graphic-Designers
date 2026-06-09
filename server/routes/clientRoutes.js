import express from "express";
import { protectRoute, isAdminRoute } from "../middlewares/authMiddleware.js";
import briefUpload from "../middlewares/briefUploadMiddleware.js";
import {
  createBrief,
  getBriefs,
  getBrief,
  updateBriefStatus,
  deleteBrief,
  downloadBriefFile,
  downloadBriefFiles,
} from "../controllers/briefController.js";
import {
  createAnnotation,
  getAnnotations,
  resolveAnnotation,
  deleteAnnotation,
  updateAnnotation,
  submitCorrections,
  approveModel,
  getClientGallery,
} from "../controllers/clientController.js";

const router = express.Router();

// ─── Briefs ───
router.post("/briefs", protectRoute, briefUpload.array("files", 20), createBrief);
router.get("/briefs", protectRoute, getBriefs);
router.get("/briefs/:id/download", protectRoute, isAdminRoute, downloadBriefFiles);
router.get("/briefs/:id/files/:fileId/download", protectRoute, downloadBriefFile);
router.get("/briefs/:id", protectRoute, getBrief);
router.put("/briefs/:id", protectRoute, isAdminRoute, updateBriefStatus);
router.delete("/briefs/:id", protectRoute, deleteBrief);

// ─── Annotations (Visual Feedback) ───
router.post("/annotations", protectRoute, createAnnotation);
router.get("/annotations/:fileId", protectRoute, getAnnotations);
router.put("/annotations/resolve/:id", protectRoute, resolveAnnotation);
router.delete("/annotations/:id", protectRoute, deleteAnnotation);
router.put("/annotations/:id", protectRoute, updateAnnotation);
router.post("/annotations/submit/:fileId", protectRoute, submitCorrections);
router.post("/approve/:fileId", protectRoute, approveModel);

// ─── Gallery (approved files) ───
router.get("/gallery", protectRoute, getClientGallery);

export default router;

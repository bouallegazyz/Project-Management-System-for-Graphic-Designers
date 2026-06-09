import File3D from "../models/file3d.js";
import Notice from "../models/notification.js";
import mongoose from "mongoose";
import Task from "../models/task.js";

// ─── Upload a 3D file (Graphic Designer) ───
export const uploadFile3D = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: "Aucun fichier fourni." });
    }

    const { taskId, description } = req.body;
    const userId = req.user?.userId;

    if (!taskId) {
      return res.status(400).json({
        status: false,
        message: "taskId est obligatoire. Veuillez associer ce fichier a une tache existante.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: false,
        message: "taskId invalide.",
      });
    }

    const existingTask = await Task.findById(taskId).select("_id");
    if (!existingTask) {
      return res.status(400).json({
        status: false,
        message: "La tache associee n'existe pas.",
      });
    }

    const file3d = await File3D.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: `/uploads/3d-files/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      task: taskId,
      uploadedBy: userId,
      description: description || "",
      status: "pending",
    });

    // Notify admins about the new upload
    await Notice.create({
      team: [], // will notify admins
      text: `Un nouveau fichier 3D "${req.file.originalname}" a été soumis pour validation.`,
      task: taskId,
    });

    res.status(201).json({
      status: true,
      message: "Fichier uploadé avec succès. En attente de validation.",
      file: file3d,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Get all files (with optional filters) ───
export const getFiles3D = async (req, res) => {
  try {
    const { status, uploadedBy } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (uploadedBy) filter.uploadedBy = uploadedBy;

    // If not admin, only show own files
    if (!req.user?.isAdmin) {
      filter.uploadedBy = req.user?.userId;
    }

    const files = await File3D.find(filter)
      .populate("uploadedBy", "fullname email")
      .populate("task", "title orderName clientName")
      .populate("reviewedBy", "fullname")
      .sort({ createdAt: -1 });

    res.status(200).json({ status: true, files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Get a single file by ID ───
export const getFile3D = async (req, res) => {
  try {
    const file = await File3D.findById(req.params.id)
      .populate("uploadedBy", "fullname email")
      .populate("task", "title orderName clientName")
      .populate("reviewedBy", "fullname");

    if (!file) {
      return res.status(404).json({ status: false, message: "Fichier non trouvé." });
    }

    res.status(200).json({ status: true, file });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Admin: Review (approve/reject) a file ───
export const reviewFile3D = async (req, res) => {
  try {
    const { status, adminComment } = req.body;
    const fileId = req.params.id;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Le statut doit être 'approved' ou 'rejected'.",
      });
    }

    const file = await File3D.findById(fileId);
    if (!file) {
      return res.status(404).json({ status: false, message: "Fichier non trouvé." });
    }

    file.status = status;
    file.adminComment = adminComment || "";
    file.reviewedBy = req.user?.userId;
    file.reviewedAt = new Date();
    await file.save();

    // Notify the uploader about the review result
    const statusText = status === "approved" ? "approuvé ✅" : "rejeté ❌";
    await Notice.create({
      team: [file.uploadedBy],
      text: `Votre fichier 3D "${file.originalName}" a été ${statusText}.${
        adminComment ? ` Commentaire: ${adminComment}` : ""
      }`,
      task: file.task || null,
    });

    res.status(200).json({
      status: true,
      message: `Fichier ${statusText} avec succès.`,
      file,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Delete a file ───
export const deleteFile3D = async (req, res) => {
  try {
    const file = await File3D.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ status: false, message: "Fichier non trouvé." });
    }

    // Only uploader or admin can delete
    if (
      !req.user?.isAdmin &&
      file.uploadedBy.toString() !== req.user?.userId?.toString()
    ) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    await File3D.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: "Fichier supprimé avec succès.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

import SourceFile from "../models/sourceFile.js";
import Notice from "../models/notification.js";
import fsPromises from "fs/promises";
import {
  deleteCloudinaryAsset,
  generateSignedDownloadUrl,
  isCloudinaryConfigured,
  uploadFileToCloudinary,
} from "../utils/cloudinary.js";

const sourcesCloudFolder = process.env.CLOUDINARY_SOURCES_FOLDER || "bloomworks/sources";

const buildSourceDownloadPath = (sourceId) => `/api/sources/${sourceId}/download`;

const toSourceWithResolvedPath = (sourceDoc) => {
  const source = sourceDoc?.toObject ? sourceDoc.toObject() : sourceDoc;
  if (!source) return source;

  if (source.cloudinaryId) {
    source.filePath = buildSourceDownloadPath(source._id);
  }

  return source;
};

const cleanupLocalFile = async (localPath) => {
  if (!localPath) return;
  try {
    await fsPromises.unlink(localPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Impossible de supprimer le fichier temporaire ${localPath}: ${error.message}`);
    }
  }
};

const sanitizeText = (value) => (typeof value === "string" ? value.trim() : "");

const buildSourcePayload = async ({ file, description, taskId, senderId, recipientId, orderName, clientName }) => {
  const normalizedOrderName = sanitizeText(orderName);
  const normalizedClientName = sanitizeText(clientName);

  if (!isCloudinaryConfigured()) {
    return {
      originalName: file.originalname,
      fileName: file.filename,
      filePath: `/uploads/sources/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      description: description || "",
      orderName: normalizedOrderName,
      clientName: normalizedClientName,
      task: taskId || null,
      sender: senderId,
      recipient: recipientId,
    };
  }

  try {
    const uploaded = await uploadFileToCloudinary({
      localFilePath: file.path,
      originalName: file.originalname,
      folder: sourcesCloudFolder,
      publicIdPrefix: "source",
    });

    return {
      originalName: file.originalname,
      fileName: uploaded.cloudinaryId.split("/").pop(),
      filePath: "/pending/cloud-upload",
      fileSize: uploaded.bytes || file.size,
      mimeType: file.mimetype,
      cloudinaryId: uploaded.cloudinaryId,
      cloudinaryResourceType: uploaded.resourceType,
      cloudinaryFormat: uploaded.format,
      description: description || "",
      orderName: normalizedOrderName,
      clientName: normalizedClientName,
      task: taskId || null,
      sender: senderId,
      recipient: recipientId,
    };
  } finally {
    await cleanupLocalFile(file.path);
  }
};

// Admin: upload source files to a specific recipient
export const uploadSources = async (req, res) => {
  try {
    const senderId = req.user?.userId;
    const { recipientId, description, taskId, orderName, clientName } = req.body;
    const normalizedOrderName = sanitizeText(orderName);
    const normalizedClientName = sanitizeText(clientName);

    if (!recipientId) {
      return res.status(400).json({ status: false, message: "recipientId requis." });
    }
    if ((normalizedOrderName && !normalizedClientName) || (!normalizedOrderName && normalizedClientName)) {
      return res.status(400).json({
        status: false,
        message: "Ajoutez à la fois le nom de commande et le nom du client.",
      });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: false, message: "Aucun fichier fourni." });
    }

    const created = [];
    for (const file of req.files) {
      const payload = await buildSourcePayload({
        file,
        description,
        taskId,
        senderId,
        recipientId,
        orderName: normalizedOrderName,
        clientName: normalizedClientName,
      });

      const source = await SourceFile.create(payload);

      if (source.cloudinaryId) {
        source.filePath = buildSourceDownloadPath(source._id);
        await source.save();
      }

      created.push(toSourceWithResolvedPath(source));
    }

    // Notify recipient
    await Notice.create({
      team: [recipientId],
      text: `Vous avez reçu ${created.length} fichier(s) source de l'admin.`,
      task: taskId || null,
    });

    res.status(201).json({ status: true, message: "Fichiers envoyés.", files: created });
  } catch (error) {
    console.error("❌ Error uploading sources:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ 
      status: false, 
      message: `Erreur lors de l'upload: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get source files (admin sees all, user sees files sent to them)
export const getSources = async (req, res) => {
  try {
    const { recipientId } = req.query;
    const filter = {};

    if (req.user?.isAdmin) {
      if (recipientId) filter.recipient = recipientId;
    } else {
      filter.recipient = req.user?.userId;
    }

    const files = await SourceFile.find(filter)
      .populate("sender", "fullname email")
      .populate("recipient", "fullname email")
      .populate("task", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({ status: true, files: files.map((file) => toSourceWithResolvedPath(file)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// Download source file (admin, sender, or recipient)
export const downloadSource = async (req, res) => {
  try {
    const file = await SourceFile.findById(req.params.id);
    if (!file) return res.status(404).json({ status: false, message: "Fichier non trouvé." });

    const currentUserId = req.user?.userId?.toString();
    const isSender = file.sender?.toString() === currentUserId;
    const isRecipient = file.recipient?.toString() === currentUserId;

    if (!req.user?.isAdmin && !isSender && !isRecipient) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    if (file.cloudinaryId) {
      if (!isCloudinaryConfigured()) {
        return res.status(500).json({
          status: false,
          message: "Cloudinary non configuré sur le serveur.",
        });
      }

      const signedUrl = generateSignedDownloadUrl({
        cloudinaryId: file.cloudinaryId,
        resourceType: file.cloudinaryResourceType || "raw",
        format: file.cloudinaryFormat,
      });

      return res.redirect(signedUrl);
    }

    if (file.filePath?.startsWith("/uploads/")) {
      return res.redirect(file.filePath);
    }

    return res.status(404).json({ status: false, message: "Chemin de fichier invalide." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// Optional: delete a source file (admin only or sender)
export const deleteSource = async (req, res) => {
  try {
    const file = await SourceFile.findById(req.params.id);
    if (!file) return res.status(404).json({ status: false, message: "Fichier non trouvé." });

    const currentUserId = req.user?.userId?.toString();
    const isSender = file.sender?.toString() === currentUserId;
    const isRecipient = file.recipient?.toString() === currentUserId;

    if (!req.user?.isAdmin && !isSender && !isRecipient) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    if (file.cloudinaryId && isCloudinaryConfigured()) {
      try {
        await deleteCloudinaryAsset({
          cloudinaryId: file.cloudinaryId,
          resourceType: file.cloudinaryResourceType || "raw",
        });
      } catch (cloudError) {
        console.warn(`Suppression Cloudinary échouée pour ${file._id}: ${cloudError.message}`);
      }
    }

    await SourceFile.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: true, message: "Fichier supprimé." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

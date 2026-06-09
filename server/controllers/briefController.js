import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";

import Brief from "../models/brief.js";
import Notice from "../models/notification.js";
import {
  deleteCloudinaryAsset,
  generateSignedDownloadUrl,
  isCloudinaryConfigured,
  uploadFileToCloudinary,
} from "../utils/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, "../uploads");
const briefsCloudFolder = process.env.CLOUDINARY_BRIEFS_FOLDER || "bloomworks/briefs";

const buildBriefFileDownloadPath = (briefId, fileId) =>
  `/api/client/briefs/${briefId}/files/${fileId}/download`;

const toBriefWithResolvedPaths = (briefDoc) => {
  const brief = briefDoc?.toObject ? briefDoc.toObject() : briefDoc;
  if (!brief) return brief;

  brief.files = (brief.files || []).map((file) => {
    if (!file?.cloudinaryId) return file;
    return {
      ...file,
      filePath: buildBriefFileDownloadPath(brief._id, file._id),
    };
  });

  return brief;
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

const mapUploadedBriefFile = async (file) => {
  if (!isCloudinaryConfigured()) {
    return {
      originalName: file.originalname,
      fileName: file.filename,
      filePath: `/uploads/briefs/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  try {
    const uploaded = await uploadFileToCloudinary({
      localFilePath: file.path,
      originalName: file.originalname,
      folder: briefsCloudFolder,
      publicIdPrefix: "brief",
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
    };
  } finally {
    await cleanupLocalFile(file.path);
  }
};

const cleanupBriefCloudAssets = async (brief) => {
  if (!isCloudinaryConfigured()) return;

  const files = brief?.files || [];
  const cloudFiles = files.filter((file) => file?.cloudinaryId);

  if (cloudFiles.length === 0) return;

  await Promise.allSettled(
    cloudFiles.map((file) =>
      deleteCloudinaryAsset({
        cloudinaryId: file.cloudinaryId,
        resourceType: file.cloudinaryResourceType || "raw",
      })
    )
  );
};

// ─── Create a new brief (Client) ───
export const createBrief = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user?.userId;

    const files = await Promise.all((req.files || []).map((f) => mapUploadedBriefFile(f)));

    const brief = await Brief.create({
      title,
      description: description || "",
      client: userId,
      files,
      status: "submitted",
    });

    if (isCloudinaryConfigured()) {
      let hasPathUpdates = false;
      for (const file of brief.files || []) {
        if (!file.cloudinaryId) continue;
        const nextPath = buildBriefFileDownloadPath(brief._id, file._id);
        if (file.filePath !== nextPath) {
          file.filePath = nextPath;
          hasPathUpdates = true;
        }
      }
      if (hasPathUpdates) {
        await brief.save();
      }
    }

    // Notify admins
    await Notice.create({
      team: [],
      text: `Nouveau brief "${title}" soumis par un client.`,
      task: null,
    });

    res.status(201).json({
      status: true,
      message: "Brief soumis avec succès.",
      brief: toBriefWithResolvedPaths(brief),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Get briefs (client sees own, admin sees all) ───
export const getBriefs = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    // Non-admin users only see their own briefs
    if (!req.user?.isAdmin) {
      filter.client = req.user?.userId;
    }

    const briefs = await Brief.find(filter)
      .populate("client", "fullname email")
      .populate("task", "title stage")
      .sort({ createdAt: -1 });

    res.status(200).json({ status: true, briefs: briefs.map((b) => toBriefWithResolvedPaths(b)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Get single brief ───
export const getBrief = async (req, res) => {
  try {
    const brief = await Brief.findById(req.params.id)
      .populate("client", "fullname email")
      .populate("task", "title stage");

    if (!brief) {
      return res.status(404).json({ status: false, message: "Brief non trouvé." });
    }

    res.status(200).json({ status: true, brief: toBriefWithResolvedPaths(brief) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Admin: Update brief status ───
export const updateBriefStatus = async (req, res) => {
  try {
    const { status, adminNotes, taskId } = req.body;
    const brief = await Brief.findById(req.params.id);

    if (!brief) {
      return res.status(404).json({ status: false, message: "Brief non trouvé." });
    }

    if (status) brief.status = status;
    if (adminNotes !== undefined) brief.adminNotes = adminNotes;
    if (taskId) brief.task = taskId;
    await brief.save();

    // Notify client
    const statusLabels = {
      submitted: "soumis",
      "in-progress": "en cours de traitement",
      completed: "terminé",
      cancelled: "annulé",
    };
    await Notice.create({
      team: [brief.client],
      text: `Votre brief "${brief.title}" est maintenant ${statusLabels[brief.status] || brief.status}.`,
      task: brief.task || null,
    });

    res.status(200).json({ status: true, message: "Brief mis à jour.", brief });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Delete brief ───
export const deleteBrief = async (req, res) => {
  try {
    const brief = await Brief.findById(req.params.id);
    if (!brief) {
      return res.status(404).json({ status: false, message: "Brief non trouvé." });
    }

    if (!req.user?.isAdmin && brief.client.toString() !== req.user?.userId?.toString()) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    await cleanupBriefCloudAssets(brief);
    await Brief.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: true, message: "Brief supprimé." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Download single brief file (admin or owner) ───
export const downloadBriefFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const brief = await Brief.findById(id);

    if (!brief) {
      return res.status(404).json({ status: false, message: "Brief non trouvé." });
    }

    const isOwner = brief.client?.toString() === req.user?.userId?.toString();
    if (!req.user?.isAdmin && !isOwner) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    const file = brief.files?.id(fileId);
    if (!file) {
      return res.status(404).json({ status: false, message: "Fichier introuvable." });
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

// ─── Download brief files as ZIP ───
export const downloadBriefFiles = async (req, res) => {
  try {
    const brief = await Brief.findById(req.params.id);

    if (!brief) {
      return res.status(404).json({ status: false, message: "Brief non trouvé." });
    }

    // Verify admin access
    if (!req.user?.isAdmin) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    if (!brief.files || brief.files.length === 0) {
      return res.status(400).json({ status: false, message: "Aucun fichier à télécharger." });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${brief.title.replace(/[^a-z0-9]/gi, '_')}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of brief.files) {
      if (file.cloudinaryId) {
        if (!isCloudinaryConfigured()) {
          continue;
        }

        try {
          const signedUrl = generateSignedDownloadUrl({
            cloudinaryId: file.cloudinaryId,
            resourceType: file.cloudinaryResourceType || "raw",
            format: file.cloudinaryFormat,
          });

          const response = await fetch(signedUrl);
          if (!response.ok) {
            console.warn(`Échec du téléchargement Cloudinary pour ${file.originalName}: ${response.status}`);
            continue;
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          archive.append(buffer, { name: file.originalName });
        } catch (cloudError) {
          console.warn(`Impossible d'ajouter ${file.originalName} au ZIP: ${cloudError.message}`);
        }
        continue;
      }

      if (file.filePath?.startsWith('/uploads/')) {
        const localFilePath = path.join(uploadsPath, file.filePath.replace('/uploads/', ''));
        if (fs.existsSync(localFilePath)) {
          archive.file(localFilePath, { name: file.originalName });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};
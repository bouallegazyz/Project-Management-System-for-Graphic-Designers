import Annotation from "../models/annotation.js";
import Notice from "../models/notification.js";
import File3D from "../models/file3d.js";

// ─── Create annotation (click on image) ───
export const createAnnotation = async (req, res) => {
  try {
    const { fileId, x, y, comment } = req.body;
    const userId = req.user?.userId;

    if (!fileId || x === undefined || y === undefined || !comment) {
      return res.status(400).json({
        status: false,
        message: "fileId, x, y et comment sont requis.",
      });
    }

    const annotation = await Annotation.create({
      file: fileId,
      author: userId,
      position: { x, y },
      comment,
    });

    // Notify relevant people
    const file = await File3D.findById(fileId);
    if (file) {
      const notifyUsers = [file.uploadedBy];
      await Notice.create({
        team: notifyUsers,
        text: `Nouvelle annotation sur le fichier "${file.originalName}": "${comment.substring(0, 50)}..."`,
        task: file.task || null,
      });
    }

    const populated = await Annotation.findById(annotation._id)
      .populate("author", "fullname email");

    res.status(201).json({
      status: true,
      message: "Annotation ajoutée.",
      annotation: populated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Get annotations for a file ───
export const getAnnotations = async (req, res) => {
  try {
    const { fileId } = req.params;

    const annotations = await Annotation.find({ file: fileId })
      .populate("author", "fullname email")
      .populate("resolvedBy", "fullname")
      .sort({ createdAt: -1 });

    res.status(200).json({ status: true, annotations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Resolve an annotation ───
export const resolveAnnotation = async (req, res) => {
  try {
    const annotation = await Annotation.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ status: false, message: "Annotation non trouvée." });
    }

    annotation.resolved = true;
    annotation.resolvedBy = req.user?.userId;
    annotation.resolvedAt = new Date();
    await annotation.save();

    res.status(200).json({ status: true, message: "Annotation résolue.", annotation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Delete annotation ───
export const deleteAnnotation = async (req, res) => {
  try {
    const annotation = await Annotation.findById(req.params.id);
    if (!annotation) {
      return res.status(404).json({ status: false, message: "Annotation non trouvée." });
    }

    if (
      !req.user?.isAdmin &&
      annotation.author.toString() !== req.user?.userId?.toString()
    ) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    await Annotation.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: true, message: "Annotation supprimée." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Update annotation comment ───
export const updateAnnotation = async (req, res) => {
  try {
    const { comment } = req.body;
    const ann = await Annotation.findById(req.params.id);
    if (!ann) {
      return res.status(404).json({ status: false, message: "Annotation non trouvée." });
    }

    // Only author or admin can edit
    if (
      !req.user?.isAdmin && ann.author.toString() !== req.user?.userId?.toString()
    ) {
      return res.status(403).json({ status: false, message: "Non autorisé." });
    }

    if (typeof comment === "string" && comment.trim().length > 0) {
      ann.comment = comment.trim();
    }
    await ann.save();

    const populated = await Annotation.findById(ann._id)
      .populate("author", "fullname email");

    res.status(200).json({ status: true, message: "Annotation mise à jour.", annotation: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Submit all corrections for a file (notify uploader/admins) ───
export const submitCorrections = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File3D.findById(fileId);
    if (!file) {
      return res.status(404).json({ status: false, message: "Fichier non trouvé." });
    }

    const count = await Annotation.countDocuments({ file: fileId });

    await Notice.create({
      team: [file.uploadedBy],
      text: `Le client a envoyé ${count} correction(s) pour "${file.originalName}".`,
      task: file.task || null,
    });

    res.status(200).json({ status: true, message: "Corrections envoyées." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// ─── Client approves the model (notify admins/uploader) ───
export const approveModel = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File3D.findById(fileId);
    if (!file) {
      return res.status(404).json({ status: false, message: "Fichier non trouvé." });
    }

    await Notice.create({
      team: [file.uploadedBy],
      text: `Le client a approuvé le modèle "${file.originalName}".`,
      task: file.task || null,
    });

    res.status(200).json({ status: true, message: "Approbation envoyée." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};
// ─── Get client gallery (approved files for this client's briefs) ───
export const getClientGallery = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Get approved files — admin sees all, client sees only their related ones
    const filter = { status: "approved" };

    const files = await File3D.find(filter)
      .populate("uploadedBy", "fullname email")
      .populate("task", "title")
      .populate("reviewedBy", "fullname")
      .sort({ reviewedAt: -1 });

    res.status(200).json({ status: true, files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

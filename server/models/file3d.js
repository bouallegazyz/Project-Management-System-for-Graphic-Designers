import mongoose from "mongoose";

const file3dSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String },
    // Link to the task this file belongs to (optional)
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    // The graphic designer who uploaded
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Admin validation status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Admin comment when approving/rejecting
    adminComment: { type: String },
    // Admin who reviewed
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    // Description from the graphic designer
    description: { type: String },
  },
  { timestamps: true }
);

const File3D = mongoose.model("File3D", file3dSchema);
export default File3D;

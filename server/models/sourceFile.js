import mongoose from "mongoose";

const sourceFileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String },
    cloudinaryId: { type: String },
    cloudinaryResourceType: { type: String },
    cloudinaryFormat: { type: String },
    description: { type: String },
    orderName: { type: String, trim: true, default: "" },
    clientName: { type: String, trim: true, default: "" },
    // Optional link to a task this source relates to
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    // Admin who sent the source file
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Recipient user who should receive/download the source file
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const SourceFile = mongoose.model("SourceFile", sourceFileSchema);
export default SourceFile;

import mongoose from "mongoose";

const briefFileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String },
  cloudinaryId: { type: String },
  cloudinaryResourceType: { type: String },
  cloudinaryFormat: { type: String },
});

const briefSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    // The client who submitted the brief
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Multiple source files attached
    files: [briefFileSchema],
    // Status tracking
    status: {
      type: String,
      enum: ["submitted", "in-progress", "completed", "cancelled"],
      default: "submitted",
    },
    // Optional link to a task created from this brief
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    // Admin notes
    adminNotes: { type: String },
  },
  { timestamps: true }
);

const Brief = mongoose.model("Brief", briefSchema);
export default Brief;

import mongoose from "mongoose";

const annotationSchema = new mongoose.Schema(
  {
    // The 3D file / image being annotated
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File3D",
      required: true,
    },
    // Who placed the annotation
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Click position on the image (percentage-based for responsiveness)
    position: {
      x: { type: Number, required: true }, // % from left
      y: { type: Number, required: true }, // % from top
    },
    // The comment text
    comment: { type: String, required: true },
    // Is it resolved?
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

const Annotation = mongoose.model("Annotation", annotationSchema);
export default Annotation;

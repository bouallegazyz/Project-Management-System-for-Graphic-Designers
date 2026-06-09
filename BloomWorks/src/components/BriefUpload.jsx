import React, { useState, useRef } from "react";
import {
  useCreateBriefMutation,
  useGetBriefsQuery,
  useDeleteBriefMutation,
} from "../redux/slices/apiSlice";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import {
  MdCloudUpload,
  MdInsertDriveFile,
  MdDelete,
  MdClose,
  MdDescription,
  MdDownload,
} from "react-icons/md";

const API_URL = "http://localhost:8800";

const BRIEF_STATUS = {
  submitted: { label: "Soumis", bg: "bg-blue-100", text: "text-blue-700" },
  "in-progress": { label: "En cours", bg: "bg-yellow-100", text: "text-yellow-700" },
  completed: { label: "Terminé", bg: "bg-green-100", text: "text-green-700" },
  cancelled: { label: "Annulé", bg: "bg-red-100", text: "text-red-700" },
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const BriefUpload = () => {
  const [createBrief, { isLoading: isUploading }] = useCreateBriefMutation();
  const { data, isLoading, refetch } = useGetBriefsQuery({});
  const [deleteBrief] = useDeleteBriefMutation();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const briefs = data?.briefs || [];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Veuillez saisir un titre pour le brief.");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Veuillez joindre au moins un fichier.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    selectedFiles.forEach((f) => formData.append("files", f));

    try {
      await createBrief(formData).unwrap();
      toast.success("Brief soumis avec succès !");
      setTitle("");
      setDescription("");
      setSelectedFiles([]);
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Erreur lors de la soumission.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce brief ?")) return;
    try {
      await deleteBrief(id).unwrap();
      toast.success("Brief supprimé.");
    } catch (err) {
      toast.error(err?.data?.message || "Erreur.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MdDescription className="text-blue-500" />
          Dépôt de Brief
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <MdCloudUpload />
          {showForm ? "Fermer" : "Nouveau Brief"}
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre du projet *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Rendu 3D salon moderne"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description du brief
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre projet en détail : style souhaité, dimensions, matériaux..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* File Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fichiers sources *
              </label>
              <div
                className={clsx(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                )}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.tiff,.bmp,.gif,.svg,.psd,.ai,.eps,.pdf,.max,.3ds,.obj,.fbx,.blend,.skp,.dwg,.dxf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
                <MdCloudUpload className="text-4xl text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  Glissez vos fichiers ici ou cliquez pour parcourir
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Images, plans, .max, .pdf, .zip... (Max 500 MB par fichier)
                </p>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <MdInsertDriveFile className="text-blue-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-gray-400 shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <MdClose />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isUploading}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-medium text-sm transition",
                isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <MdCloudUpload className="text-lg" />
                  Soumettre le brief
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Briefs List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : briefs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
          <MdDescription className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucun brief soumis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => {
            const st = BRIEF_STATUS[brief.status] || BRIEF_STATUS.submitted;
            return (
              <div
                key={brief._id}
                className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-800">{brief.title}</h4>
                      <span
                        className={clsx(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium",
                          st.bg,
                          st.text
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                    {brief.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {brief.description}
                      </p>
                    )}
                    {brief.adminNotes && (
                      <p className="text-xs text-gray-500 italic mb-2">
                        💬 Admin: {brief.adminNotes}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        {new Date(brief.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>{brief.files?.length || 0} fichier(s)</span>
                    </div>
                    {/* File chips */}
                    {brief.files && brief.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {brief.files.map((f, i) => (
                          <a
                            key={i}
                            href={`${API_URL}${f.filePath}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 px-2 py-1 rounded-md text-xs transition"
                          >
                            <MdDownload className="text-xs" />
                            {f.originalName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(brief._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 ml-3"
                    title="Supprimer"
                  >
                    <MdDelete className="text-lg" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BriefUpload;

import React, { useState, useRef } from "react";
import {
  useUploadFile3DMutation,
  useGetFiles3DQuery,
  useReviewFile3DMutation,
  useDeleteFile3DMutation,
} from "../redux/slices/apiSlice";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import {
  MdCloudUpload,
  MdCheckCircle,
  MdCancel,
  MdDelete,
  MdDownload,
  MdInsertDriveFile,
  MdPending,
  MdClose,
} from "react-icons/md";

const API_URL = "http://localhost:8800";

const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    icon: MdPending,
  },
  approved: {
    label: "Approuvé",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: MdCheckCircle,
  },
  rejected: {
    label: "Rejeté",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: MdCancel,
  },
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ─── Upload Form ───
const UploadForm = ({ onClose, tasks = [] }) => {
  const [uploadFile3D, { isLoading }] = useUploadFile3DMutation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier.");
      return;
    }
    if (!taskId) {
      toast.error("Veuillez sélectionner la tâche (commande/client) associée.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("description", description);
    formData.append("taskId", taskId);

    try {
      await uploadFile3D(formData).unwrap();
      toast.success("Fichier uploadé avec succès !");
      setSelectedFile(null);
      setDescription("");
      setTaskId("");
      if (onClose) onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Erreur lors de l'upload.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={clsx(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
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
          onChange={handleFileSelect}
          className="hidden"
          accept=".obj,.fbx,.stl,.gltf,.glb,.blend,.3ds,.dae,.ply,.step,.stp,.iges,.max,.c4d,.ma,.mb,.skp,.zip,.rar,.7z,.png,.jpg,.jpeg,.tiff,.psd,.pdf"
        />
        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <MdInsertDriveFile className="text-4xl text-blue-500" />
            <p className="font-medium text-gray-800">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {formatFileSize(selectedFile.size)}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="text-red-500 text-sm hover:underline mt-1"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <MdCloudUpload className="text-5xl text-gray-400" />
            <p className="text-gray-600 font-medium">
              Glissez un fichier 3D ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-gray-400">
              Formats: .obj, .fbx, .stl, .gltf, .glb, .blend, .zip, .rar...
              (Max 500 MB)
            </p>
          </div>
        )}
      </div>

      {/* Task Association */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Associer à une tâche
        </label>
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Sélectionner une tâche --</option>
          {tasks.map((t) => (
            <option key={t._id} value={t._id}>
              {`${t.title}${t.orderName ? ` | Commande: ${t.orderName}` : ""}${t.clientName ? ` | Client: ${t.clientName}` : ""}`}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez le fichier soumis..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !selectedFile || !taskId}
        className={clsx(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-medium text-sm transition",
          isLoading || !selectedFile || !taskId
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Upload en cours...
          </>
        ) : (
          <>
            <MdCloudUpload className="text-lg" />
            Soumettre le fichier
          </>
        )}
      </button>
    </form>
  );
};

// ─── Admin Review Modal ───
const ReviewModal = ({ file, onClose }) => {
  const [reviewFile3D, { isLoading }] = useReviewFile3DMutation();
  const [comment, setComment] = useState("");

  const handleReview = async (status) => {
    try {
      await reviewFile3D({
        id: file._id,
        status,
        adminComment: comment,
      }).unwrap();
      toast.success(
        status === "approved" ? "Fichier approuvé !" : "Fichier rejeté."
      );
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Erreur lors de la validation.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <MdClose className="text-xl" />
        </button>

        <h3 className="text-lg font-semibold mb-4">Valider le fichier</h3>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="font-medium text-sm">{file.originalName}</p>
          <p className="text-xs text-gray-500 mt-1">
            Uploadé par: {file.uploadedBy?.fullname || "N/A"}
          </p>
          {file.description && (
            <p className="text-xs text-gray-600 mt-2">{file.description}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Laissez un commentaire..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleReview("approved")}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            <MdCheckCircle /> Approuver
          </button>
          <button
            onClick={() => handleReview("rejected")}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            <MdCancel /> Rejeter
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───
const UploadFile3D = ({ availableTasks = [] }) => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.isAdmin;

  const { data, isLoading, refetch } = useGetFiles3DQuery({});
  const [deleteFile3D] = useDeleteFile3DMutation();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [reviewFile, setReviewFile] = useState(null);

  const files = data?.files || [];

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce fichier ?")) return;
    try {
      await deleteFile3D(id).unwrap();
      toast.success("Fichier supprimé.");
    } catch (err) {
      toast.error(err?.data?.message || "Erreur lors de la suppression.");
    }
  };

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          📁 Fichiers 3D soumis
        </h3>
        {!isAdmin && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <MdCloudUpload className="text-lg" />
            {showUploadForm ? "Fermer" : "Soumettre un fichier"}
          </button>
        )}
      </div>

      {/* Upload Form (toggled) */}
      {showUploadForm && !isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h4 className="text-md font-semibold text-gray-700 mb-4">
            Nouveau fichier 3D
          </h4>
          <UploadForm
            tasks={availableTasks}
            onClose={() => {
              setShowUploadForm(false);
              refetch();
            }}
          />
        </div>
      )}

      {/* Files List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
          <MdInsertDriveFile className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucun fichier soumis pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => {
            const statusConf = STATUS_CONFIG[file.status];
            const StatusIcon = statusConf.icon;
            return (
              <div
                key={file._id}
                className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between hover:shadow-md transition"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <MdInsertDriveFile className="text-xl text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">
                      {file.originalName}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>
                        {new Date(file.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {file.uploadedBy && (
                        <>
                          <span>•</span>
                          <span>Par: {file.uploadedBy.fullname}</span>
                        </>
                      )}
                      {file.task && (
                        <>
                          <span>•</span>
                          <span>Tâche: {file.task.title}</span>
                        </>
                      )}
                      {file.task?.orderName && (
                        <>
                          <span>•</span>
                          <span>Commande: {file.task.orderName}</span>
                        </>
                      )}
                      {file.task?.clientName && (
                        <>
                          <span>•</span>
                          <span>Client: {file.task.clientName}</span>
                        </>
                      )}
                    </div>
                    {file.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {file.description}
                      </p>
                    )}
                    {file.adminComment && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        💬 Admin: {file.adminComment}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {/* Status Badge */}
                  <span
                    className={clsx(
                      "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
                      statusConf.bg,
                      statusConf.text
                    )}
                  >
                    <StatusIcon className="text-sm" />
                    {statusConf.label}
                  </span>

                  {/* Download */}
                  <a
                    href={`${API_URL}${file.filePath}`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Télécharger"
                  >
                    <MdDownload className="text-lg" />
                  </a>

                  {/* Admin: Review button */}
                  {isAdmin && file.status === "pending" && (
                    <button
                      onClick={() => setReviewFile(file)}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-medium hover:bg-indigo-700 transition"
                    >
                      Valider
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(file._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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

      {/* Review Modal */}
      {reviewFile && (
        <ReviewModal
          file={reviewFile}
          onClose={() => {
            setReviewFile(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default UploadFile3D;

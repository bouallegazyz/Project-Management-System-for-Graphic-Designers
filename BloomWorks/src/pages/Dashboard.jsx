import React, { useState, useRef } from "react";
import {
  useGetDashboardStatsQuery,
  useGetFiles3DQuery,
  useReviewFile3DMutation,
  useGetAnnotationsQuery,
  useUpdateTaskStageMutation,
} from "../redux/slices/apiSlice";
import { MdAdminPanelSettings, MdInsertDriveFile, MdCheckCircle, MdCancel, MdPending, MdDownload, MdClose, MdImage } from "react-icons/md";
import { FaNewspaper, FaUsers } from "react-icons/fa";
import { FaArrowsToDot } from "react-icons/fa6";
import { LuClipboard, LuClipboardList } from "react-icons/lu";

import clsx from "clsx";
import moment from "moment";
import { TASK_TYPE, PRIORITY_STYLES, BGS, getInitials } from "../utils";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import UploadFile3D from "../components/UploadFile3D";
import AdminSourceUpload from "../components/AdminSourceUpload";
import SourceInbox from "../components/SourceInbox";
import AddUser from "../components/AddUser";
import { useGetBriefsQuery, useUpdateBriefStatusMutation } from "../redux/slices/apiSlice";
import { MdDescription } from "react-icons/md";

const StatsCard = ({ label, count, icon, bgColor }) => {
  return (
    <div className="bloom-card rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-bloom-gray uppercase tracking-wide">
          {label}
        </p>
        <h2 className="text-2xl font-bold text-bloom-dark mt-1">{count}</h2>
        <p className="text-xs text-bloom-gray mt-1">111 last month</p>
      </div>
      <div
        className={clsx(
          "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg",
          bgColor
        )}
      >
        {icon}
      </div>
    </div>
  );
};

const USER_STAGE_OPTIONS = [
  { label: "TODO", value: "todo" },
  { label: "IN PROGRESS", value: "in-progress" },
  { label: "COMPLET", value: "completed" },
];

const STAGE_LABELS = {
  todo: "To do",
  "in-progress": "En cours",
  completed: "Complétée",
};

const TaskTable = ({ tasks, isAdmin }) => {
  const navigate = useNavigate();
  const [updateTaskStage] = useUpdateTaskStageMutation();
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const handleStageChange = async (taskId, stage) => {
    try {
      setUpdatingTaskId(taskId);
      await updateTaskStage({ id: taskId, stage }).unwrap();
      toast.success("Étape de tâche mise à jour");
    } catch (err) {
      toast.error(err?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="bloom-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-bloom-gray-light/30 text-left text-sm font-semibold text-bloom-gray">
              <th className="py-3 px-4">Tâche</th>
              <th className="py-3 px-4 whitespace-nowrap">Nom commande</th>
              <th className="py-3 px-4 whitespace-nowrap">Nom client</th>
              <th className="py-3 px-4 whitespace-nowrap">Étape</th>
              <th className="py-3 px-4 whitespace-nowrap">Priorité</th>
              <th className="py-3 px-4 whitespace-nowrap">Équipe</th>
              <th className="py-3 px-4 whitespace-nowrap">Date de création</th>
            </tr>
          </thead>
          <tbody>
            {tasks?.length ? (
              tasks.map((task) => (
                <tr
                  key={task._id}
                  className="border-b border-bloom-gray-light/20 hover:bg-bloom-pink/5 text-sm cursor-pointer transition-colors"
                  onClick={() => navigate(`/task/${task._id}`)}
                >
                  <td className="py-3 px-4 min-w-52">
                    <div className="flex items-center gap-2">
                      <div
                        className={clsx(
                          "w-3 h-3 rounded-full shrink-0",
                          TASK_TYPE[task.stage]
                        )}
                      />
                      <span className="text-bloom-dark line-clamp-1">{task.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-bloom-gray">{task.orderName || "-"}</td>
                  <td className="py-3 px-4 text-bloom-gray">{task.clientName || "-"}</td>
                  <td
                    className="py-3 px-4"
                    onClick={(e) => {
                      if (!isAdmin) e.stopPropagation();
                    }}
                  >
                    {!isAdmin ? (
                      <select
                        className="text-xs border border-bloom-gray-light rounded-lg px-2 py-1 bg-bloom-white focus:border-bloom-pink focus:ring-1 focus:ring-bloom-pink/20 outline-none"
                        value={task.stage}
                        disabled={updatingTaskId === task._id}
                        onChange={(e) => handleStageChange(task._id, e.target.value)}
                      >
                        {USER_STAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs capitalize px-2 py-1 rounded-lg bg-bloom-bg text-bloom-gray whitespace-nowrap">
                        {STAGE_LABELS[task.stage] || task.stage}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={clsx(
                        "flex items-center gap-1 capitalize whitespace-nowrap",
                        PRIORITY_STYLES[task.priority]
                      )}
                    >
                      {task.priority === "high"
                        ? "↑↑"
                        : task.priority === "medium"
                        ? "↑"
                        : ""}{" "}
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {task.team?.length ? (
                      <div className="flex -space-x-2">
                        {task.team.map((member, i) => (
                          <div
                            key={member._id || i}
                            className={clsx(
                              "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white",
                              BGS[i % BGS.length]
                            )}
                            title={member.fullname}
                          >
                            {getInitials(member.fullname)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-bloom-gray">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-bloom-gray whitespace-nowrap">
                    {moment(task.createdAt).fromNow()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center text-bloom-gray text-sm">
                  Aucune tâche disponible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UsersTable = ({ users, isAdmin, onAddUser }) => {
  return (
    <div className="bloom-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-bloom-gray-light/30">
        <h3 className="text-sm font-semibold text-bloom-dark">Utilisateurs</h3>
        {isAdmin && (
          <button
            onClick={onAddUser}
            className="px-4 py-2 bloom-btn text-white text-xs rounded-lg font-medium"
          >
            + Créer un utilisateur
          </button>
        )}
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-bloom-gray-light/30 text-left text-sm font-semibold text-bloom-gray">
            <th className="py-3 px-4">nom </th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Date de création</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((user) => (
            <tr key={user._id} className="border-b border-bloom-gray-light/20 text-sm hover:bg-bloom-pink/5 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bloom-gradient flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-bloom-pink/20">
                    {getInitials(user.fullname)}
                  </div>
                  <div>
                    <p className="text-bloom-dark font-medium">{user.fullname}</p>
                    <p className="text-xs text-bloom-gray">{user.title || user.role}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Active
                </span>
              </td>
              <td className="py-3 px-4 text-bloom-gray">
                {moment(user.createdAt).fromNow()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const API_URL = "http://localhost:8800";

const STATUS_CONFIG = {
  pending: { label: "En attente", bg: "bg-yellow-100", text: "text-yellow-700", icon: MdPending },
  approved: { label: "Approuvé", bg: "bg-green-100", text: "text-green-700", icon: MdCheckCircle },
  rejected: { label: "Rejeté", bg: "bg-red-100", text: "text-red-700", icon: MdCancel },
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ─── Review Modal for Dashboard ───
const DashboardReviewModal = ({ file, onClose }) => {
  const [reviewFile3D, { isLoading }] = useReviewFile3DMutation();
  const [comment, setComment] = useState("");

  const handleReview = async (status) => {
    try {
      await reviewFile3D({ id: file._id, status, adminComment: comment }).unwrap();
      toast.success(status === "approved" ? "Fichier approuvé !" : "Fichier rejeté.");
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Erreur lors de la validation.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-bloom-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-bloom-gray-light/30">
        <button onClick={onClose} className="absolute top-4 right-4 text-bloom-gray hover:text-bloom-pink transition-colors">
          <MdClose className="text-xl" />
        </button>
        <h3 className="text-lg font-bold text-bloom-dark mb-4">Valider le fichier</h3>
        <div className="bg-bloom-bg rounded-xl p-4 mb-4 border border-bloom-gray-light/30">
          <p className="font-medium text-sm text-bloom-dark">{file.originalName}</p>
          <p className="text-xs text-bloom-gray mt-1">Uploadé par: {file.uploadedBy?.fullname || "N/A"}</p>
          {file.description && <p className="text-xs text-bloom-gray mt-2">{file.description}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-bloom-dark mb-2">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Laissez un commentaire..."
            rows={3}
            className="w-full border border-bloom-gray-light rounded-xl px-4 py-3 text-sm focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 resize-none outline-none transition-all bg-bloom-bg/50"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleReview("approved")} disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-green-500/20">
            <MdCheckCircle /> Approuver
          </button>
          <button onClick={() => handleReview("rejected")} disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-bloom-pink hover:bg-bloom-pink/90 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-bloom-pink/20">
            <MdCancel /> Rejeter
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Files 3D Table for Dashboard ───
const Files3DSection = () => {
  const { data, isLoading, refetch } = useGetFiles3DQuery({});
  const [reviewFile, setReviewFile] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [filter, setFilter] = useState("all");

  const files = data?.files || [];
  const filteredFiles = filter === "all" ? files : files.filter((f) => f.status === filter);

  const counts = {
    all: files.length,
    pending: files.filter((f) => f.status === "pending").length,
    approved: files.filter((f) => f.status === "approved").length,
    rejected: files.filter((f) => f.status === "rejected").length,
  };

  if (isLoading) {
    return (
      <div className="bloom-card rounded-xl p-8 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bloom-pink" />
      </div>
    );
  }

  return (
    <div className="bloom-card rounded-xl overflow-hidden">
      {/* Header + Filters */}
      <div className="flex items-center justify-between p-4 border-b border-bloom-gray-light/30">
        <div className="flex items-center gap-2">
          <MdInsertDriveFile className="text-xl text-bloom-pink" />
          <h3 className="text-sm font-semibold text-bloom-dark">Fichiers 3D soumis</h3>
        </div>
        <div className="flex gap-1">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-medium transition",
                filter === f ? "bloom-gradient text-white shadow-md shadow-bloom-pink/20" : "bg-bloom-bg text-bloom-gray hover:bg-bloom-pink/10 hover:text-bloom-pink"
              )}
            >
              {f === "all" ? "Tous" : STATUS_CONFIG[f].label} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredFiles.length === 0 ? (
        <div className="p-8 text-center text-bloom-gray text-sm">Aucun fichier {filter !== "all" ? STATUS_CONFIG[filter]?.label.toLowerCase() : ""}</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-bloom-gray-light/30 text-left text-xs font-semibold text-bloom-gray uppercase">
              <th className="py-3 px-4">Fichier</th>
              <th className="py-3 px-4">Graphiste</th>
              <th className="py-3 px-4">Tâche</th>
              <th className="py-3 px-4">Commande</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Taille</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((file) => {
              const sc = STATUS_CONFIG[file.status];
              const StatusIcon = sc.icon;
              return (
                <tr key={file._id} className="border-b border-bloom-gray-light/20 hover:bg-bloom-pink/5 text-sm transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <MdInsertDriveFile className="text-bloom-coral" />
                      <button
                        className="text-bloom-dark truncate max-w-50 text-left hover:text-bloom-pink transition-colors"
                        title={file.originalName}
                        onClick={() => setViewFile(file)}
                      >
                        {file.originalName}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-bloom-gray">{file.uploadedBy?.fullname || "-"}</td>
                  <td className="py-3 px-4 text-bloom-gray">{file.task?.title || "-"}</td>
                  <td className="py-3 px-4 text-bloom-gray">{file.task?.orderName || "-"}</td>
                  <td className="py-3 px-4 text-bloom-gray">{file.task?.clientName || "-"}</td>
                  <td className="py-3 px-4 text-bloom-gray">{formatFileSize(file.fileSize)}</td>
                  <td className="py-3 px-4 text-bloom-gray">{moment(file.createdAt).fromNow()}</td>
                  <td className="py-3 px-4">
                    <span className={clsx("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit", sc.bg, sc.text)}>
                      <StatusIcon className="text-xs" /> {sc.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={`${API_URL}${file.filePath}`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-bloom-gray hover:text-bloom-pink hover:bg-bloom-pink/10 rounded-lg transition"
                        title="Télécharger"
                      >
                        <MdDownload className="text-base" />
                      </a>
                      {file.status === "pending" && (
                        <button
                          onClick={() => setReviewFile(file)}
                          className="px-2.5 py-1 bloom-gradient text-white text-xs rounded-lg font-medium shadow-md shadow-bloom-pink/20"
                        >
                          Valider
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {reviewFile && (
        <DashboardReviewModal
          file={reviewFile}
          onClose={() => { setReviewFile(null); refetch(); }}
        />
      )}

      {/* View file with annotations */}
      {viewFile && (
        <AdminFileLightbox file={viewFile} onClose={() => setViewFile(null)} />
      )}
    </div>
  );
};

// ─── Admin Lightbox with Annotations (read-only) ───
const AdminFileLightbox = ({ file, onClose }) => {
  const isImage = /\.(png|jpg|jpeg|tiff|bmp|gif)$/i.test(file.originalName);
  const containerRef = useRef(null);
  const { data: annData } = useGetAnnotationsQuery(file?._id, { skip: !file?._id });
  const annotations = annData?.annotations || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition z-50"
      >
        <MdClose className="text-2xl" />
      </button>
      <div className="max-w-5xl max-h-[85vh] mx-auto px-16">
        {isImage ? (
          <div ref={containerRef} className="relative max-w-full max-h-[80vh] flex items-center justify-center">
            <img
              src={`${API_URL}${file.filePath}`}
              alt={file.originalName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {annotations.map((a) => (
              <div
                key={a._id}
                className="absolute"
                style={{
                  left: `${a.position.x}%`,
                  top: `${a.position.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                title={`${a.author?.fullname || ""}: ${a.comment}`}
              >
                <span className="block w-3 h-3 rounded-full bg-red-500 ring-2 ring-white/70" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center">
            <MdImage className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">{file.originalName}</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-white/70 text-sm">
          <div>
            <p className="text-white font-medium">{file.originalName}</p>
            <p className="text-xs mt-0.5">
              {formatFileSize(file.fileSize)} • Par: {file.uploadedBy?.fullname || "N/A"}
            </p>
          </div>
          <a
            href={`${API_URL}${file.filePath}`}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            <MdDownload /> Télécharger
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Admin: Briefs Section ───
const BRIEF_STATUS = {
  submitted: { label: "Soumis", bg: "bg-blue-100", text: "text-blue-700" },
  "in-progress": { label: "En cours", bg: "bg-yellow-100", text: "text-yellow-700" },
  completed: { label: "Terminé", bg: "bg-green-100", text: "text-green-700" },
  cancelled: { label: "Annulé", bg: "bg-red-100", text: "text-red-700" },
};

const AdminBriefsSection = () => {
  const { data, isLoading, refetch } = useGetBriefsQuery({});
  const [updateBriefStatus, { isLoading: updating }] = useUpdateBriefStatusMutation();
  const [filter, setFilter] = useState("all");
  const [downloading, setDownloading] = useState(null);

  const briefs = data?.briefs || [];
  const filtered = filter === "all" ? briefs : briefs.filter((b) => b.status === filter);

  const counts = {
    all: briefs.length,
    submitted: briefs.filter((b) => b.status === "submitted").length,
    "in-progress": briefs.filter((b) => b.status === "in-progress").length,
    completed: briefs.filter((b) => b.status === "completed").length,
    cancelled: briefs.filter((b) => b.status === "cancelled").length,
  };

  const handleUpdate = async (brief, status) => {
    try {
      await updateBriefStatus({ id: brief._id, status }).unwrap();
      toast.success("Brief mis à jour.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Erreur.");
    }
  };

  const handleDownload = async (brief) => {
    try {
      setDownloading(brief._id);
      const response = await fetch(`${API_URL}/api/client/briefs/${brief._id}/download`, {
  method: 'GET',
  credentials: 'include'
});

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur de téléchargement");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brief.title.replace(/[^a-z0-9]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error(err?.message || "Erreur lors du téléchargement.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="bloom-card rounded-xl overflow-hidden">
      {/* Header + Filters */}
      <div className="flex items-center justify-between p-4 border-b border-bloom-gray-light/30">
        <div className="flex items-center gap-2">
          <MdDescription className="text-xl text-bloom-orange" />
          <h3 className="text-sm font-semibold text-bloom-dark">Briefs clients</h3>
        </div>
        <div className="flex gap-1 flex-wrap">
          {Object.keys(counts).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-medium transition",
                filter === k ? "bloom-gradient text-white shadow-md shadow-bloom-pink/20" : "bg-bloom-bg text-bloom-gray hover:bg-bloom-pink/10 hover:text-bloom-pink"
              )}
            >
              {k === "all" ? "Tous" : BRIEF_STATUS[k]?.label} ({counts[k]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bloom-pink" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-bloom-gray text-sm">Aucun brief</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-bloom-gray-light/30 text-left text-xs font-semibold text-bloom-gray uppercase">
              <th className="py-3 px-4">Titre</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Fichiers</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((brief) => {
              const st = BRIEF_STATUS[brief.status] || BRIEF_STATUS.submitted;
              return (
                <tr key={brief._id} className="border-b border-bloom-gray-light/20 hover:bg-bloom-pink/5 text-sm transition-colors">
                  <td className="py-3 px-4">
                    <div className="text-bloom-dark font-medium">{brief.title}</div>
                    {brief.description && (
                      <div className="text-xs text-bloom-gray line-clamp-1">{brief.description}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-bloom-gray">{brief.client?.fullname || "-"}</td>
                  <td className="py-3 px-4 text-bloom-gray">{brief.files?.length || 0}</td>
                  <td className="py-3 px-4">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", st.bg, st.text)}>
                      {st.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                                            <button
                        onClick={() => handleDownload(brief)}
                        disabled={downloading === brief._id || updating}
                        className="px-2.5 py-1 bloom-gradient text-white text-xs rounded-lg disabled:bg-gray-400 disabled:shadow-none flex items-center gap-1 shadow-md shadow-bloom-pink/20"
                        title="Télécharger les fichiers en ZIP"
                      >
                        <MdDownload />
                        {downloading === brief._id ? 'Téléchargement...' : 'Télécharger'}
                      </button>

                      <button
                        onClick={() => handleUpdate(brief, "in-progress")}
                        disabled={updating}
                        className="px-2.5 py-1 bg-bloom-orange text-white text-xs rounded-lg hover:bg-bloom-orange/90"
                      >
                        En cours
                      </button>
                      <button
                        onClick={() => handleUpdate(brief, "completed")}
                        disabled={updating}
                        className="px-2.5 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600"
                      >
                        Terminer
                      </button>
                      <button
                        onClick={() => handleUpdate(brief, "cancelled")}
                        disabled={updating}
                        className="px-2.5 py-1 bg-bloom-pink text-white text-xs rounded-lg hover:bg-bloom-pink/90"
                      >
                        Annuler
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { data, isLoading, refetch } = useGetDashboardStatsQuery();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.isAdmin;
  const [openAddUser, setOpenAddUser] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bloom-pink"></div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const stats = [
    {
      label: "TOTAL TASK",
      count: summary.totalTasks || 0,
      icon: <FaNewspaper />,
      bgColor: "bloom-gradient",
    },
    {
      label: "COMPLETED TASK",
      count: summary.tasks?.completed || 0,
      icon: <MdAdminPanelSettings />,
      bgColor: "bg-teal-500",
    },
    {
      label: "TASK IN PROGRESS",
      count: summary.tasks?.["in-progress"] || 0,
      icon: <LuClipboardList />,
      bgColor: "bg-bloom-orange",
    },
    {
      label: "TODOS",
      count: summary.tasks?.todo || 0,
      icon: <FaArrowsToDot />,
      bgColor: "bg-bloom-pink",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatsCard key={i} {...s} />
        ))}
      </div>

      {/* Chart (disabled; component not used) */}

      {/* User: Upload 3D Files Section + Source Inbox */}
      {!isAdmin && (
        <div className="space-y-6">
          <UploadFile3D availableTasks={summary.last10Tasks || []} />
          <SourceInbox />
        </div>
      )}

      {/* Admin only: Send Sources + Files Review */}
      {isAdmin && (
        <div className="space-y-6">
          <AdminSourceUpload />
          <AdminBriefsSection />
          <Files3DSection />
        </div>
      )}

      {/* Tables */}
      <div
        className={clsx(
          "grid gap-4",
          isAdmin
            ? "grid-cols-1 2xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"
            : "grid-cols-1"
        )}
      >
        <div>
          <TaskTable tasks={summary.last10Tasks} isAdmin={isAdmin} />
        </div>
        {isAdmin && (
          <div>
            <UsersTable
              users={summary.users}
              isAdmin={isAdmin}
              onAddUser={() => setOpenAddUser(true)}
            />
          </div>
        )}
      </div>

      {isAdmin && (
        <AddUser
          open={openAddUser}
          setOpen={(value) => {
            setOpenAddUser(value);
            if (!value) refetch();
          }}
          userData={null}
          key="dashboard-add-user"
        />
      )}
    </div>
  );
};

export default Dashboard;
import React from "react";
import { useGetSourcesQuery, useDeleteSourceMutation } from "../redux/slices/apiSlice";
import { MdDownload, MdInsertDriveFile, MdDelete } from "react-icons/md";
import clsx from "clsx";
import { toast } from "react-hot-toast";

const API_URL = "http://localhost:8800";

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  const k = 1024; const sizes = ["B", "KB", "MB", "GB"]; const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const SourceInbox = () => {
  const { data, isLoading, refetch } = useGetSourcesQuery({});
  const [deleteSource] = useDeleteSourceMutation();

  const files = data?.files || [];

  const onDelete = async (id) => {
    if (!window.confirm("Supprimer ce fichier ?")) return;
    try { await deleteSource(id).unwrap(); toast.success("Fichier supprimé."); refetch(); }
    catch (err) { toast.error(err?.data?.message || "Erreur."); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">📥 Fichiers sources reçus</h3>
        <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", "bg-gray-100 text-gray-600")}>
          {files.length} reçu(s)
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
      ) : files.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">Aucun fichier source reçu.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {files.map((f) => (
            <li key={f._id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <MdInsertDriveFile className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-800 font-medium truncate" title={f.originalName}>{f.originalName}</p>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>De: {f.sender?.fullname || "Admin"}</span>
                    {f.task?.title && (<><span>•</span><span>Tâche: {f.task.title}</span></>)}
                    {f.fileSize ? (<><span>•</span><span>{formatFileSize(f.fileSize)}</span></>) : null}
                  </div>
                  {(f.orderName || f.clientName) && (
                    <div className="text-xs text-indigo-600 flex flex-wrap items-center gap-2 mt-1">
                      {f.orderName && <span>Commande: {f.orderName}</span>}
                      {f.orderName && f.clientName ? <span>•</span> : null}
                      {f.clientName && <span>Client: {f.clientName}</span>}
                    </div>
                  )}
                  {f.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{f.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={`${API_URL}${f.filePath}`} download target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Télécharger">
                  <MdDownload className="text-lg" />
                </a>
                <button onClick={() => onDelete(f._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                  <MdDelete className="text-lg" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SourceInbox;

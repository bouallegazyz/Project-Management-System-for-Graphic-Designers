import React, { useRef, useState } from "react";
import {
  useGetClientGalleryQuery,
  useGetAnnotationsQuery,
  useCreateAnnotationMutation,
  useDeleteAnnotationMutation,
  useUpdateAnnotationMutation,
  useSubmitCorrectionsMutation,
  useApproveModelMutation,
  useGetSourcesQuery,
} from "../redux/slices/apiSlice";
import {
  MdDownload,
  MdImage,
  MdClose,
  MdArrowBack,
  MdArrowForward,
  MdCollections,
} from "react-icons/md";
import { toast } from "react-hot-toast";

const API_URL = "http://localhost:8800";

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ─── Lightbox / Full Image Viewer ───
const Lightbox = ({ files, currentIndex, onClose, onPrev, onNext }) => {
  const file = files[currentIndex];
  const isImage = /\.(png|jpg|jpeg|tiff|bmp|gif)$/i.test(file.originalName);
  const containerRef = useRef(null);

  // Annotations
  const { data: annData, refetch } = useGetAnnotationsQuery(file?._id, {
    skip: !file?._id,
  });
  const [createAnnotation, { isLoading: savingAnnotation }] = useCreateAnnotationMutation();
  const [deleteAnnotation, { isLoading: deletingAnnotation }] = useDeleteAnnotationMutation();
  const [updateAnnotation, { isLoading: updatingAnnotation }] = useUpdateAnnotationMutation();
  const [submitCorrections, { isLoading: submittingCorrections }] = useSubmitCorrectionsMutation();
  const [approveModel, { isLoading: approvingModel }] = useApproveModelMutation();
  const annotations = annData?.annotations || [];
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingPos, setPendingPos] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [selectedForEdit, setSelectedForEdit] = useState(null);

  const handleImageClick = (e) => {
    if (!isImage) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPercent = (((e.clientX - rect.left) / rect.width) * 100).toFixed(2);
    const yPercent = (((e.clientY - rect.top) / rect.height) * 100).toFixed(2);
    setPendingPos({ x: Number(xPercent), y: Number(yPercent) });
    setCommentText("");
    setPromptOpen(true);
  };

  const submitAnnotation = async () => {
    if (!pendingPos || !commentText.trim()) return;
    try {
      await createAnnotation({
        fileId: file._id,
        x: pendingPos.x,
        y: pendingPos.y,
        comment: commentText.trim(),
      }).unwrap();
      setPromptOpen(false);
      setPendingPos(null);
      setCommentText("");
      refetch();
      toast.success("Annotation ajoutée");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'ajout");
    }
  };

  const doDelete = async (id) => {
    try {
      await deleteAnnotation(id).unwrap();
      await refetch();
      toast.success("Annotation supprimée");
    } catch (err) {
      console.error(err);
      toast.error("Suppression échouée");
    }
  };

  const startEdit = (ann) => {
    setSelectedForEdit(ann);
    setCommentText(ann.comment || "");
    setPromptOpen(true);
    setPendingPos({ x: ann.position.x, y: ann.position.y });
  };

  const submitEdit = async () => {
    if (!selectedForEdit) return;
    try {
      await updateAnnotation({ id: selectedForEdit._id, comment: commentText.trim() }).unwrap();
      setPromptOpen(false);
      setSelectedForEdit(null);
      setCommentText("");
      await refetch();
      toast.success("Annotation mise à jour");
    } catch (err) {
      console.error(err);
      toast.error("Mise à jour échouée");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition z-50"
      >
        <MdClose className="text-2xl" />
      </button>

      {/* Prev */}
      {currentIndex > 0 && (
        <button
          onClick={onPrev}
          className="absolute left-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
        >
          <MdArrowBack className="text-2xl" />
        </button>
      )}

      {/* Next */}
      {currentIndex < files.length - 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
        >
          <MdArrowForward className="text-2xl" />
        </button>
      )}

      {/* Content */}
      <div className="max-w-6xl max-h-[85vh] mx-auto px-10">
        {isImage ? (
          <div
            ref={containerRef}
            className="relative max-w-full max-h-[70vh] flex items-center justify-center"
            onClick={handleImageClick}
          >
            <img
              src={`${API_URL}${file.filePath}`}
              alt={file.originalName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
            {annotations.map((a, i) => (
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
                <div className="w-9 h-9 rounded-full bg-blue-600/90 border-2 border-blue-300 grid place-items-center text-white font-semibold shadow-lg">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center">
            <MdImage className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">{file.originalName}</p>
          </div>
        )}

        {/* Info bar */}
        <div className="mt-3 flex items-center justify-between text-white/70 text-sm">
          <div>
            <p className="text-white font-medium">{file.originalName}</p>
            <p className="text-xs mt-0.5">
              {formatFileSize(file.fileSize)} • Par: {file.uploadedBy?.fullname || "N/A"}
            </p>
          </div>
        </div>

        {/* Comment popup */}
        {promptOpen && (
          <div className="mt-4 bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              Ajouter un commentaire à ({pendingPos?.x}%, {pendingPos?.y}%):
            </p>
            <div className="flex items-start gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                placeholder="Décrivez la modification souhaitée..."
              />
              <a
                href={`${API_URL}${file.filePath}`}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-700"
              >
                <MdDownload /> Télécharger
              </a>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setPromptOpen(false);
                  setPendingPos(null);
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={selectedForEdit ? submitEdit : submitAnnotation}
                disabled={(savingAnnotation || updatingAnnotation) || !commentText.trim()}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md disabled:opacity-60"
              >
                {selectedForEdit ? (updatingAnnotation ? "Envoi..." : "Mettre à jour") : (savingAnnotation ? "Envoi..." : "Enregistrer")}
              </button>
            </div>
          </div>
        )}

        {/* Corrections list */}
        <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-semibold text-gray-800">Corrections à faire</h5>
            <span className="text-xs text-gray-500">{annotations.length} point(s)</span>
          </div>
          {annotations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune correction ajoutée pour le moment.</p>
          ) : (
            <div className="space-y-2 max-h-[28vh] overflow-y-auto">
                            {annotations.map((a, i) => (
                <div key={a._id} className="border rounded-md p-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white grid place-items-center text-xs font-semibold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">Point #{i + 1}</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{a.comment}</div>
                      <div className="flex gap-3 mt-1 text-xs">
                        <button
                          className="text-blue-600"
                          onClick={() => startEdit(a)}
                          disabled={updatingAnnotation}
                        >
                          MODIFIER
                        </button>
                        <button
                          className="text-red-600"
                          onClick={() => doDelete(a._id)}
                          disabled={deletingAnnotation}
                        >
                          SUPPRIMER
                        </button>
                        <button
                          className="text-orange-600"
                          onClick={async () => { try { await submitCorrections(file._id).unwrap(); toast.success("Corrections envoyées"); } catch{ toast.error("Envoi échoué"); } }}
                          disabled={submittingCorrections}
                        >
                          {submittingCorrections ? "Envoi..." : "ENVOYER"}
                        </button>
                        <button
                          className="text-green-600"
                          onClick={async () => { try { await approveModel(file._id).unwrap(); toast.success("Approbation envoyée"); } catch{ toast.error("Action échouée"); } }}
                          disabled={approvingModel}
                        >
                          {approvingModel ? "Envoi..." : "APPROUVER"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Gallery Component ───
const ClientGallery = () => {
  const { data, isLoading } = useGetClientGalleryQuery();
  const [showSources, setShowSources] = useState(false);
  const { data: sourcesData, isFetching: sourcesLoading } = useGetSourcesQuery({});
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const files = data?.files || [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MdCollections className="text-xl text-green-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Projets Finaux Validés
        </h3>
        {files.length > 0 && (
          <span className="text-sm text-gray-400">({files.length})</span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowSources(true)}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Téléchargement Final
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
          <MdCollections className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">
            Aucun projet finalisé pour le moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file, index) => {
            const isImage = /\.(png|jpg|jpeg|tiff|bmp|gif)$/i.test(file.originalName);
            return (
              <div
                key={file._id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden group hover:shadow-md transition cursor-pointer"
                onClick={() => setLightboxIndex(index)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  {isImage ? (
                    <img
                      src={`${API_URL}${file.filePath}`}
                      alt={file.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MdImage className="text-5xl text-gray-300" />
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition flex gap-2">
                      <a
                        href={`${API_URL}${file.filePath}`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2.5 bg-white/90 hover:bg-white rounded-full text-gray-700 transition"
                        title="Télécharger"
                      >
                        <MdDownload className="text-lg" />
                      </a>
                    </div>
                  </div>

                  {/* Approved badge */}
                  <div className="absolute top-2 right-2">
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      ✓ Validé
                    </span>
                  </div>
                </div>

                {/* File info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.originalName}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>
                      {new Date(file.reviewedAt || file.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  {file.task && (
                    <p className="text-xs text-blue-500 mt-1 truncate">
                      {file.task.title}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          files={files}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(files.length - 1, i + 1))}
        />
      )}

      {/* Sources modal */}
      {showSources && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold">Fichiers Sources Finaux</h4>
              <button
                onClick={() => setShowSources(false)}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                title="Fermer"
              >
                <MdClose />
              </button>
            </div>

            {sourcesLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                {(sourcesData?.files || []).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun fichier source reçu pour le moment.</p>
                ) : (
                  <ul className="divide-y">
                    {sourcesData.files.map((sf) => (
                      <li key={sf._id} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{sf.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {sf.task?.title ? `Projet: ${sf.task.title}` : ""}
                          </p>
                        </div>
                        <a
                          href={`${API_URL}${sf.filePath}`}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                        >
                          <MdDownload /> Télécharger
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientGallery;

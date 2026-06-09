import React, { useState, useRef } from "react";
import { useUploadSourcesMutation, useGetSourcesQuery, useGetTeamListQuery, useCreateTaskMutation } from "../redux/slices/apiSlice";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { MdCloudUpload, MdInsertDriveFile, MdClose, MdAdd } from "react-icons/md";
import { useSelector } from "react-redux";

const AdminSourceUpload = () => {
  const [uploadSources, { isLoading: isUploading }] = useUploadSourcesMutation();
  const [createTask, { isLoading: isCreatingTask }] = useCreateTaskMutation();
  const { refetch } = useGetSourcesQuery({}, { skip: true });
  const { user } = useSelector((state) => state.auth);
  const isAdmin = Boolean(user?.isAdmin);

  const [showForm, setShowForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [recipientId, setRecipientId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [orderName, setOrderName] = useState("");
  const [clientName, setClientName] = useState("");
  const [showOrderClientFields, setShowOrderClientFields] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTaskStage, setNewTaskStage] = useState("todo");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { data: teamData = [] } = useGetTeamListQuery(undefined, {
    skip: !showForm || !isAdmin,
  });

  const team = isAdmin ? teamData : [];

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };
  const handleFileSelect = (e) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };
  const removeFile = (index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const normalizedOrderName = orderName.trim();
    const normalizedClientName = clientName.trim();

    if (!recipientId) {
      toast.error("Sélectionnez d'abord un destinataire.");
      return;
    }

    if ((normalizedOrderName && !normalizedClientName) || (!normalizedOrderName && normalizedClientName)) {
      toast.error("Ajoutez le nom de commande et le nom du client.");
      return;
    }

    if (!newTaskTitle.trim()) {
      toast.error("Ajoutez un titre de tâche.");
      return;
    }

    try {
      const result = await createTask({
        title: newTaskTitle.trim(),
        team: [recipientId],
        stage: newTaskStage,
        date: newTaskDate,
        priority: newTaskPriority,
        ...(normalizedOrderName && normalizedClientName
          ? { orderName: normalizedOrderName, clientName: normalizedClientName }
          : {}),
      }).unwrap();

      const createdTaskId = result?.task?._id;
      if (createdTaskId) setTaskId(createdTaskId);

      toast.success("Tâche créée et associée au destinataire.");
      setNewTaskTitle("");
      setNewTaskDate(new Date().toISOString().split("T")[0]);
      setNewTaskStage("todo");
      setNewTaskPriority("medium");
      setShowTaskForm(false);
    } catch (err) {
      toast.error(err?.data?.message || "Erreur lors de la création de la tâche.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedOrderName = orderName.trim();
    const normalizedClientName = clientName.trim();

    if (!recipientId) { toast.error("Sélectionnez le destinataire."); return; }
    if (selectedFiles.length === 0) { toast.error("Ajoutez au moins un fichier."); return; }
    if ((normalizedOrderName && !normalizedClientName) || (!normalizedOrderName && normalizedClientName)) {
      toast.error("Ajoutez le nom de commande et le nom du client.");
      return;
    }

    const formData = new FormData();
    formData.append("recipientId", recipientId);
    if (taskId) formData.append("taskId", taskId);
    if (description) formData.append("description", description);
    if (normalizedOrderName && normalizedClientName) {
      formData.append("orderName", normalizedOrderName);
      formData.append("clientName", normalizedClientName);
    }
    selectedFiles.forEach((f) => formData.append("files", f));

    
      await uploadSources(formData).unwrap();
      toast.success("Fichiers envoyés au destinataire.");
      setSelectedFiles([]);
      setRecipientId("");
      setTaskId("");
      setDescription("");
      setOrderName("");
      setClientName("");
      setShowOrderClientFields(false);
      setShowForm(false);
      refetch && refetch();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">📤 Envoyer des fichiers sources</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          <MdCloudUpload /> {showForm ? "Fermer" : "Nouveau transfert"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinataire *</label>
              <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">-- Sélectionner un utilisateur --</option>
                {team.map((u) => (
                  <option key={u._id} value={u._id}>{u.fullname} ({u.title || u.role})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!recipientId) {
                    toast.error("Sélectionnez d'abord un destinataire.");
                    return;
                  }
                  setShowTaskForm((prev) => !prev);
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <MdAdd className="text-base" />
                {showTaskForm ? "Fermer la création de tâche" : "Créer une tâche pour ce destinataire"}
              </button>

              <button
                type="button"
                onClick={() => setShowOrderClientFields((prev) => !prev)}
                className="mt-2 ml-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <MdAdd className="text-base" />
                {showOrderClientFields
                  ? "Masquer commande/client"
                  : "Ajouter nom de commande + client"}
              </button>
            </div>
          </div>

          {showOrderClientFields && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
              <p className="text-sm font-medium text-indigo-900">Informations liées au fichier (optionnel)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom de commande</label>
                  <input
                    value={orderName}
                    onChange={(e) => setOrderName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: CMD-2026-041"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom du client</label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Atlas Design"
                  />
                </div>
              </div>
              <p className="text-xs text-indigo-700">
                Si vous renseignez un champ, renseignez aussi l'autre pour lier correctement la commande au client.
              </p>
            </div>
          )}

          {showTaskForm && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-3">
              <p className="text-sm font-medium text-blue-900">Nouvelle tâche (assignée automatiquement au destinataire sélectionné)</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Titre de la tâche *</label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Préparer les fichiers de modélisation"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Étape</label>
                  <select
                    value={newTaskStage}
                    onChange={(e) => setNewTaskStage(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todo">TODO</option>
                    <option value="in-progress">IN PROGRESS</option>
                    <option value="completed">COMPLETED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priorité</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isCreatingTask}
                  onClick={handleCreateTask}
                  className={clsx(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition",
                    isCreatingTask ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <MdAdd className="text-base" />
                  {isCreatingTask ? "Création..." : "Créer la tâche"}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div
            className={clsx(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            )}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden"
              accept=".png,.jpg,.jpeg,.tiff,.bmp,.gif,.svg,.psd,.ai,.eps,.pdf,.max,.3ds,.obj,.fbx,.blend,.skp,.dwg,.dxf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
            <MdCloudUpload className="text-4xl text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Glissez vos fichiers ici ou cliquez pour parcourir</p>
            <p className="text-xs text-gray-400 mt-1">Formats de sources variés (Max 500 MB/fichier)</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <MdInsertDriveFile className="text-blue-400 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 shrink-0">
                    <MdClose />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={isUploading}
            className={clsx("w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-medium text-sm transition",
              isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700")}
          >
            {isUploading ? (<>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Envoi en cours...
            </>) : (<>
              <MdCloudUpload className="text-lg" /> Envoyer aux utilisateurs
            </>)}
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminSourceUpload;

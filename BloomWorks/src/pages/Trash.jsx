import React, { useState } from "react";
import { useGetTasksQuery, useDeleteRestoreTaskMutation } from "../redux/slices/apiSlice";
import clsx from "clsx";
import { TASK_TYPE, PRIORITY_STYLES } from "../utils";
import { MdOutlineRestore, MdDelete } from "react-icons/md";
import ConfirmDialog from "../components/ConfirmDialog";
import { toast } from "react-hot-toast";

const Trash = () => {
  const { data, isLoading } = useGetTasksQuery({ stage: "", isTrashed: "true" });
  const [deleteRestore] = useDeleteRestoreTaskMutation();
  const [openConfirm, setOpenConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const tasks = data?.tasks || [];

  const handleAction = (actionType, id) => {
    setConfirmAction({ actionType, id });
    setOpenConfirm(true);
  };

  const confirmHandler = async () => {
    try {
      const { actionType, id } = confirmAction;
      await deleteRestore({ id, actionType }).unwrap();
      toast.success(
        actionType === "restore"
          ? "Task restored successfully"
          : actionType === "restoreAll"
          ? "All tasks restored"
          : actionType === "delete"
          ? "Task deleted permanently"
          : "All tasks deleted"
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">archive de projets</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handleAction("restoreAll")}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
          >
            <MdOutlineRestore size={18} /> Restore All
          </button>
          <button
            onClick={() => handleAction("deleteAll")}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <MdDelete size={18} /> Supprimer tout
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-600">
              <th className="py-3 px-4">Titre de la tâche</th>
              <th className="py-3 px-4">Priorité</th>
              <th className="py-3 px-4">Stage</th>
              <th className="py-3 px-4">Modifié le</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task._id}
                className="border-b border-gray-100 hover:bg-gray-50 text-sm"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        "w-3 h-3 rounded-full shrink-0",
                        TASK_TYPE[task.stage]
                      )}
                    />
                    <span className="text-gray-800">{task.title}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={clsx(
                      "flex items-center gap-1 capitalize",
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
                <td className="py-3 px-4 text-gray-600 capitalize">
                  {task.stage?.replace("-", " ")}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {new Date(task.updatedAt).toDateString()}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleAction("restore", task._id)}
                      className="text-gray-500 hover:text-blue-600"
                      title="Restore"
                    >
                      <MdOutlineRestore size={20} />
                    </button>
                    <button
                      onClick={() => handleAction("delete", task._id)}
                      className="text-red-400 hover:text-red-600"
                      title="Delete permanently"
                    >
                      <MdDelete size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No trashed tasks
          </div>
        )}
      </div>

      <ConfirmDialog
        open={openConfirm}
        setOpen={setOpenConfirm}
        title={
          confirmAction?.actionType === "restore" || confirmAction?.actionType === "restoreAll"
            ? "Restore Task"
            : "Delete Task"
        }
        message={
          confirmAction?.actionType === "restore"
            ? "Are you sure you want to restore this task?"
            : confirmAction?.actionType === "restoreAll"
            ? "Are you sure you want to restore all tasks?"
            : confirmAction?.actionType === "delete"
            ? "This will permanently delete this task."
            : "This will permanently delete all trashed tasks."
        }
        onConfirm={confirmHandler}
        confirmLabel={
          confirmAction?.actionType === "restore" || confirmAction?.actionType === "restoreAll"
            ? "Restore"
            : "Delete"
        }
        confirmColor={
          confirmAction?.actionType === "restore" || confirmAction?.actionType === "restoreAll"
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-red-600 hover:bg-red-700"
        }
      />
    </div>
  );
};

export default Trash;
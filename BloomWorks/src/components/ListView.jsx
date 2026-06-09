import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { TASK_TYPE, PRIORITY_STYLES, BGS, formatDate, getInitials } from "../utils";
import { BiMessageAltDetail } from "react-icons/bi";
import { MdAttachFile } from "react-icons/md";
import { FaList } from "react-icons/fa";
import ConfirmDialog from "./ConfirmDialog";
import AddTask from "./AddTask";
import { useTrashTaskMutation } from "../redux/slices/apiSlice";
import { toast } from "react-hot-toast";

const ListView = ({ tasks }) => {
  const navigate = useNavigate();
  const [openEdit, setOpenEdit] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [trashTask] = useTrashTaskMutation();

  const handleEdit = (task) => {
    setSelected(task);
    setOpenEdit(true);
  };

  const handleDelete = (task) => {
    setSelected(task);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await trashTask(selected._id).unwrap();
      toast.success("Task moved to trash");
    } catch (err) {
      toast.error(err?.data?.message || "Failed");
    }
  };

  return (
    <>
      <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-600">
              <th className="py-3 px-4">titre de la tache</th>
              <th className="py-3 px-4">Priorité</th>
              <th className="py-3 px-4">Date de création</th>
              <th className="py-3 px-4">Ressources</th>
              <th className="py-3 px-4">Équipe</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {tasks?.map((task) => (
              <tr
                key={task._id}
                className="border-b border-gray-100 hover:bg-gray-50 text-sm text-gray-700"
              >
                {/* Title */}
                <td className="py-3 px-4">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(`/task/${task._id}`)}
                  >
                    <div
                      className={clsx("w-3 h-3 rounded-full shrink-0", TASK_TYPE[task.stage])}
                    />
                    <div className="min-w-0">
                      <span className="line-clamp-1 hover:text-blue-600 block">
                        {task.title}
                      </span>
                      {(task.orderName || task.clientName) && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {task.orderName ? `Commande: ${task.orderName}` : ""}
                          {task.orderName && task.clientName ? " • " : ""}
                          {task.clientName ? `Client: ${task.clientName}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                {/* Priority */}
                <td className="py-3 px-4">
                  <span
                    className={clsx(
                      "flex items-center gap-1 text-sm capitalize",
                      PRIORITY_STYLES[task.priority]
                    )}
                  >
                    {task.priority === "high"
                      ? "↑↑"
                      : task.priority === "medium"
                      ? "↑"
                      : ""}{" "}
                    {task.priority} Priority
                  </span>
                </td>
                {/* Date */}
                <td className="py-3 px-4 text-gray-500">{formatDate(task.date)}</td>
                {/* Assets */}
                <td className="py-3 px-4">
                  <div className="flex gap-2 text-gray-500">
                    <span className="flex items-center gap-1">
                      <BiMessageAltDetail /> {task.activities?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MdAttachFile /> {task.assets?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaList /> {task.subtasks?.length || 0}/{task.subtasks?.length || 0}
                    </span>
                  </div>
                </td>
                {/* Team */}
                <td className="py-3 px-4">
                  <div className="flex -space-x-2">
                    {task.team?.map((member, i) => (
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
                </td>
                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleEdit(task)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!tasks || tasks.length === 0) && (
          <div className="text-center py-8 text-gray-400">No tasks found</div>
        )}
      </div>

      {openEdit && (
        <AddTask open={openEdit} setOpen={setOpenEdit} task={selected} />
      )}
      <ConfirmDialog
        open={openConfirm}
        setOpen={setOpenConfirm}
        title="Delete Task"
        message="Are you sure you want to move this task to trash?"
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default ListView;

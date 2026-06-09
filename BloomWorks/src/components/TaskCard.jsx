import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineMoreHoriz } from "react-icons/md";
import { BiMessageAltDetail } from "react-icons/bi";
import { FaList } from "react-icons/fa";
import { MdAttachFile } from "react-icons/md";
import { IoMdAdd } from "react-icons/io";
import clsx from "clsx";
import { TASK_TYPE, PRIORITY_STYLES, BGS, formatDate, getInitials } from "../utils";
import AddSubTask from "./AddSubTask";
import ConfirmDialog from "./ConfirmDialog";
import { useTrashTaskMutation, useDuplicateTaskMutation } from "../redux/slices/apiSlice";
import { toast } from "react-hot-toast";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";

const TaskCard = ({ task }) => {
  const navigate = useNavigate();
  const [openSubTask, setOpenSubTask] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [trashTask] = useTrashTaskMutation();
  const [duplicateTask] = useDuplicateTaskMutation();

  const handleTrash = async () => {
    try {
      await trashTask(task._id).unwrap();
      toast.success("Task moved to trash");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to trash task");
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateTask(task._id).unwrap();
      toast.success("Task duplicated successfully");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to duplicate task");
    }
  };

  return (
    <>
      <div className="w-full bloom-card rounded-xl p-4">
        {/* Priority & Menu */}
        <div className="flex justify-between items-start">
          <div
            className={clsx(
              "flex items-center gap-1 text-sm font-semibold",
              task.priority === "high"
                ? "text-bloom-pink"
                : task.priority === "medium"
                ? "text-bloom-orange"
                : "text-bloom-coral"
            )}
          >
            <span className="uppercase">
              {task.priority === "high" ? "↑↑" : task.priority === "medium" ? "↑" : ""}{" "}
              {task.priority?.toUpperCase()} PRIORITY
            </span>
          </div>

          <Menu as="div" className="relative">
            <Menu.Button className="text-bloom-gray hover:text-bloom-pink transition-colors">
              <MdOutlineMoreHoriz size={20} />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-1 w-36 bg-bloom-white border border-bloom-gray-light/30 rounded-xl shadow-xl z-10 overflow-hidden">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate(`/task/${task._id}`)}
                      className={`${active ? "bg-bloom-pink/10 text-bloom-pink" : "text-bloom-dark"} w-full text-left px-3 py-2 text-sm transition-colors`}
                    >
                      Ouvre une tache
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleDuplicate}
                      className={`${active ? "bg-bloom-pink/10 text-bloom-pink" : "text-bloom-dark"} w-full text-left px-3 py-2 text-sm transition-colors`}
                    >
                      Dupliquer
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setOpenConfirm(true)}
                      className={`${active ? "bg-bloom-pink/10" : ""} w-full text-left px-3 py-2 text-sm text-bloom-pink transition-colors`}
                    >
                      Supprimer
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        {/* Title & Date */}
        <div
          className="mt-2 cursor-pointer"
          onClick={() => navigate(`/task/${task._id}`)}
        >
          <div className="flex items-center gap-2">
            <div className={clsx("w-3 h-3 rounded-full", TASK_TYPE[task.stage])} />
            <h4 className="text-sm font-medium text-bloom-dark line-clamp-1">
              {task.title}
            </h4>
          </div>
          <p className="text-xs text-bloom-gray mt-1">{formatDate(task.date)}</p>
          {(task.orderName || task.clientName) && (
            <p className="text-xs text-bloom-gray mt-1 line-clamp-1">
              {task.orderName ? `Commande: ${task.orderName}` : ""}
              {task.orderName && task.clientName ? " • " : ""}
              {task.clientName ? `Client: ${task.clientName}` : ""}
            </p>
          )}
        </div>

        {/* Divider line */}
        <div className="border-t border-bloom-gray-light/30 my-3" />

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-sm text-bloom-gray">
            <span className="flex items-center gap-1" title="Comments">
              <BiMessageAltDetail /> {task.activities?.length || 0}
            </span>
            <span className="flex items-center gap-1" title="Assets">
              <MdAttachFile /> {task.assets?.length || 0}
            </span>
            <span className="flex items-center gap-1" title="Sub-tasks">
              <FaList /> {task.subtasks?.length || 0}/{task.subtasks?.length || 0}
            </span>
          </div>
          {/* Team avatars */}
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
        </div>

        {/* Sub-tasks */}
        {task.subtasks?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-bloom-gray-light/30">
            {task.subtasks.slice(0, 2).map((sub, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="text-xs text-bloom-gray">
                  {formatDate(sub.date)}
                </span>
                {sub.tag && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-bloom-pink/10 text-bloom-pink">
                    {sub.tag}
                  </span>
                )}
              </div>
            ))}
            <p className="text-xs text-bloom-dark mt-1">
              {task.subtasks[0]?.title}
            </p>
          </div>
        )}

        {/* Add Subtask */}
        <button
          onClick={() => setOpenSubTask(true)}
          className="mt-3 flex items-center gap-1 text-sm text-bloom-gray hover:text-bloom-pink transition-colors"
        >
          <IoMdAdd /> AJOUTER UNE SOUS-TACHE
        </button>
      </div>

      <AddSubTask open={openSubTask} setOpen={setOpenSubTask} taskId={task._id} />
      <ConfirmDialog
        open={openConfirm}
        setOpen={setOpenConfirm}
        title="Delete Task"
        message="Are you sure you want to move this task to trash?"
        onConfirm={handleTrash}
      />
    </>
  );
};

export default TaskCard;

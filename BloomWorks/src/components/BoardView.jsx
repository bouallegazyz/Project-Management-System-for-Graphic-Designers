import React, { useState } from "react";
import { IoMdAdd } from "react-icons/io";
import TaskCard from "./TaskCard";
import AddTask from "./AddTask";

const BoardView = ({ tasks }) => {
  const [openAdd, setOpenAdd] = useState(false);
  const [addStage, setAddStage] = useState("todo");

  const stages = [
    { label: "To Do", value: "todo", color: "bg-bloom-coral" },
    { label: "In Progress", value: "in-progress", color: "bg-bloom-orange" },
    { label: "Completed", value: "completed", color: "bg-green-500" },
  ];

  const handleAdd = (stage) => {
    setAddStage(stage);
    setOpenAdd(true);
  };

  return (
    <div className="w-full">
      {/* Stage Headers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {stages.map((s) => (
          <div key={s.value} className="flex items-center justify-between bg-bloom-white p-3 rounded-xl border border-bloom-gray-light/30">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <h3 className="text-sm font-semibold text-bloom-dark">{s.label}</h3>
            </div>
            <button
              onClick={() => handleAdd(s.value)}
              className="text-bloom-gray hover:text-bloom-pink transition-colors"
            >
              <IoMdAdd size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Task Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stages.map((s) => {
          const stageTasks = tasks?.filter((t) => t.stage === s.value) || [];
          return (
            <div key={s.value} className="space-y-3">
              {stageTasks.map((task) => (
                <TaskCard key={task._id} task={task} />
              ))}
              {stageTasks.length === 0 && (
                <div className="text-center py-8 text-bloom-gray text-sm bg-bloom-white/50 rounded-xl border border-dashed border-bloom-gray-light/50">
                  Aucune tâche
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AddTask open={openAdd} setOpen={setOpenAdd} stage={addStage} />
    </div>
  );
};

export default BoardView;

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { IoMdAdd } from "react-icons/io";
import { MdGridView } from "react-icons/md";
import { FaList } from "react-icons/fa";
import { useGetTasksQuery } from "../redux/slices/apiSlice";
import BoardView from "../components/BoardView";
import ListView from "../components/ListView";
import AddTask from "../components/AddTask";
import clsx from "clsx";

const TABS = [
  { title: "Board View", icon: <MdGridView /> },
  { title: "List View", icon: <FaList /> },
];

const Tasks = () => {
  const { status } = useParams();
  const [selectedTab, setSelectedTab] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);

  const { data, isLoading } = useGetTasksQuery({
    stage: status || "",
    isTrashed: "",
  });

  const tasks = data?.tasks || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bloom-pink"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold capitalize text-bloom-dark">
          {status ? `${status.replace("-", " ")} Tâches` : "Tâches"}
        </h2>
        {!status && (
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 bloom-btn text-white px-5 py-2.5 rounded-xl text-sm font-medium"
          >
            <IoMdAdd size={18} />
            Créer une tâche
          </button>
        )}
      </div>

      {/* Tabs */}
      {!status && (
        <div className="flex items-center gap-2 mb-6">
          {TABS.map((tab, i) => (
            <button
              key={tab.title}
              onClick={() => setSelectedTab(i)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
                selectedTab === i
                  ? "bloom-gradient text-white shadow-md shadow-bloom-pink/20"
                  : "text-bloom-gray hover:text-bloom-pink hover:bg-bloom-pink/10 bg-bloom-white border border-bloom-gray-light/30"
              )}
            >
              {tab.icon}
              {tab.title}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {selectedTab === 0 ? (
        <BoardView tasks={tasks} />
      ) : (
        <ListView tasks={tasks} />
      )}

      <AddTask open={openAdd} setOpen={setOpenAdd} />
    </div>
  );
};

export default Tasks;
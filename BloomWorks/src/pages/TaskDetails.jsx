import React, { useState } from "react";
import { useParams } from "react-router-dom";
import clsx from "clsx";
import moment from "moment";
import { FaBug, FaTasks, FaThumbsUp, FaUser } from "react-icons/fa";
import { MdOutlineMessage, MdTaskAlt } from "react-icons/md";
import { GrInProgress } from "react-icons/gr";
import { useGetTaskQuery, usePostActivityMutation } from "../redux/slices/apiSlice";
import { TASK_TYPE, PRIORITY_STYLES, BGS, getInitials } from "../utils";
import { toast } from "react-hot-toast";

const ACTIVITY_TYPES = [
  { label: "Started", value: "started", icon: <FaThumbsUp />, bg: "bg-blue-600" },
  { label: "Completed", value: "completed", icon: <MdTaskAlt />, bg: "bg-green-600" },
  { label: "In Progress", value: "in-progress", icon: <GrInProgress />, bg: "bg-yellow-600" },
  { label: "Commented", value: "commented", icon: <MdOutlineMessage />, bg: "bg-gray-600" },
  { label: "Bug", value: "bug", icon: <FaBug />, bg: "bg-red-600" },
  { label: "Assigned", value: "assigned", icon: <FaUser />, bg: "bg-purple-600" },
];

const TABS = [
  { title: "Task Detail", icon: <FaTasks /> },
  { title: "Activities/Timeline", icon: <FaTasks /> },
];

const TaskDetail = ({ task }) => {
  return (
    <div className="space-y-6">
      {/* Priority & Stage badges */}
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "px-3 py-1 rounded-full text-sm font-semibold uppercase",
            task.priority === "high"
              ? "bg-red-100 text-red-600"
              : task.priority === "medium"
              ? "bg-yellow-100 text-yellow-600"
              : "bg-blue-100 text-blue-600"
          )}
        >
          {task.priority === "high" ? "↑↑" : task.priority === "medium" ? "↑" : ""}{" "}
          {task.priority} PRIORITY
        </span>
        <div className="flex items-center gap-2">
          <div className={clsx("w-3 h-3 rounded-full", TASK_TYPE[task.stage])} />
          <span className="text-sm font-medium text-gray-600 uppercase">
            {task.stage?.replace("-", " ")}
          </span>
        </div>
      </div>

      {/* Created At */}
      <p className="text-sm text-gray-500">
        Created At: {new Date(task.createdAt).toDateString()}
      </p>

      {/* Assets & Sub-tasks count */}
      <div className="flex items-center gap-6 border-b border-gray-200 pb-4">
        <span className="text-sm text-gray-600">
          Assets : {task.assets?.length || 0}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-600">
          Sub-Task : {task.subtasks?.length || 0}
        </span>
      </div>

      {/* Task Team */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          TASK TEAM
        </h3>
        <div className="space-y-3">
          {task.team?.map((member, i) => (
            <div key={member._id || i} className="flex items-center gap-3">
              <div
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                  BGS[i % BGS.length]
                )}
              >
                {getInitials(member.fullname)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{member.fullname}</p>
                <p className="text-xs text-gray-500">{member.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Tasks */}
      {task.subtasks?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            SUB-TASKS
          </h3>
          <div className="space-y-3">
            {task.subtasks.map((sub, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <MdTaskAlt className="text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(sub.date).toDateString()}
                    </span>
                    {sub.tag && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                        {sub.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{sub.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets */}
      {task.assets?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            ASSETS
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {task.assets.map((asset, i) => (
              <img
                key={i}
                src={asset}
                alt={`Asset ${i + 1}`}
                className="w-full rounded-md border border-gray-200"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Activities = ({ activities, taskId }) => {
  const [selectedType, setSelectedType] = useState("started");
  const [text, setText] = useState("");
  const [postActivity, { isLoading }] = usePostActivityMutation();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      await postActivity({
        id: taskId,
        type: selectedType,
        activity: text,
      }).unwrap();
      setText("");
      toast.success("Activity added successfully");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add activity");
    }
  };

  const getActivityIcon = (type) => {
    const found = ACTIVITY_TYPES.find((t) => t.value === type);
    return found || ACTIVITY_TYPES[0];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Timeline */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Activities</h3>
        <div className="space-y-0">
          {activities?.map((activity, i) => {
            const act = getActivityIcon(activity.type);
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      "w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0",
                      act.bg
                    )}
                  >
                    {act.icon}
                  </div>
                  {i < activities.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 min-h-10" />
                  )}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-800">
                      {activity.by?.fullname || "User"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="capitalize">{activity.type}</span>{" "}
                    {moment(activity.date).fromNow()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{activity.activity}</p>
                </div>
              </div>
            );
          })}
          {(!activities || activities.length === 0) && (
            <p className="text-sm text-gray-400">No activities yet</p>
          )}
        </div>
      </div>

      {/* Add Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Activity</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {ACTIVITY_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="activityType"
                value={type.value}
                checked={selectedType === type.value}
                onChange={() => setSelectedType(type.value)}
                className="accent-blue-600"
              />
              {type.label}
            </label>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type ......"
          className="w-full border border-gray-300 rounded-md p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-40 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
          className="mt-3 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

const Taskdetails = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const { data, isLoading } = useGetTaskQuery(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const task = data?.task;
  if (!task) {
    return <p className="text-gray-500 text-center py-10">Task not found</p>;
  }

  return (
    <div className="w-full">
      {/* Title */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">{task.title}</h2>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
        {TABS.map((tab, i) => (
          <button
            key={tab.title}
            onClick={() => setActiveTab(i)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2",
              activeTab === i
                ? "text-blue-600 border-blue-600"
                : "text-gray-500 border-transparent hover:text-gray-700"
            )}
          >
            {tab.icon}
            {tab.title}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 0 ? (
          <TaskDetail task={task} />
        ) : (
          <Activities activities={task.activities} taskId={task._id} />
        )}
      </div>
    </div>
  );
};

export default Taskdetails;
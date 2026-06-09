import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { useCreateTaskMutation, useGetTeamListQuery, useUpdateTaskMutation } from "../redux/slices/apiSlice";
import { toast } from "react-hot-toast";
import { dateFormatter } from "../utils";
import { useSelector } from "react-redux";

const STAGE = ["TODO", "IN PROGRESS", "COMPLETED"];
const PRIORITY = ["NORMAL", "LOW", "MEDIUM", "HIGH"];

const AddTask = ({ open, setOpen, task }) => {
  const defaultValues = task
    ? {
        title: task.title,
        team: task.team?.map((t) => t._id) || [],
        stage: task.stage?.toUpperCase().replace("-", " ") || "TODO",
        date: dateFormatter(task.date),
        priority: task.priority?.toUpperCase() || "NORMAL",
      }
    : {
        title: "",
        team: [],
        stage: "TODO",
        date: dateFormatter(new Date()),
        priority: "NORMAL",
      };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ defaultValues });

  const { user } = useSelector((state) => state.auth);
  const isAdmin = Boolean(user?.isAdmin);
  const { data: teamData = [] } = useGetTeamListQuery(undefined, {
    skip: !open || !isAdmin,
  });
  const [createTask, { isLoading: creating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation();

  const team = isAdmin ? teamData : [];

  const submitHandler = async (data) => {
    try {
      const submitData = {
        ...data,
        stage: data.stage.toLowerCase().replace(" ", "-"),
        priority: data.priority.toLowerCase(),
      };

      if (task) {
        await updateTask({ id: task._id, ...submitData }).unwrap();
        toast.success("Task updated successfully");
      } else {
        await createTask(submitData).unwrap();
        toast.success("Task created successfully");
      }
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Something went wrong");
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setOpen(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-bloom-white p-6 shadow-2xl transition-all border border-bloom-gray-light/30">
                <Dialog.Title className="text-xl font-bold text-bloom-dark mb-6">
                  {task ? "Modifier la tâche" : "Ajouter une tâche"}
                </Dialog.Title>

                <form onSubmit={handleSubmit(submitHandler)} className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-bloom-dark mb-2">
                      Titre de la tâche
                    </label>
                    <input
                      {...register("title", { required: "Title is required" })}
                      className="w-full border border-bloom-gray-light rounded-xl px-4 py-3 text-sm outline-none focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 transition-all bg-bloom-bg/50"
                      placeholder="Entrez le titre de la tâche"
                    />
                    {errors.title && (
                      <p className="text-bloom-pink text-xs mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Assign To */}
                  <div>
                    <label className="block text-sm font-medium text-bloom-dark mb-2">
                      Assigner à
                    </label>
                    <select
                      {...register("team")}
                      multiple
                      className="w-full border border-bloom-gray-light rounded-xl px-4 py-3 text-sm outline-none focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 h-24 transition-all bg-bloom-bg/50"
                    >
                      {team.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.fullname}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stage & Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-bloom-dark mb-2">
                        Étape de la tâche
                      </label>
                      <select
                        {...register("stage")}
                        className="w-full border border-bloom-gray-light rounded-xl px-4 py-3 text-sm outline-none focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 transition-all bg-bloom-bg/50"
                      >
                        {STAGE.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bloom-dark mb-2">
                        Date de la tâche
                      </label>
                      <input
                        type="date"
                        {...register("date")}
                        className="w-full border border-bloom-gray-light rounded-xl px-4 py-3 text-sm outline-none focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 transition-all bg-bloom-bg/50"
                      />
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-bloom-dark mb-2">
                      Niveau de priorité
                    </label>
                    <select
                      {...register("priority")}
                      className="w-full border border-bloom-gray-light rounded-xl px-4 py-3 text-sm outline-none focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 transition-all bg-bloom-bg/50"
                    >
                      {PRIORITY.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assets */}
                  <div>
                    <label className="block text-sm font-medium text-bloom-dark mb-2">
                      Ajouter des fichiers
                    </label>
                    <input
                      type="file"
                      multiple
                      className="w-full text-sm text-bloom-gray file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-bloom-pink/10 file:text-bloom-pink hover:file:bg-bloom-pink/20 transition-all"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-5 py-2.5 text-sm font-medium text-bloom-dark bg-bloom-bg rounded-xl hover:bg-bloom-pink/10 hover:text-bloom-pink border border-bloom-gray-light/30 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating || updating}
                      className="px-6 py-2.5 text-sm font-medium text-white bloom-btn rounded-xl disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                    >
                      {task ? "Modifier" : "Enregistrer"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddTask;

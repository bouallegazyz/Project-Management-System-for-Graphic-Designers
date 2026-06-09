import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { useRegisterMutation, useUpdateProfileMutation } from "../redux/slices/apiSlice";
import { toast } from "react-hot-toast";

const AddUser = ({ open, setOpen, userData }) => {
  const defaultValues = userData
    ? {
        fullname: userData.fullname || "",
        title: userData.title || "",
        email: userData.email || "",
        role: userData.role || "user",
      }
    : {
        fullname: "",
        title: "",
        email: "",
        role: "user",
      };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ defaultValues });

  const [addUser, { isLoading: adding }] = useRegisterMutation();
  const [updateUser, { isLoading: updating }] = useUpdateProfileMutation();

  const submitHandler = async (data) => {
    try {
      if (userData) {
        await updateUser({ ...data, _id: userData._id }).unwrap();
        toast.success("User updated successfully");
      } else {
        await addUser({
          ...data,
          password: data.email, // default password = email
        }).unwrap();
        toast.success("User added successfully");
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
          <div className="fixed inset-0 bg-black/30" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-bold text-gray-900 mb-4">
                  {userData ? "Modifier un utilisateur" : "Ajouter un utilisateur"}
                </Dialog.Title>

                <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      {...register("fullname", { required: "Full name is required" })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Full Name"
                    />
                    {errors.fullname && (
                      <p className="text-red-500 text-xs mt-1">{errors.fullname.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      {...register("title")}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Invalid email",
                        },
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Email Address"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rôle
                    </label>
                    <select
                      {...register("role")}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="user">Utilisateur</option>
                      <option value="client">Client (Commanditaire)</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adding || updating}
                      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Submit
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

export default AddUser;

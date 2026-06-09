import React, { useState } from "react";
import {
  useGetTeamListQuery,
  useDeleteUserMutation,
  useActivateUserMutation,
} from "../redux/slices/apiSlice";
import { getInitials, BGS } from "../utils";
import clsx from "clsx";
import AddUser from "../components/AddUser";
import ConfirmDialog from "../components/ConfirmDialog";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";

const Graphistes = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = Boolean(user?.isAdmin);
  const { data, isLoading, refetch } = useGetTeamListQuery(undefined, {
    skip: !isAdmin,
  });
  const [deleteUser] = useDeleteUserMutation();
  const [activateUser] = useActivateUserMutation();
  const [openAdd, setOpenAdd] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);

  const users = data || [];

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-sm text-gray-600">
        Accès réservé aux administrateurs.
      </div>
    );
  }

  const handleDelete = (user) => {
    setSelectedUser(user);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteUser(selectedUser._id).unwrap();
      toast.success("User deleted successfully");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete user");
    }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setOpenAdd(true);
  };

  const handleStatusToggle = async (user) => {
    try {
      await activateUser({
        id: user._id,
        isActive: !user.isActive,
      }).unwrap();
      toast.success(
        `User ${!user.isActive ? "activated" : "disabled"} successfully`
      );
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update status");
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
        <h2 className="text-2xl font-semibold text-gray-800">Team Members</h2>
        <button
          onClick={() => {
            setEditUser(null);
            setOpenAdd(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + ajouter un graphiste
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-600">
              <th className="py-3 px-4">nom</th>
              <th className="py-3 px-4">Titre</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Active</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user._id}
                className="border-b border-gray-100 hover:bg-gray-50 text-sm"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                        BGS[i % BGS.length]
                      )}
                    >
                      {getInitials(user.fullname)}
                    </div>
                    <span className="text-gray-800 font-medium">
                      {user.fullname}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{user.title || "-"}</td>
                <td className="py-3 px-4 text-gray-600">{user.email}</td>
                <td className="py-3 px-4 text-gray-600 capitalize">{user.role}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleStatusToggle(user)}
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    )}
                  >
                    {user.isActive ? "Active" : "Disabled"}
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
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

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400">No team members</div>
        )}
      </div>

      <AddUser
        open={openAdd}
        setOpen={setOpenAdd}
        userData={editUser}
        key={editUser?._id || "new"}
      />
      <ConfirmDialog
        open={openConfirm}
        setOpen={setOpenConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Graphistes;


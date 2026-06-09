import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { FaUser, FaUserLock } from "react-icons/fa";
import { IoLogOutOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../redux/slices/AuthSlice";
import { useLogoutMutation } from "../redux/slices/apiSlice";
import { getInitials } from "../utils";

const UserAvatar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutUser] = useLogoutMutation();

  const logoutHandler = async () => {
    try {
      await logoutUser().unwrap();
    } catch (e) {
      console.log(e);
    } finally {
      dispatch(logout());
      navigate("/log-in");
    }
  };

  return (
    <div>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="w-10 h-10 2xl:w-12 2xl:h-12 flex items-center justify-center rounded-xl bloom-gradient text-white font-semibold shadow-md shadow-bloom-pink/20 hover:shadow-lg hover:shadow-bloom-pink/30 transition-all">
            {getInitials(user?.fullname || "")}
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-bloom-white border border-bloom-gray-light/30 divide-y divide-bloom-gray-light/30 rounded-xl shadow-xl outline-none z-50 overflow-hidden">
            <div className="px-1 py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => {}}
                    className={`${
                      active ? "bg-bloom-pink/10 text-bloom-pink" : "text-bloom-dark"
                    } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors`}
                  >
                    <FaUser className="mr-2" aria-hidden="true" />
                    Profile
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => {}}
                    className={`${
                      active ? "bg-bloom-pink/10 text-bloom-pink" : "text-bloom-dark"
                    } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors`}
                  >
                    <FaUserLock className="mr-2" aria-hidden="true" />
                    Changer le mot de passe
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={logoutHandler}
                    className={`${
                      active ? "bg-bloom-pink/10" : ""
                    } text-bloom-pink group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors`}
                  >
                    <IoLogOutOutline className="mr-2" aria-hidden="true" />
                    Déconnexion
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default UserAvatar;
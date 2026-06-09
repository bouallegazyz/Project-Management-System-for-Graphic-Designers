import React from "react";
import { MdOutlineSearch } from "react-icons/md";
import { useDispatch } from "react-redux";
import { setOpenSidebar } from "../redux/slices/AuthSlice";
import UserAvatar from "./UserAvatar";
import NotificationPanel from "./NotificationPanel";


const Navbar = () => {
  const dispatch = useDispatch();

  return (
    <div className="flex justify-between items-center bg-bloom-white px-4 py-3 2xl:py-4 border-b border-bloom-gray-light/30 sticky top-0 z-10">
      <div className="flex gap-4">
        <button
          onClick={() => dispatch(setOpenSidebar(true))}
          className="text-2xl text-bloom-gray hover:text-bloom-pink transition-colors block md:hidden"
        >
          ☰
        </button>
        <div className="w-64 2xl:w-100 flex items-center px-4 py-2.5 rounded-xl bg-bloom-bg border border-bloom-gray-light/30 focus-within:border-bloom-pink/50 focus-within:ring-2 focus-within:ring-bloom-pink/10 transition-all">
          <MdOutlineSearch className="text-bloom-gray text-xl mr-2" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full bg-transparent outline-none text-bloom-dark placeholder-bloom-gray text-sm"
          />
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <NotificationPanel />
        <UserAvatar />
      </div>
    </div>
  );
};

export default Navbar;
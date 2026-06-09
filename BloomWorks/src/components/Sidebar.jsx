import React from "react";
import {
  MdDashboard,
  MdOutlinePendingActions,
  MdTaskAlt,
  MdSettings,
  MdBusinessCenter,
} from "react-icons/md";
import { FaTasks, FaTrashAlt, FaUsers } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import clsx from "clsx";
import { setOpenSidebar } from "../redux/slices/AuthSlice";
import bloomworksLogo from "../assets/bloomworks-logo.jpeg";

const linkData = [
  { label: "Dashboard", link: "dashboard", icon: <MdDashboard /> },
  { label: "taches", link: "tasks", icon: <FaTasks /> },
  { label: "taches terminées", link: "completed/completed", icon: <MdTaskAlt /> },
  {
    label: "taches en cours",
    link: "in-progress/in-progress",
    icon: <MdOutlinePendingActions />,
  },
  {
    label: "To Do",
    link: "todo/todo",
    icon: <MdOutlinePendingActions />,
  },
  { label: "Team", link: "team", icon: <FaUsers /> },
  { label: "Archive", link: "trashed", icon: <FaTrashAlt /> },
];

const clientLinkData = [
  { label: "Espace Client", link: "client-space", icon: <MdBusinessCenter /> },
];

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const path = location.pathname.split("/")[1];
  const sidebarLinks = user?.role === 'client'
    ? clientLinkData
    : user?.isAdmin
    ? linkData
    : linkData.slice(0, 5);

  const closeSidebar = () => {
    dispatch(setOpenSidebar(false));
  };

  const NavLinkItem = ({ el }) => {
    const isActive = el.link.split("/")[0] === path;
    return (
      <Link
        onClick={closeSidebar}
        className={clsx(
          "w-full lg:w-3/4 flex gap-2 px-4 py-2.5 rounded-xl items-center text-sm font-medium transition-all duration-200",
          isActive
            ? "bloom-gradient text-white shadow-lg shadow-bloom-pink/30"
            : "text-bloom-dark hover:bg-bloom-pink/10 hover:text-bloom-pink"
        )}
        to={`/${el.link}`}
      >
        <span className="text-lg">{el.icon}</span>
        <span>{el.label}</span>
      </Link>
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 p-5 bg-bloom-white border-r border-bloom-gray-light/30">
      {/* Logo with gradient */}
      <div className="flex gap-3 items-center px-2 py-3">
        <img 
          src={bloomworksLogo} 
          alt="BloomWorks Logo"
          className="w-12 h-12 rounded-xl shadow-lg shadow-bloom-pink/25 object-contain"
        />
        <span className="text-2xl font-bold bloom-gradient-text">BloomWorks</span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col gap-y-2 py-4">
        {sidebarLinks.map((link) => (
          <NavLinkItem el={link} key={link.label} />
        ))}
      </div>

      {/* Settings Button */}
      <div className="border-t border-bloom-gray-light/30 pt-4">
        <button className="w-full flex gap-2 px-4 py-2.5 items-center text-sm text-bloom-gray hover:text-bloom-pink hover:bg-bloom-pink/10 rounded-xl transition-all duration-200">
          <MdSettings className="text-lg" />
          <span>Paramètres</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
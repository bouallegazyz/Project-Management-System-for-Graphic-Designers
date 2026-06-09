import React, { useState } from "react";
import { useSelector } from "react-redux";
import ClientGallery from "../components/ClientGallery";
import BriefUpload from "../components/BriefUpload";
import clsx from "clsx";
import { MdDescription, MdCollections } from "react-icons/md";

const ClientSpace = () => {
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("brief");

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Espace Client</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bienvenue {user?.fullname} — Soumettez vos briefs et consultez votre galerie.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-px">
        {[
          { id: "brief", label: "Dépôt de Brief", icon: MdDescription, color: "#2563eb" },
          { id: "gallery", label: "Projets Finaux", icon: MdCollections, color: "#16a34a" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px",
                isActive
                  ? "bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
              style={
                isActive
                  ? { borderBottomColor: tab.color, color: tab.color }
                  : {}
              }
            >
              <Icon className="text-lg" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {activeTab === "brief" && <BriefUpload />}
        {activeTab === "gallery" && <ClientGallery />}
      </div>
    </div>
  );
};

export default ClientSpace;

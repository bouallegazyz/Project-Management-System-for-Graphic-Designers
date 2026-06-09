import React, { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { IoIosNotificationsOutline } from "react-icons/io";
import { useGetNotificationsQuery, useMarkNotifReadMutation } from "../redux/slices/apiSlice";
import moment from "moment";
import { Link } from "react-router-dom";

const NotificationPanel = () => {
  const { data, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotifReadMutation();

  const notifications = Array.isArray(data) ? data : data ? [data] : [];

  const handleMarkAll = async () => {
    try {
      await markRead({ isReadType: "all" }).unwrap();
      refetch();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Popover className="relative">
      <Popover.Button className="relative outline-none p-2 rounded-xl hover:bg-bloom-pink/10 transition-colors">
        <IoIosNotificationsOutline className="text-2xl text-bloom-gray hover:text-bloom-pink transition-colors" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bloom-gradient text-white text-[10px] flex items-center justify-center rounded-full shadow-md shadow-bloom-pink/20">
            {notifications.length}
          </span>
        )}
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute -right-4 z-50 mt-3 w-80 bg-bloom-white rounded-xl shadow-xl border border-bloom-gray-light/30">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-bloom-dark">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-sm text-bloom-pink hover:text-bloom-pink/80 transition-colors"
                >
                  Tout marquer lu
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-bloom-gray text-center py-6">
                  Aucune nouvelle notification
                </p>
              ) : (
                notifications.map((n, i) => (
                  <div
                    key={n._id || i}
                    className="p-3 rounded-xl hover:bg-bloom-pink/5 border-b border-bloom-gray-light/30 last:border-0 transition-colors"
                  >
                    <p className="text-sm text-bloom-dark line-clamp-2">
                      {n.text}
                    </p>
                    <span className="text-xs text-bloom-gray mt-1 block">
                      {moment(n.createdAt).fromNow()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};

export default NotificationPanel;

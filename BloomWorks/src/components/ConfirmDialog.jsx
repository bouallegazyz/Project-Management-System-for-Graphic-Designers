import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

const ConfirmDialog = ({ open, setOpen, title, message, onConfirm, confirmLabel = "Supprimer", confirmColor = "bg-bloom-pink hover:bg-bloom-pink/90 shadow-lg shadow-bloom-pink/20" }) => {
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-bloom-white p-6 text-left align-middle shadow-2xl transition-all border border-bloom-gray-light/30">
                <Dialog.Title as="h3" className="text-lg font-bold text-bloom-dark">
                  {title || "Êtes-vous sûr ?"}
                </Dialog.Title>
                <div className="mt-3">
                  <p className="text-sm text-bloom-gray">
                    {message || "Cette action est irréversible."}
                  </p>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2.5 text-sm font-medium text-bloom-dark bg-bloom-bg rounded-xl hover:bg-bloom-pink/10 hover:text-bloom-pink border border-bloom-gray-light/30 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all ${confirmColor}`}
                    onClick={() => {
                      onConfirm();
                      setOpen(false);
                    }}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmDialog;

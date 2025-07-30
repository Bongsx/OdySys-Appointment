import React from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

function ViewAppointmentModal({ open, onClose, form }) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-6 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-lg leading-6 font-medium text-gray-900"
                    >
                      Appointment Details
                    </Dialog.Title>
                    <div className="mt-4 text-sm text-gray-600 space-y-2">
                      <div>
                        <strong>Patient Name:</strong> {form.patientName || "-"}
                      </div>
                      <div>
                        <strong>Email:</strong> {form.email || "-"}
                      </div>
                      <div>
                        <strong>Test Name:</strong> {form.labTestName || "-"}
                      </div>
                      <div>
                        <strong>Slot Number:</strong> #{form.slotNumber || "-"}
                      </div>
                      <div>
                        <strong>Date :</strong> {form.createdAt?.date || "-"}
                      </div>
                      <div>
                        <strong>Time:</strong> {form.createdAt?.time || "-"}
                      </div>
                      <div>
                        <strong>Estimated Time:</strong>{" "}
                        {form.estimatedTime || "-"}
                      </div>
                      <div>
                        <strong>Notes:</strong> {form.notes || "None"}
                      </div>
                      <div>
                        <strong>Patient Complaint:</strong>{" "}
                        {form.patientComplaint || "None"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:ml-3 sm:w-auto"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export default ViewAppointmentModal;

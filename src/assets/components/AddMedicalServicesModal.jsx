import { useState } from "react";
import { ref, push, set } from "firebase/database";
import { database } from "../firebase/firebase";

function AddMedicalServices({ open, onClose }) {
  const [serviceType, setServiceType] = useState("consultationTypes");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) return alert("Name is required");

    const serviceRef = ref(database, `medicalServices/${serviceType}`);
    const newServiceRef = push(serviceRef);

    const data =
      serviceType === "specialties" ? { name } : { name, description };

    await set(newServiceRef, data);

    // Reset form
    setName("");
    setDescription("");
    setServiceType("consultationTypes");
    alert("Medical service added successfully!");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Medical Service</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Service Type</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              <option value="consultationTypes">Consultation Type</option>
              <option value="imagingTests">Imaging Test</option>
              <option value="laboratoryTests">Laboratory Test</option>
              <option value="specialties">Specialty</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input
              type="text"
              placeholder="Enter service name"
              className="w-full border px-3 py-2 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {serviceType !== "specialties" && (
            <div>
              <label className="block mb-1 font-medium">Description</label>
              <textarea
                placeholder="Enter service description"
                className="w-full border px-3 py-2 rounded"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMedicalServices;

// src/pages/Home.jsx
import React, { useState } from 'react';
import PatientBooking from '../components/PatientBooking';
import LaboratoryExams from '../components/LaboratoryExams';
import { CalendarDays, FlaskConical } from 'lucide-react';

function Home() {
  const [selectedOption, setSelectedOption] = useState('booking');

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        Laboratory Management System
      </h1>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button
          onClick={() => handleOptionChange('booking')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-lg shadow transition duration-200 ${
            selectedOption === 'booking'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          Patient Booking
        </button>

        <button
          onClick={() => handleOptionChange('labExams')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-lg shadow transition duration-200 ${
            selectedOption === 'labExams'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-green-100'
          }`}
        >
          <FlaskConical className="w-5 h-5" />
          Laboratory Exams
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow p-6 transition duration-300">
        {selectedOption === 'booking' ? <PatientBooking /> : <LaboratoryExams />}
      </div>
    </div>
  );
}

export default Home;

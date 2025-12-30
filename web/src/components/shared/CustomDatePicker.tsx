import React, { useState, useEffect } from 'react';

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  title: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  onClose,
  title,
}) => {
  const [tempDate, setTempDate] = useState(new Date(value));

  useEffect(() => {
    setTempDate(new Date(value));
  }, [value]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const currentYear = tempDate.getFullYear();
  const currentMonth = tempDate.getMonth() + 1;
  const currentDay = tempDate.getDate();
  const currentHour = tempDate.getHours();
  const currentMinute = tempDate.getMinutes();

  const years = [];
  for (let i = new Date().getFullYear(); i <= new Date().getFullYear() + 5; i++) {
    years.push(i);
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const updateTempDate = (field: string, val: number) => {
    const newDate = new Date(tempDate);
    if (field === 'year') {
      newDate.setFullYear(val);
    } else if (field === 'month') {
      newDate.setMonth(val - 1);
    } else if (field === 'day') {
      newDate.setDate(val);
    } else if (field === 'hour') {
      newDate.setHours(val);
    } else if (field === 'minute') {
      newDate.setMinutes(val);
    }
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-300 font-medium"
          >
            Cancel
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={handleConfirm}
            className="text-primary font-semibold"
          >
            Done
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex h-full overflow-x-auto">
            {/* Year Column */}
            <div className="flex flex-col border-r border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Year</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => updateTempDate('year', year)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentYear === year
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Month Column */}
            <div className="flex flex-col border-r border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Month</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {months.map((month) => (
                  <button
                    key={month}
                    onClick={() => updateTempDate('month', month)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentMonth === month
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {month.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Day Column */}
            <div className="flex flex-col border-r border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Day</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => updateTempDate('day', day)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentDay === day
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Hour Column */}
            <div className="flex flex-col border-r border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Hour</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => updateTempDate('hour', hour)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentHour === hour
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {hour.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Minute Column */}
            <div className="flex flex-col">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Minute</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => updateTempDate('minute', minute)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentMinute === minute
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


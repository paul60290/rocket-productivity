import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function MiniCalendar({ selectedDate, onDateChange, entries = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysInMonth = endOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const dayDateString = dayDate.toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'

    const isToday = new Date().toDateString() === dayDate.toDateString();
    const isSelected = selectedDate.toDateString() === dayDate.toDateString();
    const hasEntry = entries.includes(dayDateString);

    days.push(
      <div
        key={i}
        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEntry ? 'has-entry' : ''}`}
        onClick={() => onDateChange(dayDate)}
      >
        <span>{i}</span>
      </div>
    );
  }

  const changeMonth = (offset) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="mini-calendar">
      <div className="calendar-header">
        <button onClick={() => changeMonth(-1)} title="Previous Month"><FaChevronLeft /></button>
        <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => changeMonth(1)} title="Next Month"><FaChevronRight /></button>
      </div>
      <div className="calendar-grid">
        <div className="day-name">S</div>
        <div className="day-name">M</div>
        <div className="day-name">T</div>
        <div className="day-name">W</div>
        <div className="day-name">T</div>
        <div className="day-name">F</div>
        <div className="day-name">S</div>
        {days}
      </div>
    </div>
  );
}
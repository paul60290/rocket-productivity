import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import maximizeIcon from '../assets/maximize-icon.svg';
import minimizeIcon from '../assets/minimize-icon.svg';

export default function CalendarPanel({ calendarEvents, setCalendarEvents, isMaximized, onToggleMaximize }) {
  const [modalInfo, setModalInfo] = useState({ isOpen: false, start: null, end: null });
  const [eventTitle, setEventTitle] = useState('');
  const calendarRef = useRef(null);

  // This effect runs when the calendar is maximized or minimized
  useEffect(() => {
    // Wait for the CSS transition to finish (300ms) before updating the calendar's size
    const timer = setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
      }
    }, 300); // This duration should match the transition time in App.css

    return () => clearTimeout(timer); // Cleanup the timer
  }, [isMaximized]); // Only run this effect when isMaximized changes

  const handleSelectSlot = (info) => {
    setModalInfo({ isOpen: true, start: info.startStr, end: info.endStr });
    setEventTitle('');
  };

  const handleSaveEvent = () => {
    if (!eventTitle.trim()) return;
    
    const newEvent = {
      id: `${Date.now()}-${eventTitle}`,
      title: eventTitle,
      start: modalInfo.start,
      end: modalInfo.end,
    };

    setCalendarEvents(prevEvents => [...prevEvents, newEvent]);
    setModalInfo({ isOpen: false, start: null, end: null });
  };

  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
    }
  };

  return (
    <div className="calendar-panel">
      <div className="panel-header">
        <h3>Calendar</h3>
        {onToggleMaximize && (
            <button onClick={onToggleMaximize} className="maximize-btn" title={isMaximized ? "Minimize" : "Maximize"}>
              <img src={isMaximized ? minimizeIcon : maximizeIcon} alt={isMaximized ? "Minimize" : "Maximize"} />
            </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 10px 10px 10px' }}>
        <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            nowIndicator={true}
            headerToolbar={{
    left: 'title',
    center: 'dayGridMonth,timeGridWeek,timeGridDay',
    right: 'prev,next customToday'
}}
            customButtons={{
              customToday: {
                text: 'Today',
                click: goToToday,
              }
            }}
            editable={true}
            eventResizableFromStart={true}
            slotMinTime="00:00:00"
            height="100%"
            events={calendarEvents}
            selectable={true}
            select={handleSelectSlot}
            eventDrop={(info) => {
              setCalendarEvents(prevEvents => prevEvents.map(evt => 
                evt.id === info.event.id ? { ...evt, start: info.event.startStr, end: info.event.endStr } : evt
              ));
            }}
            eventResize={(info) => {
              setCalendarEvents(prevEvents => prevEvents.map(evt => 
                evt.id === info.event.id ? { ...evt, start: info.event.startStr, end: info.event.endStr } : evt
              ));
            }}
            eventClick={(info) => {
              if (window.confirm(`Delete event "${info.event.title}"?`)) {
                setCalendarEvents(prevEvents => prevEvents.filter(evt => evt.id !== info.event.id));
              }
            }}
        />
      </div>

      {modalInfo.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Event</h3>
            <div className="form-group">
              <label>Event Title</label>
              <input
                type="text"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEvent(); }}
              />
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setModalInfo({ isOpen: false, start: null, end: null })}>Cancel</button>
              <button type="button" className="save-btn" onClick={handleSaveEvent}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
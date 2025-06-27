import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import maximizeIcon from '../assets/maximize-icon.svg';
import minimizeIcon from '../assets/minimize-icon.svg';

// Helper function to format dates for the datetime-local input
const toDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function CalendarPanel({ calendarEvents, setCalendarEvents, isMaximized, onToggleMaximize }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const calendarRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      calendarRef.current?.getApi().updateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isMaximized]);

  const handleSelectSlot = (info) => {
    setFormData({
      id: null, // This is a new event
      title: '',
      start: toDateTimeLocal(info.startStr),
      end: toDateTimeLocal(info.endStr),
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (info) => {
    setFormData({
      id: info.event.id,
      title: info.event.title,
      start: toDateTimeLocal(info.event.startStr),
      end: toDateTimeLocal(info.event.endStr),
    });
    setIsModalOpen(true);
  };
  
  const handleFabClick = () => {
    const now = new Date();
    const start = new Date(now.getTime() - now.getTimezoneOffset() * 60000); // Current local time
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later
    
    setFormData({
        id: null,
        title: '',
        start: start.toISOString().slice(0, 16),
        end: end.toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEvent = () => {
    if (!formData.title?.trim()) return;

    const eventData = {
      title: formData.title,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
    };

    if (formData.id) {
      // Update existing event
      setCalendarEvents(prev => prev.map(evt => evt.id === formData.id ? { ...evt, ...eventData } : evt));
    } else {
      // Create new event
      setCalendarEvents(prev => [...prev, { ...eventData, id: `${Date.now()}` }]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteEvent = () => {
    if (!formData.id) return;
    setCalendarEvents(prev => prev.filter(evt => evt.id !== formData.id));
    setIsModalOpen(false);
  };

  const goToToday = () => {
    calendarRef.current?.getApi().today();
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

      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ height: '100%', overflow: 'auto', padding: '0 10px 10px 10px' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            nowIndicator={true}
            headerToolbar={{
              left: 'prev,next customToday',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            customButtons={{
              customToday: { text: 'Today', click: goToToday }
            }}
            editable={true}
            eventResizableFromStart={true}
            slotMinTime="00:00:00"
            height="100%"
            events={calendarEvents}
            selectable={true}
            select={handleSelectSlot}
            eventClick={handleEventClick}
            eventDrop={(info) => {
              setCalendarEvents(prev => prev.map(evt => 
                evt.id === info.event.id ? { ...evt, start: info.event.startStr, end: info.event.endStr } : evt
              ));
            }}
            eventResize={(info) => {
              setCalendarEvents(prev => prev.map(evt => 
                evt.id === info.event.id ? { ...evt, start: info.event.startStr, end: info.event.endStr } : evt
              ));
            }}
          />
        </div>
        <button className="calendar-fab" onClick={handleFabClick} title="Add New Event">+</button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{formData.id ? 'Edit Event' : 'Add New Event'}</h3>
            <div className="form-group">
              <label>Event Title</label>
              <input
                name="title"
                type="text"
                value={formData.title || ''}
                onChange={handleModalChange}
                autoFocus
              />
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>Start Time</label>
                    <input
                        name="start"
                        type="datetime-local"
                        value={formData.start || ''}
                        onChange={handleModalChange}
                    />
                </div>
                <div className="form-group">
                    <label>End Time</label>
                    <input
                        name="end"
                        type="datetime-local"
                        value={formData.end || ''}
                        onChange={handleModalChange}
                    />
                </div>
            </div>
            <div className="modal-footer">
              {formData.id && <button type="button" className="remove-btn" onClick={handleDeleteEvent}>Delete</button>}
              <div style={{flexGrow: 1}}></div> {/* Spacer */}
              <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="button" className="save-btn" onClick={handleSaveEvent}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
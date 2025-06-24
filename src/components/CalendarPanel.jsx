import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function CalendarPanel({ calendarEvents, setCalendarEvents }) {
  return (
    <div className="calendar-panel">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        nowIndicator={true}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        editable={true}
        eventResizableFromStart={true}
        slotMinTime="00:00:00"
        slotMaxTime="22:00:00"
        height="auto"
        events={calendarEvents}
        selectable={true}
        select={(info) => {
          const title = prompt('Enter task name for this time block:');
          if (title) {
            setCalendarEvents(prevEvents => [
              ...prevEvents,
              { id: `<span class="math-inline">\{title\}\-</span>{info.startStr}`, title, start: info.start, end: info.end }
            ]);
          }
        }}
        eventDrop={(info) => {
          setCalendarEvents(prevEvents => prevEvents.map(evt => 
            evt.id === info.event.id ? { ...evt, start: info.event.start, end: info.event.end } : evt
          ));
        }}
        eventResize={(info) => {
          setCalendarEvents(prevEvents => prevEvents.map(evt => 
            evt.id === info.event.id ? { ...evt, start: info.event.start, end: info.event.end } : evt
          ));
        }}
        eventClick={(info) => {
          const input = prompt('Edit event title (leave empty to delete):', info.event.title);
          if (input === null) return;
          if (!input.trim()) {
            setCalendarEvents(prevEvents => prevEvents.filter(evt => evt.id !== info.event.id));
          } else {
            setCalendarEvents(prevEvents => prevEvents.map(evt => 
              evt.id === info.event.id ? { ...evt, title: input } : evt
            ));
          }
        }}
      />
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Maximize2, Minimize2, Plus } from "lucide-react";

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
  <div className="flex flex-col h-full bg-card">
    <div className="flex items-center justify-between p-3 border-b shrink-0">
      <h3 className="text-lg font-semibold">Calendar</h3>
      {onToggleMaximize && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleMaximize}
          title={isMaximized ? "Minimize" : "Maximize"}
        >
          {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      )}
    </div>

    <div className="flex-1 relative p-2">
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
      <Button
        size="icon"
        className="absolute bottom-4 right-4 z-10 rounded-full h-12 w-12 shadow-lg"
        onClick={handleFabClick}
        title="Add New Event"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>

    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{formData.id ? 'Edit Event' : 'Add New Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              value={formData.title || ''}
              onChange={handleModalChange}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                name="start"
                type="datetime-local"
                value={formData.start || ''}
                onChange={handleModalChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                name="end"
                type="datetime-local"
                value={formData.end || ''}
                onChange={handleModalChange}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          {formData.id && (
            <Button variant="destructive" className="mr-auto" onClick={handleDeleteEvent}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEvent}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
}
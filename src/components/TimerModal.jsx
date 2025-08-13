import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function TimerModal({
  onClose,
  time,
  setTime,
  inputTime,
  setInputTime,
  isRunning,
  onStart,
  onPause,
  onResume,
  onReset,
  formatTime
}) {
  const quickDurations = [5, 10, 15, 25, 30, 60];

  const selectQuickDuration = (minutes) => {
    if (!isRunning && minutes) {
      const newTime = parseInt(minutes, 10);
      setInputTime(newTime);
      setTime(newTime * 60);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Focus Timer</DialogTitle>
          <DialogDescription>
            Select a duration or enter a custom time to begin a focus session.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-6xl font-bold font-mono tracking-tighter">
            {formatTime(time)}
          </p>
        </div>
        <div className="space-y-4">
          <Label>Quick Select (minutes)</Label>
          <ToggleGroup
            type="single"
            value={String(inputTime)}
            onValueChange={selectQuickDuration}
            className="grid grid-cols-6"
            disabled={isRunning}
          >
            {quickDurations.map(duration => (
              <ToggleGroupItem key={duration} value={String(duration)}>
                {duration}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Label htmlFor="custom-time" className="whitespace-nowrap">
            Custom:
          </Label>
          <Input
            id="custom-time"
            type="number"
            value={inputTime}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val > 0) {
                setInputTime(val);
                if (!isRunning) setTime(val * 60);
              } else {
                setInputTime('');
              }
            }}
            min="1"
            max="120"
            disabled={isRunning}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          {isRunning ? (
            <Button onClick={onPause} variant="secondary" size="lg">Pause</Button>
          ) : (
            <Button onClick={time > 0 && time < inputTime * 60 ? onResume : onStart} size="lg">
              {time > 0 && time < inputTime * 60 ? 'Resume' : 'Launch'}
            </Button>
          )}
          <Button onClick={onReset} variant="outline" size="lg">Reset</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TimerModal;
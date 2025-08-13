import { useState, useRef, useEffect } from 'react';

export const useTimer = (initialMinutes = 25) => {
  const [time, setTime] = useState(initialMinutes * 60);
  const [inputTime, setInputTime] = useState(initialMinutes);
  const [isRunning, setIsRunning] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTimerCompleteModal, setShowTimerCompleteModal] = useState(false);
  const intervalRef = useRef(null);

  const handleTimerCompletion = () => {
    // Play the chime
    const chime = document.getElementById('timer-chime');
    if (chime) {
      chime.play().catch(error => {
        console.error("Audio playback failed on completion:", error);
      });
    }
    // Show the completion modal
    setShowTimerCompleteModal(true);
  };

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          handleTimerCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  useEffect(() => {
    if (showTimerCompleteModal) {
      document.getElementById('timer-chime')?.play().catch(error => {
        console.error("Audio playback failed:", error);
      });
    }
  }, [showTimerCompleteModal]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setTime(inputTime * 60);
    setIsRunning(true);
    setShowTimerModal(false);
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
  };

  const handleResumeTimer = () => {
    setIsRunning(true);
    setShowTimerModal(false);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTime(inputTime * 60);
  };
  
  const handleCancelTimer = () => {
    setTimerIsRunning(false);
    setTimerInputTime(25);
    setTimerTime(25 * 60);
  };

  return {
    time,
    setTime,
    inputTime,
    setInputTime,
    isRunning,
    showTimerModal,
    setShowTimerModal,
    showTimerCompleteModal,
    setShowTimerCompleteModal,
    formatTime,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleResetTimer,
    handleCancelTimer,
  };
};
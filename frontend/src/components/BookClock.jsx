import React, { useState, useEffect, useRef } from 'react';

const SkyBlueFlipClock = () => {
  const [time, setTime] = useState({
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

  const [prevTime, setPrevTime] = useState({
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

  const [animating, setAnimating] = useState({
    hours: false,
    minutes: false,
    seconds: false
  });

  const flipRefs = {
    hours: useRef(null),
    minutes: useRef(null),
    seconds: useRef(null)
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const newTime = {
        hours: String(now.getHours()).padStart(2, '0'),
        minutes: String(now.getMinutes()).padStart(2, '0'),
        seconds: String(now.getSeconds()).padStart(2, '0')
      };

      // Check which digits have changed
      const changes = {
        hours: newTime.hours !== time.hours,
        minutes: newTime.minutes !== time.minutes,
        seconds: newTime.seconds !== time.seconds
      };

      if (changes.seconds || changes.minutes || changes.hours) {
        setPrevTime(time);
        setTime(newTime);
        setAnimating(changes);
        
        // Reset animation flags after the animation duration
        setTimeout(() => {
          setAnimating({
            hours: false,
            minutes: false,
            seconds: false
          });
        }, 600); // Should match CSS animation duration
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, [time]);

  return (
    <div className="flip-clock-container">
      <div className="flip-clock">
        {/* Hours */}
        <div className="flip-card" ref={flipRefs.hours}>
          <div className="top">{time.hours}</div>
          <div className="bottom">{prevTime.hours}</div>
          {animating.hours && (
            <>
              <div className="flip-top">{prevTime.hours}</div>
              <div className="flip-bottom">{time.hours}</div>
            </>
          )}
        </div>
        
        <div className="colon">:</div>
        
        {/* Minutes */}
        <div className="flip-card" ref={flipRefs.minutes}>
          <div className="top">{time.minutes}</div>
          <div className="bottom">{prevTime.minutes}</div>
          {animating.minutes && (
            <>
              <div className="flip-top">{prevTime.minutes}</div>
              <div className="flip-bottom">{time.minutes}</div>
            </>
          )}
        </div>
        
        <div className="colon">:</div>
        
        {/* Seconds */}
        <div className="flip-card" ref={flipRefs.seconds}>
          <div className="top">{time.seconds}</div>
          <div className="bottom">{prevTime.seconds}</div>
          {animating.seconds && (
            <>
              <div className="flip-top">{prevTime.seconds}</div>
              <div className="flip-bottom">{time.seconds}</div>
            </>
          )}
        </div>
      </div>
      
      <div className="clock-labels">
        <span>Hours</span>
        <span>Minutes</span>
        <span>Seconds</span>
      </div>
    </div>
  );
};

export default SkyBlueFlipClock;
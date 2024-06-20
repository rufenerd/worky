import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isIn, setIsIn] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('');
  const [punches, setPunches] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        const checkPunches = async () => {
          const response = await axios.get('https://worky.koyeb.app/punches');
          const punches = response.data
          if (punches?.length) {
            setPunches(punches)
          }
        }
        setInterval(checkPunches, 1000)
      } catch (error) {
        console.error('Is the backend running and working?', error);
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!punches?.length) {
      return
    }
    const lastPunch = punches[punches.length - 1]
    setIsIn(lastPunch?.isin)
    if (lastPunch?.isin) {
      setStartTime(Date.now() - calculateTotalInDuration(punches))
    } else {
      setStartTime(lastPunch.epochmillis)
    }
  }, [punches])

  const msToTime = (ms) => {
    const hours = String(Math.floor(ms / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((ms % (1000 * 60)) / 1000)).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`
  }

  useEffect(() => {
    let timer;

    if (startTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const diff = now - startTime;
        setElapsedTime(msToTime(diff));
      }, 500);
    } else {
      setElapsedTime('');
    }

    return () => clearInterval(timer);
  }, [startTime]);

  const calculateTotalInDuration = (punches) => {
    if (!punches) {
      return 0
    }
    let totalInDuration = 0;
    let lastInTime = null;

    for (let i = 0; i < punches.length; i++) {
      const punch = punches[i];

      if (punch.isin) {
        lastInTime = punch.epochmillis;
      } else {
        if (lastInTime !== null) {
          totalInDuration += punch.epochmillis - lastInTime;
          lastInTime = null;
        }
      }
    }

    if (lastInTime !== null) {
      totalInDuration += Date.now() - lastInTime;
    }

    return totalInDuration;
  }

  const punchClick = async () => {
    try {
      const newIsIn = !isIn;
      if (!newIsIn) {
        setStartTime(Date.now());
        setElapsedTime('00:00:00')
      } else {
        setElapsedTime('')
        setStartTime(Date.now() - calculateTotalInDuration(punches))
      }
      setIsIn(newIsIn);
      const response = await axios.post('https://worky.koyeb.app/punch', { isIn: newIsIn, epochMillis: Date.now() });
      setPunches(response.data)
    } catch (error) {
      console.error('Error storing data', error);
      throw "Is the server running?"
    }
  };

  const inDuration = calculateTotalInDuration(punches)

  return (
    <div className={`app ${isIn ? 'in' : 'out'}`} onClick={punchClick}>
      <div className="clock">
        {elapsedTime}
      </div>
      {!isIn && !!inDuration && <div className="inDuration">{msToTime(inDuration)}</div>}
    </div>
  );
}

export default App;

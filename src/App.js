import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
const schedule = require('node-schedule');

function App() {
  const [isIn, setIsIn] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('');
  const [punches, setPunches] = useState(null);
  const latestPunches = useRef(punches)
  const [outInDuration, setOutInDuration] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const checkPunches = async () => {
          const response = await axios.get('https://worky.koyeb.app/punches');
          const newPunches = response.data;
          if (!newPunches?.length) {
            console.log("RESETTING", JSON.stringify(latestPunches))
            if (latestPunches.current?.length) {
              latestPunches.current.forEach(async (punch) => {
                await postWithRetry('https://worky.koyeb.app/punch', punch);
              });
            }
          } else {
            latestPunches.current = newPunches
            setPunches(newPunches);
          }

          let rule = new schedule.RecurrenceRule();
          rule.tz = 'America/Los_Angeles';
          rule.second = 0;
          rule.minute = 0;
          rule.hour = 0;
          schedule.scheduleJob(rule, () => {
            latestPunches.current = []
            setPunches([]);
            setIsIn(false);
            setStartTime(null);
            setElapsedTime('');
            setOutInDuration(null);
          });
        };

        setInterval(checkPunches, 2000);
      } catch (error) {
        console.error('Is the backend running and working?', error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!punches?.length) {
      return;
    }
    const lastPunch = punches[punches.length - 1];
    setIsIn(lastPunch?.isIn);
    const inDuration = calculateTotalInDuration(punches);
    if (lastPunch?.isIn) {
      setStartTime(Date.now() - inDuration);
    } else {
      setStartTime(lastPunch.epochMillis);
      setOutInDuration(inDuration);
    }
  }, [punches]);

  const msToTime = (ms) => {
    const hours = String(Math.floor(ms / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((ms % (1000 * 60)) / 1000)).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

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
      return 0;
    }
    let totalInDuration = 0;
    let lastInTime = null;

    for (let i = 0; i < punches.length; i++) {
      const punch = punches[i];

      if (punch.isIn) {
        lastInTime = punch.epochMillis;
      } else {
        if (lastInTime !== null) {
          totalInDuration += punch.epochMillis - lastInTime;
          lastInTime = null;
        }
      }
    }

    if (lastInTime !== null) {
      totalInDuration += Date.now() - lastInTime;
    }

    return totalInDuration;
  };

  const postWithRetry = async (url, data, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await axios.post(url, data);
        return;
      } catch (error) {
        console.error(`Attempt ${i + 1} failed, retrying in ${delay}ms`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    console.error('All retry attempts failed');
  };

  const punchClick = async () => {
    try {
      const newIsIn = !isIn;
      const inDuration = calculateTotalInDuration(punches);
      if (!newIsIn) {
        setStartTime(Date.now());
        setElapsedTime('00:00:00');
        setOutInDuration(inDuration);
      } else {
        setElapsedTime(msToTime(outInDuration || inDuration));
        setStartTime(Date.now() - inDuration);
      }
      setIsIn(newIsIn);
      await postWithRetry('https://worky.koyeb.app/punch', {
        isIn: newIsIn,
        epochMillis: Date.now(),
      });
      const response = await axios.get('https://worky.koyeb.app/punches');
      const newPunches = response.data
      setPunches(newPunches);
      latestPunches.current = newPunches
    } catch (error) {
      console.error('Error storing data', error);
      throw 'Is the server running?';
    }
  };

  return (
    <div className={`app ${isIn ? 'in' : 'out'}`} onClick={punchClick}>
      <div className="clock">{elapsedTime}</div>
      {!isIn && !!outInDuration && <div className="inDuration">{msToTime(outInDuration)}</div>}
      {isIn && <div className="inDuration"></div>}
    </div>
  );
}

export default App;

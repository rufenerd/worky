import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isIn, setIsIn] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    let timer;

    if (startTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const diff = now - startTime;
        const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
        const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    } else {
      setElapsedTime('');
    }

    return () => clearInterval(timer);
  }, [startTime]);

  const punchClick = async () => {
    try {
      const newIsIn = !isIn;
      setStartTime(Date.now());
      setElapsedTime('00:00:00')
      setIsIn(newIsIn);
      const response = await axios.post('http://localhost:5001/punch', { isIn: newIsIn, epochMillis: Date.now() });
      console.log(response.data);
    } catch (error) {
      console.error('Error storing data', error);
    }
  };

  return (
    <div className={`app ${isIn ? 'in' : 'out'}`} onClick={punchClick}>
      <div className="clock">
        {elapsedTime}
      </div>
    </div>
  );
}

export default App;

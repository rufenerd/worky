import React, { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [data, setData] = useState('');

  const handleChange = (e) => {
    setData(e.target.value)
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post('http://localhost:5001/store-data', { data })
      console.log(response.data)
    } catch (error) {
      console.error('Error storing data', error)
    }
  };

  return (
    <div>
      <input type="text" value={data} onChange={handleChange} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  )
}

export default App;
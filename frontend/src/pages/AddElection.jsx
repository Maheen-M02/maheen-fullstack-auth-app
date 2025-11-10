import React, { useState } from 'react';
import axios from 'axios';

const AddElection = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/elections', {
        title,
        description,
        startDate,
        endDate,
      });
      console.log('Election created:', response.data);
      // Optionally reset form or redirect
    } catch (error) {
      console.error('Error creating election:', error);
    }
  };

  return (
    <div>
      <h2>Add Election</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title:</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label>Description:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <label>Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label>End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <button type="submit">Create Election</button>
      </form>
    </div>
  );
};

export default AddElection;
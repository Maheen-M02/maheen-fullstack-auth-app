import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getElections } from '../services/api';

function Dashboard({ user }) {
  const [elections, setElections] = useState([
    {
      _id: 'mock-election-1',
      title: 'Mock Election 1',
      description: 'This is a mock election for testing purposes.',
      startAt: new Date(),
      endAt: new Date(new Date().getTime() + 60 * 60 * 1000), // Ends in 1 hour
      status: 'active',
    },
    {
      _id: 'mock-election-2',
      title: 'Mock Election 2',
      description: 'This is another mock election for demonstration.',
      startAt: new Date(),
      endAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Ends in 24 hours
      status: 'upcoming',
    },
  ]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (elections.length === 0) {
      fetchElections();
    } else {
      setLoading(false);
    }
  }, [filter, elections]);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const data = await getElections("");
      setElections(data.elections);
    } catch (error) {
      console.error('Failed to fetch elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endAt) => {
    const diff = new Date(endAt) - new Date();
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Elections Dashboard</h1>
        <p>Welcome, {user.name}!</p>
      </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button 
          className={filter === 'upcoming' ? 'active' : ''}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={filter === 'past' ? 'active' : ''}
          onClick={() => setFilter('past')}
        >
          Past
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading elections...</div>
      ) : elections.length === 0 ? (
        <div className="empty-state">
          <p>No {filter} elections found</p>
        </div>
      ) : (
        <div className="elections-grid">
          {elections.map((election) => (
            <div key={election._id} className="election-card">
              <div className="election-header">
                <h3>{election.title}</h3>
                <span className={`status-badge status-${election.status}`}>
                  {election.status}
                </span>
              </div>
              <p className="election-description">{election.description}</p>
              <div className="election-meta">
                <p><strong>Starts:</strong> {new Date(election.startAt).toLocaleString()}</p>
                <p><strong>Ends:</strong> {new Date(election.endAt).toLocaleString()}</p>
                {election.status === 'active' && (
                  <p className="time-remaining">{getTimeRemaining(election.endAt)}</p>
                )}
              </div>
              <div className="election-actions">
                {election.status === 'active' && (
                  <Link to={`/election/${election._id}/vote`} className="btn btn-primary">
                    Vote Now
                  </Link>
                )}
                <Link to={`/election/${election._id}/results`} className="btn btn-secondary">
                  View Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
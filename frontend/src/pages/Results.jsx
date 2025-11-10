import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getElection, getResults } from '../services/api';

function Results({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [electionData, resultsData] = await Promise.all([
        getElection(id),
        getResults(id)
      ]);
      
      setElection(electionData.election);
      setResults(resultsData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading results...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!election || !results) return <div className="error">Data not found</div>;

  const maxVotes = Math.max(...results.results.map(r => r.votes));

  return (
    <div className="results-container">
      <div className="results-card">
        <h1>{election.title}</h1>
        <p className="election-description">{election.description}</p>
        
        <div className="results-meta">
          <span className={`status-badge status-${election.status}`}>{election.status}</span>
          <span>Total Votes: {results.totalVotes}</span>
        </div>

        <div className="results-list">
          <h3>Results:</h3>
          {results.results
            .sort((a, b) => b.votes - a.votes)
            .map((candidate, index) => {
              const percentage = results.totalVotes > 0 
                ? ((candidate.votes / results.totalVotes) * 100).toFixed(1)
                : 0;
              
              return (
                <div key={candidate.candidateId} className="result-item">
                  <div className="result-header">
                    <div className="candidate-rank">#{index + 1}</div>
                    <div className="candidate-details">
                      <h4>{candidate.name}</h4>
                      {candidate.description && <p>{candidate.description}</p>}
                    </div>
                    <div className="vote-count">
                      <strong>{candidate.votes}</strong> votes
                      <span className="percentage">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="results-footer">
          <p>Last updated: {new Date(results.lastUpdated).toLocaleString()}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default Results;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getElection, castVote, getVoteStatus } from '../services/api';

function Ballot({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchElectionData();
  }, [id]);

  const fetchElectionData = async () => {
    try {
      const [electionData, voteStatus] = await Promise.all([
        getElection(id),
        getVoteStatus(id)
      ]);
      
      setElection(electionData.election);
      setHasVoted(voteStatus.hasVoted);
    } catch (error) {
      setError('Failed to load election');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCandidate) {
      setError('Please select a candidate');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await castVote(id, { candidateId: selectedCandidate });
      setSuccess(true);
      setHasVoted(true);
      setShowConfirm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cast vote');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading ballot...</div>;
  if (!election) return <div className="error">Election not found</div>;

  if (hasVoted) {
    return (
      <div className="ballot-container">
        <div className="success-message">
          <h2>✓ Vote Recorded</h2>
          <p>Your vote has been successfully recorded for <strong>{election.title}</strong></p>
          <p>Thank you for participating!</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
          <button onClick={() => navigate(`/election/${id}/results`)} className="btn btn-secondary">
            View Results
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="ballot-container">
        <div className="success-message">
          <h2>✓ Vote Cast Successfully!</h2>
          <p>Your vote for <strong>{election.title}</strong> has been recorded.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
          <button onClick={() => navigate(`/election/${id}/results`)} className="btn btn-secondary">
            View Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ballot-container">
      <div className="ballot-card">
        <h1>{election.title}</h1>
        <p className="election-description">{election.description}</p>
        
        {error && <div className="alert alert-error">{error}</div>}

        <div className="candidates-list">
          <h3>Select Your Candidate:</h3>
          {election.candidates.map((candidate) => (
            <div 
              key={candidate.candidateId}
              className={`candidate-option ${selectedCandidate === candidate.candidateId ? 'selected' : ''}`}
              onClick={() => setSelectedCandidate(candidate.candidateId)}
            >
              <input
                type="radio"
                name="candidate"
                value={candidate.candidateId}
                checked={selectedCandidate === candidate.candidateId}
                onChange={() => setSelectedCandidate(candidate.candidateId)}
              />
              <div className="candidate-info">
                {candidate.imageUrl && (
                  <img src={candidate.imageUrl} alt={candidate.name} className="candidate-image" />
                )}
                <div>
                  <h4>{candidate.name}</h4>
                  <p>{candidate.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ballot-actions">
          <button 
            onClick={() => setShowConfirm(true)} 
            className="btn btn-primary"
            disabled={!selectedCandidate || submitting}
          >
            Submit Vote
          </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Your Vote</h3>
            <p>You are about to vote for:</p>
            <p className="confirm-candidate">
              <strong>
                {election.candidates.find(c => c.candidateId === selectedCandidate)?.name}
              </strong>
            </p>
            <p className="warning-text">⚠️ This action cannot be undone. You can only vote once.</p>
            <div className="modal-actions">
              <button 
                onClick={handleSubmit} 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Vote'}
              </button>
              <button 
                onClick={() => setShowConfirm(false)} 
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ballot;
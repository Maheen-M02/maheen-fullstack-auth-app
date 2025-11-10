import React, { useState, useEffect } from 'react';
import { 
  getElections, 
  createElection, 
  updateElection, 
  deleteElection,
  closeElection,
  getAuditLogs 
} from '../services/api';


function Admin({ user }) {
  const [elections, setElections] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  const [activeTab, setActiveTab] = useState('elections');
  const [formData, setFormData] = useState({
    description: '',
    startAt: '',
    endAt: '',
    candidates: [{ name: '', description: '' }, { name: '', description: '' }],
    isPublicResults: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (activeTab === 'elections') {
      fetchElections();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchElections = async () => {
    try {
      const data = await getElections();
      setElections(data.elections);
    } catch (error) {
      console.error('Failed to fetch elections:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await getAuditLogs();
      setAuditLogs(data.logs);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingElection) {
        await updateElection(editingElection._id, formData);
        setSuccess('Election updated successfully');
      } else {
        await createElection(formData);
        setSuccess('Election created successfully');
      }
      
      resetForm();
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this election?')) return;

    try {
      await deleteElection(id);
      setSuccess('Election deleted successfully');
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleClose = async (id) => {
    if (!confirm('Are you sure you want to close this election?')) return;

    try {
      await closeElection(id);
      setSuccess('Election closed successfully');
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.error || 'Close failed');
    }
  };

  const handleEdit = (election) => {
    setEditingElection(election);
    setFormData({
      title: election.title,
      description: election.description,
      startAt: new Date(election.startAt).toISOString().slice(0, 16),
      endAt: new Date(election.endAt).toISOString().slice(0, 16),
      candidates: election.candidates.map(c => ({ 
        name: c.name, 
        description: c.description 
      })),
      isPublicResults: election.isPublicResults
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startAt: '',
      endAt: '',
      candidates: [{ name: '', description: '' }, { name: '', description: '' }],
      isPublicResults: false
    });
    setEditingElection(null);
    setShowForm(false);
  };

  const addCandidate = () => {
    setFormData({
      ...formData,
      candidates: [...formData.candidates, { name: '', description: '' }]
    });
  };

  const removeCandidate = (index) => {
    if (formData.candidates.length <= 2) return;
    setFormData({
      ...formData,
      candidates: formData.candidates.filter((_, i) => i !== index)
    });
  };

  const updateCandidate = (index, field, value) => {
    const newCandidates = [...formData.candidates];
    newCandidates[index][field] = value;
    setFormData({ ...formData, candidates: newCandidates });
  };

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="admin-tabs">
        <button 
          className={activeTab === 'elections' ? 'active' : ''}
          onClick={() => setActiveTab('elections')}
        >
          Manage Elections
        </button>
        <button 
          className={activeTab === 'audit' ? 'active' : ''}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs
        </button>
      </div>

      {activeTab === 'elections' && (
        <>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : 'Create New Election'}
          </button>

          {showForm && (
            <div className="election-form">
              <h3>{editingElection ? 'Edit Election' : 'Create Election'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    minLength="3"
                  />
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    minLength="10"
                    rows="4"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={formData.startAt}
                      onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={formData.endAt}
                      onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isPublicResults}
                      onChange={(e) => setFormData({ ...formData, isPublicResults: e.target.checked })}
                    />
                    Make results public before election ends
                  </label>
                </div>

                <div className="candidates-section">
                  <h4>Candidates (minimum 2)</h4>
                  {formData.candidates.map((candidate, index) => (
                    <div key={index} className="candidate-input-group">
                      <input
                        type="text"
                        placeholder="Candidate name *"
                        value={candidate.name}
                        onChange={(e) => updateCandidate(index, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={candidate.description}
                        onChange={(e) => updateCandidate(index, 'description', e.target.value)}
                      />
                      {formData.candidates.length > 2 && (
                        <button 
                          type="button" 
                          onClick={() => removeCandidate(index)}
                          className="btn-remove"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addCandidate} className="btn btn-secondary">
                    + Add Candidate
                  </button>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    {editingElection ? 'Update Election' : 'Create Election'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="elections-list">
            <h3>Existing Elections</h3>
            {elections.map((election) => (
              <div key={election._id} className="admin-election-card">
                <div className="election-info">
                  <h4>{election.title}</h4>
                  <p>{election.description}</p>
                  <span className={`status-badge status-${election.status}`}>
                    {election.status}
                  </span>
                </div>
                <div className="election-actions">
                  {election.status === 'draft' && (
                    <>
                      {election.creator.toString() === user._id.toString() ? (
                        <>
                          <button onClick={() => handleEdit(election)} className="btn btn-sm">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(election._id)} className="btn btn-sm btn-danger">
                            Delete
                          </button>
                        </>
                      ) : null}
                    </>
                  )}
                  {election.status === 'active' && (
                    <button onClick={() => handleClose(election._id)} className="btn btn-sm">
                      Close Election
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'audit' && (
        <div className="audit-logs">
          <h3>Audit Logs</h3>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.action}</td>
                  <td>{log.actorId?.name || log.actorId?.email || 'Unknown'}</td>
                  <td>{JSON.stringify(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Admin;
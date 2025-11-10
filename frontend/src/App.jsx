import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Ballot from './pages/Ballot';
import Admin from './pages/Admin';
import Results from './pages/Results';
import { getMe } from './services/api';
import AddElection from './pages/AddElection'; // Ensure this line is present

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">🗳️ Online Voting System</Link>
          <div className="nav-links">
            {user ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                {user.role === 'admin' && <Link to="/admin">Admin</Link>}
                <span className="user-info">{user.name}</span>
                <button onClick={handleLogout} className="btn-logout">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/signup">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup setUser={setUser} />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/election/:id/vote" element={user ? <Ballot user={user} /> : <Navigate to="/login" />} />
          <Route path="/election/:id/results" element={<Results user={user} />} />
          <Route 
            path="/admin" 
            element={<Admin user={user} />} 
          />
          <Route path="/add-election" component={AddElection} />
        </Routes>
      </main>

      <footer className="footer">
        <p>&copy; 2025 Online Voting System. Secure. Transparent. Democratic.</p>
      </footer>
    </div>
  );
}

export default App;
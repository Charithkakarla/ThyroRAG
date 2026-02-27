import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import '../styles/Login.css';

/**
 * Demo Patient Credentials
 * These are sample accounts for demonstration
 */
const DEMO_PATIENTS = [
  {
    username: 'sarah.johnson',
    password: 'demo123',
    patientId: 'P001',
    fullName: 'Sarah Johnson',
    role: 'Patient'
  },
  {
    username: 'michael.chen',
    password: 'demo123',
    patientId: 'P002',
    fullName: 'Michael Chen',
    role: 'Patient'
  },
  {
    username: 'emily.rodriguez',
    password: 'demo123',
    patientId: 'P003',
    fullName: 'Emily Rodriguez',
    role: 'Patient'
  },
  {
    username: 'admin',
    password: 'admin123',
    patientId: 'ADMIN',
    fullName: 'System Administrator',
    role: 'Admin'
  }
];

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate API delay
    setTimeout(() => {
      const user = DEMO_PATIENTS.find(
        p => p.username === username && p.password === password
      );

      if (user) {
        // Store user info in localStorage
        localStorage.setItem('thyrorag_user', JSON.stringify({
          username: user.username,
          fullName: user.fullName,
          patientId: user.patientId,
          role: user.role
        }));
        onLogin(user);
      } else {
        setError('Invalid username or password');
      }
      setLoading(false);
    }, 800);
  };

  const handleDemoLogin = (demoUser) => {
    setUsername(demoUser.username);
    setPassword(demoUser.password);
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-circle">
              <User size={32} />
            </div>
          </div>
          <h1>Welcome to ThyroRAG</h1>
          <p>AI-Powered Thyroid Health Assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">
              <User size={16} />
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={16} />
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="demo-credentials">
          <h3>Demo Accounts</h3>
          <p>Click to auto-fill credentials:</p>
          <div className="demo-buttons">
            {DEMO_PATIENTS.map((user) => (
              <button
                key={user.username}
                className="demo-btn"
                onClick={() => handleDemoLogin(user)}
                type="button"
              >
                <User size={14} />
                <div className="demo-info">
                  <strong>{user.fullName}</strong>
                  <span>{user.username}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="login-footer">
          <p>
            <AlertCircle size={14} />
            This is a demonstration system. Use demo credentials above.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

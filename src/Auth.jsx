// src/Auth.jsx

import React, { useState } from 'react';

// This is a simple, presentational component for our login/signup form.
// It receives handler functions from App.jsx as props.
export default function Auth({ onSignUp, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      await onSignUp(email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>🚀 Rocket Productivity</h2>
        <p>Login or create an account to continue</p>
        <form>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-buttons">
    <button type="submit" onClick={handleLogin} className="btn btn-primary">Login</button>
    <button type="button" onClick={handleSignUp} className="btn btn-secondary">Sign Up</button>
  </div>
        </form>
      </div>
    </div>
  );
}
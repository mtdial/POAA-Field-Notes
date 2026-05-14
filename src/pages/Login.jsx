import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';

// Simple client-side throttle: 5 attempts per 15 minutes.
const ATTEMPT_KEY = 'poaa_login_attempts';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getAttempts() {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_KEY);
    if (!raw) return [];
    return JSON.parse(raw).filter((t) => Date.now() - t < WINDOW_MS);
  } catch {
    return [];
  }
}

function recordAttempt() {
  const attempts = getAttempts();
  attempts.push(Date.now());
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempts));
  return attempts.length;
}

export default function Login() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const attempts = getAttempts();
    if (attempts.length >= MAX_ATTEMPTS) {
      setError('Too many attempts. Try again in 15 minutes.');
      return;
    }

    setLoading(true);
    try {
      await signIn(username, password);
    } catch {
      recordAttempt();
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-garnet-tint flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-block w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: '#73000A' }}
          />
          <h1 className="text-xl font-bold text-dark-grey">POAA Field Notes</h1>
          <p className="text-sm text-mid-grey mt-1">University Advising Center</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-light-grey p-6 space-y-4"
        >
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-dark-grey mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
              placeholder="mdial"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-dark-grey mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
            />
          </div>

          {error && (
            <p className="text-sm text-garnet">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#73000A' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

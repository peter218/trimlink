import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Scissors, Copy, CheckCircle, BarChart2 } from 'lucide-react';
import { BACKEND_URL } from '../config';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError('');
    setResult(null);
    setCopied(false);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/shorten`, {
        originalUrl: url
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to shorten URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    const textToCopy = `${BACKEND_URL}/${result.shortCode}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed. Please copy the short link manually.');
    }
  };

  return (
    <div className="shortener-box">
      <div className="hero">
        <h1>Transform Long Links into <span style={{ color: '#818cf8' }}>Powerful</span> Assets</h1>
        <p>An enterprise-grade URL shortener designed for scale, speed, and real-time analytics.</p>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleSubmit} className="input-group">
          <input
            type="url"
            required
            className="input-field"
            placeholder="Paste your long URL here (e.g., https://example.com/very/long/path)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn" disabled={isLoading}>
            <Scissors size={20} />
            {isLoading ? 'Shortening...' : 'Shorten'}
          </button>
        </form>
        
        {error && <p style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}

        {result && (
          <div className="result-card">
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Your shortened URL</p>
              <a href={`${BACKEND_URL}/${result.shortCode}`} target="_blank" rel="noopener noreferrer" className="short-url">
                {BACKEND_URL.replace('http://', '')}/{result.shortCode}
              </a>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={handleCopy}>
                {copied ? <CheckCircle size={18} color="#10b981" /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <Link to={`/analytics/${result.shortCode}`} className="btn" style={{ background: 'var(--primary)' }}>
                <BarChart2 size={18} />
                Analytics
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

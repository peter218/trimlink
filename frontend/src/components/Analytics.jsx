import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Activity, MousePointerClick, Calendar, ExternalLink, Info } from 'lucide-react';
import { BACKEND_URL } from '../config';

function toDateKey(value) {
  if (!value) return '';

  const raw = String(value);
  const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey) {
  if (!dateKey) return '';

  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function DailyClicksTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const clicks = Number(payload[0]?.value ?? 0);

  return (
    <div className="chart-tooltip">
      <span>{label}</span>
      <strong>{clicks} {clicks === 1 ? 'click' : 'clicks'}</strong>
    </div>
  );
}

export default function Analytics() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/stats/${code}`);
        setData(response.data);
      } catch {
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [code]);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading analytics...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
        <Link to="/" className="btn"><ArrowLeft size={18} /> Back to Home</Link>
      </div>
    );
  }

  if (!data?.url) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>Analytics data is unavailable.</p>
        <Link to="/" className="btn"><ArrowLeft size={18} /> Back to Home</Link>
      </div>
    );
  }

  const stats = Array.isArray(data.stats) ? data.stats : [];

  const statsMap = {};
  stats.forEach((stat) => {
    const dateKey = toDateKey(stat.date);
    const clicks = Number(stat.clicks ?? stat.count ?? 0);

    if (dateKey) {
      statsMap[dateKey] = (statsMap[dateKey] || 0) + clicks;
    }
  });

  const chartData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dateKey = toDateKey(date);

    chartData.push({
      date: formatDateLabel(dateKey),
      clicks: statsMap[dateKey] || 0,
    });
  }

  const maxDailyClicks = Math.max(0, ...chartData.map((item) => item.clicks));
  const yAxisMax = Math.max(1, maxDailyClicks);

  return (
    <div>
      <div className="dashboard-header">
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h2>Link Analytics</h2>
        <p style={{ color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: '0.75rem' }}>
          Original URL: <a href={data.url.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>{data.url.originalUrl}</a>
        </p>
        {/* Short link entry + tip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
          <Info size={16} color="#818cf8" style={{ flexShrink: 0 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            通过短链访问后才会产生点击统计：
          </span>
          <a href={`${BACKEND_URL}/${code}`} target="_blank" rel="noopener noreferrer"
            style={{ color: '#818cf8', fontWeight: 600, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            {BACKEND_URL.replace('http://', '')}/{code} <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="stat-title">Total Clicks</span>
            <MousePointerClick size={24} color="#818cf8" />
          </div>
          <span className="stat-value">{data.url.clicks}</span>
        </div>

        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="stat-title">Status</span>
            <Activity size={24} color="#10b981" />
          </div>
          <span className="stat-value" style={{ color: '#10b981' }}>Active</span>
        </div>

        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="stat-title">Created On</span>
            <Calendar size={24} color="#f43f5e" />
          </div>
          <span className="stat-value" style={{ fontSize: '1.5rem', marginTop: 'auto' }}>
            {new Date(data.url.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Click Traffic over Time</h3>
        {data.url.clicks === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            暂无点击记录。点击上方的短链访问后，数据将实时更新到此处。
          </p>
        )}
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                domain={[0, yAxisMax]}
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip cursor={{ fill: 'rgba(129, 140, 248, 0.08)' }} content={<DailyClicksTooltip />} />
              <Bar dataKey="clicks" fill="#818cf8" radius={[8, 8, 0, 0]} maxBarSize={72} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

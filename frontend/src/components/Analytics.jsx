import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Activity, MousePointerClick, Calendar, ExternalLink, Info } from 'lucide-react';
import { BACKEND_URL } from '../config';

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
      } catch (err) {
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

  // Build chart data from daily logs
  const chartData = stats.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clicks: Number(s.count)
  }));

  // If no daily log yet but total clicks > 0, show today's real total
  if (chartData.length === 0) {
    chartData.push({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      clicks: data.url.clicks || 0
    });
  }

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
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '0.5rem', color: '#fff' }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

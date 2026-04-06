import React, { useEffect, useState } from 'react';
import { Activity, Thermometer, Flame, ShieldAlert, Zap } from 'lucide-react';

export default function Dashboard({ deviceId }) {
  const [data, setData] = useState({ temp: '--', avgTemp: '--', motion: false, status: 'UNKNOWN' });
  const [alerts, setAlerts] = useState([]);
  const [systemActive, setSystemActive] = useState(true);

  // Poll for live data (mocked simulation if backend isn't running)
  useEffect(() => { g: '20px', textAlign: 'center' }}> No alerts recorded.</p >
        ) : (
  alerts.map((al, idx) => (
    <div key={idx} className={`history-item ${al.type}`}>
      <div>
        <strong style={{ display: 'block', marginBottom: '4px' }}>{al.message}</strong>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {new Date(al.timestamp).toLocaleString()}
        </span>
      </div>
      <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
        SMS Sent to {al.phoneNumber}
      </span>
    </div>
  ))
)}
      </div >
    </div >
  );
}

if (!systemActive) return;

const fetchData = async () => {
  try {
    const res = await fetch(`http://localhost:5000/api/status?deviceId=${deviceId}`);
    if (res.ok) {
      const log = await res.json();
      setData({
        temp: log.temperature?.toFixed(1) || '--',
        avgTemp: log.avgTemp?.toFixed(1) || '--',
        motion: log.motion,
        status: log.status || 'SAFE'
      });
    }

    const alertRes = await fetch(`http://localhost:5000/api/alerts?deviceId=${deviceId}`);
    if (alertRes.ok) {
      const al = await alertRes.json();
      setAlerts(al);
    }
  } catch (err) {
    // Mock fallback for UI rendering
    const mockTemp = 24 + Math.random() * 5;
    setData({
      temp: mockTemp.toFixed(1),
      avgTemp: 25.0,
      motion: Math.random() > 0.8,
      status: Math.random() > 0.9 ? 'AI WARNING' : 'SAFE'
    });
  }
};

fetchData();
const interval = setInterval(fetchData, 2000);
return () => clearInterval(interval);
  }, [deviceId, systemActive]);

return (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <div className={`status-badge status-${data.status.split(' ')[0]}`}>
        {systemActive ? `SYSTEM: ${data.status}` : 'SYSTEM OFFLINE'}
      </div>
      <button
        className={`btn ${systemActive ? '' : 'primary'}`}
        onClick={() => setSystemActive(!systemActive)}>
        {systemActive ? 'Disable Security' : 'Enable Security'}
      </button>
    </div>

    <div className="grid-cards">
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="metric-label">Zone Temperature</span>
          <Thermometer color="var(--accent)" />
        </div>
        <div className="metric-value">{data.temp}°C</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          AI Baseline: {data.avgTemp === '--' ? '--' : `${parseFloat(data.avgTemp).toFixed(1)}°C`}
        </p>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="metric-label">Motion Sensor</span>
          <Activity color={data.motion ? "var(--status-motion)" : "var(--text-secondary)"} />
        </div>
        <div className="metric-value">{data.motion ? 'DETECTED' : 'CLEAR'}</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>PIR Sensor Array</p>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="metric-label">System Integrity</span>
          <ShieldAlert color={data.status.includes('SAFE') ? "var(--status-safe)" : "var(--status-fire)"} />
        </div>
        <div className="metric-value" style={{ fontSize: '32px', marginTop: '20px' }}>
          {data.status === 'SAFE' ? '100%' : 'WARN'}
        </div>
      </div>
    </div>

    <h2>Alert History log</h2>
    <div className="glass-panel history-list">
      {alerts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', paddin
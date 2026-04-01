import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Activity, Beaker, FileText, Sparkles, TrendingUp } from 'lucide-react';
import {
  REFERENCE_RANGES,
  buildAnalyticsChartData,
  buildHormoneInsight,
  getHormoneStatus,
} from '../utils/patientRecords';
import '../styles/Analytics.css';

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="tooltip-row">
            <span className="tooltip-dot" style={{ backgroundColor: entry.color }}></span>
            <span className="tooltip-name">{entry.name}:</span>
            <span className="tooltip-value" style={{ color: entry.color }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function Analytics({ user, records }) {
  const patientName = user?.fullName ?? 'Patient';
  const hasNumericValue = (value) => value != null && !Number.isNaN(Number(value));
  const hasAnyLabValues = (record) =>
    [record?.tsh, record?.freeT3, record?.freeT4].some((value) => hasNumericValue(value));

  const chartData = buildAnalyticsChartData(records);
  const chartDataWithTimestamp = chartData
    .map((point) => ({
      ...point,
      timestamp: new Date(point.fullDate).getTime(),
    }))
    .filter((point) => !Number.isNaN(point.timestamp));

  const monthlyChartData = useMemo(() => {
    if (!chartDataWithTimestamp.length) return [];
    const hasLabValues = (point) =>
      [point.TSH, point['Free T3'], point['Free T4']].some((value) => hasNumericValue(value));

    const monthlyBuckets = new Map();
    chartDataWithTimestamp.forEach((point) => {
      const pointDate = new Date(point.timestamp);
      const monthKey = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyBuckets.get(monthKey);

      if (!hasLabValues(point)) return;

      if (!existing || point.timestamp > existing.timestamp) {
        monthlyBuckets.set(monthKey, point);
      }
    });

    return Array.from(monthlyBuckets.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((point) => ({
        ...point,
        monthLabel: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      }));
  }, [chartDataWithTimestamp]);

  const latestRecord = [...records]
    .filter((record) => hasAnyLabValues(record))
    .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())[0] || null;

  const getLatestStr = (field) => {
    const rec = [...records].filter(r => hasNumericValue(r?.[field]))
      .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())[0];
    return rec ? Number(rec[field]) : null;
  };

  const latestTshValue = getLatestStr('tsh');
  const latestT3Value = getLatestStr('freeT3');
  const latestT4Value = getLatestStr('freeT4');

  const latestComparison = [
    { name: 'TSH', value: latestTshValue || 0, rawValue: latestTshValue, fill: '#8B9E57' },
    { name: 'Free T3', value: latestT3Value || 0, rawValue: latestT3Value, fill: '#3B82F6' },
    { name: 'Free T4', value: latestT4Value || 0, rawValue: latestT4Value, fill: '#F59E0B' },
  ];

  const latestTshStatus = latestRecord
    ? getHormoneStatus(latestRecord.tsh, REFERENCE_RANGES.tsh.low, REFERENCE_RANGES.tsh.high)
    : 'Unknown';

  const totalRecordsCount = records.length;
  const abnormalCount = records.filter(r => r.prediction && r.prediction !== '0' && r.prediction.toLowerCase() !== 'negative').length;

  return (
    <div className="dash-analytics-wrapper">
      
      {/* Top Welcome / Header */}
      <header className="dash-header glass-card">
        <div className="dh-left">
          <h2>Health Analytics for <span>{patientName}</span></h2>
          <p>Real-time machine learning insights & hormone trends</p>
        </div>
        <div className="dh-right">
          <div className={`status-pill pill-${latestTshStatus.toLowerCase()}`}>
            <Activity size={18} />
            TSH Status: <strong>{latestTshStatus}</strong>
          </div>
        </div>
      </header>

      {/* Hero KPIS */}
      <section className="kpi-grid">
        <div className="kpi-card glass-card">
          <div className="kpi-icon-wrap bg-olive">
            <FileText size={24} />
          </div>
          <div className="kpi-data">
            <p>Total Records</p>
            <h3>{totalRecordsCount}</h3>
          </div>
        </div>
        <div className="kpi-card glass-card">
          <div className="kpi-icon-wrap bg-blue">
            <Beaker size={24} />
          </div>
          <div className="kpi-data">
            <p>Latest TSH</p>
            <h3>{latestTshValue !== null ? `${latestTshValue} mIU/L` : 'N/A'}</h3>
          </div>
        </div>
        <div className="kpi-card glass-card">
          <div className="kpi-icon-wrap bg-orange">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-data">
            <p>Abnormal Events</p>
            <h3>{abnormalCount}</h3>
          </div>
        </div>
      </section>

      {/* Charts Grid */}
      <section className="charts-grid">
        
        {/* Main Area Chart */}
        <div className="chart-container large-span glass-card">
          <div className="chart-header">
            <h3><TrendingUp size={18} /> Hormone Trajectory</h3>
            <p>Longitudinal tracking of key thyroid markers</p>
          </div>
          <div className="chart-body">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTSH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B9E57" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8B9E57" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorT3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="monthLabel" stroke="#8B9E57" tick={{ fill: '#666' }} />
                  <YAxis stroke="#8B9E57" tick={{ fill: '#666' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="TSH" stroke="#8B9E57" strokeWidth={3} fillOpacity={1} fill="url(#colorTSH)" />
                  <Area type="monotone" dataKey="Free T3" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorT3)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Insufficient data to visualize trends.</div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="chart-container glass-card">
          <div className="chart-header">
            <h3><Activity size={18} /> Latest Reading</h3>
            <p>Most recent lab values comparison</p>
          </div>
          <div className="chart-body">
            {latestComparison.some(c => c.value > 0) ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={latestComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" stroke="#8B9E57" tick={{ fill: '#666' }} />
                  <YAxis stroke="#8B9E57" tick={{ fill: '#666' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {latestComparison.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No recent readings uploaded.</div>
            )}
          </div>
        </div>

      </section>

      {/* Insights */}
      <section className="insights-container glass-card">
        <div className="chart-header">
          <h3><Sparkles size={18} className="glow-icon" /> AI Medical Insight</h3>
          <p>Automated analysis generated from your chronological data</p>
        </div>
        <div className="insight-content">
          <p>{buildHormoneInsight(records)}</p>
        </div>
      </section>

    </div>
  );
}

export default Analytics;
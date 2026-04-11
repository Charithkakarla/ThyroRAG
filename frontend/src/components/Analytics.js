import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Activity, BarChart3, Sparkles } from 'lucide-react';
import {
  REFERENCE_RANGES,
  buildAnalyticsChartData,
  buildHormoneInsight,
  getHormoneStatus,
} from '../utils/patientRecords';
import '../styles/Analytics.css';

function Analytics({ user, records }) {
  const patientName = user?.fullName ?? 'the user';
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

  const monthlyChartData = React.useMemo(() => {
    if (!chartDataWithTimestamp.length) {
      return [];
    }

    const hasLabValues = (point) =>
      [point.TSH, point['Free T3'], point['Free T4']].some((value) => hasNumericValue(value));

    const monthlyBuckets = new Map();
    chartDataWithTimestamp.forEach((point) => {
      const pointDate = new Date(point.timestamp);
      const monthKey = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyBuckets.get(monthKey);

      if (!hasLabValues(point)) {
        return;
      }

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

  const formatTooltipLabel = (_, payload) => {
    const point = payload?.[0]?.payload;
    return point ? `${point.monthLabel} (${point.date})` : '';
  };

  const latestRecord = [...records]
    .filter((record) => hasAnyLabValues(record))
    .sort((a, b) => {
      const aTime = new Date(a.created_at || a.date).getTime();
      const bTime = new Date(b.created_at || b.date).getTime();
      return bTime - aTime;
    })[0] || null;

  const latestTshRecord = [...records]
    .filter((record) => hasNumericValue(record?.tsh))
    .sort((a, b) => {
      const aTime = new Date(a.created_at || a.date).getTime();
      const bTime = new Date(b.created_at || b.date).getTime();
      return bTime - aTime;
    })[0] || null;

  const latestFreeT3Record = [...records]
    .filter((record) => hasNumericValue(record?.freeT3))
    .sort((a, b) => {
      const aTime = new Date(a.created_at || a.date).getTime();
      const bTime = new Date(b.created_at || b.date).getTime();
      return bTime - aTime;
    })[0] || null;

  const latestFreeT4Record = [...records]
    .filter((record) => hasNumericValue(record?.freeT4))
    .sort((a, b) => {
      const aTime = new Date(a.created_at || a.date).getTime();
      const bTime = new Date(b.created_at || b.date).getTime();
      return bTime - aTime;
    })[0] || null;

  const latestComparison = [
    {
      name: 'TSH',
      value: hasNumericValue(latestTshRecord?.tsh) ? Number(latestTshRecord.tsh) : 0,
      rawValue: latestTshRecord?.tsh,
      fill: '#7D9645',
    },
    {
      name: 'Free T3',
      value: hasNumericValue(latestFreeT3Record?.freeT3) ? Number(latestFreeT3Record.freeT3) : 0,
      rawValue: latestFreeT3Record?.freeT3,
      fill: '#3B82F6',
    },
    {
      name: 'Free T4',
      value: hasNumericValue(latestFreeT4Record?.freeT4) ? Number(latestFreeT4Record.freeT4) : 0,
      rawValue: latestFreeT4Record?.freeT4,
      fill: '#F59E0B',
    },
  ];

  const latestTshStatus = latestRecord
    ? getHormoneStatus(latestRecord.tsh, REFERENCE_RANGES.tsh.low, REFERENCE_RANGES.tsh.high)
    : 'Unknown';

  return (
    <div className="analytics-page">
      <div className="analytics-hero">
        <div>
          <span className="analytics-kicker">Patient Name</span>
          <h2>{patientName}</h2>
          <p>Hormone analytics updates automatically when new lab reports are uploaded.</p>
        </div>
        <div className={`status-chip status-chip-${latestTshStatus.toLowerCase()}`}>
          <Activity size={18} /> Latest TSH: {latestTshStatus}
        </div>
      </div>

      <div className="analytics-card">
        <div className="analytics-card-head">
          <h3><Activity size={18} /> Hormone Trend Line Chart</h3>
          <span>TSH, Free T3 and Free T4 over time</span>
        </div>
        <div className="analytics-chart-shell">
          {monthlyChartData.length ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D7DAC8" />
                <XAxis dataKey="monthLabel" stroke="#555841" />
                <YAxis stroke="#555841" />
                <Tooltip labelFormatter={formatTooltipLabel} />
                <Legend />
                <Line type="monotone" dataKey="TSH" stroke="#7D9645" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Free T3" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Free T4" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-empty">No records available for charting yet.</div>
          )}
        </div>
      </div>

      <div className="analytics-card">
        <div className="analytics-card-head">
          <h3><BarChart3 size={18} /> Latest Report Comparison</h3>
          <span>Compare the most recent hormone values</span>
        </div>
        <div className="analytics-chart-shell">
          {latestComparison.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={latestComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D7DAC8" />
                <XAxis dataKey="name" stroke="#555841" />
                <YAxis stroke="#555841" />
                <Tooltip formatter={(_, __, item) => {
                  const rawValue = item?.payload?.rawValue;
                  return rawValue == null || rawValue === '' ? 'Not available' : rawValue;
                }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {latestComparison.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-empty">Upload a report to generate the latest comparison chart.</div>
          )}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card compact-card">
          <div className="analytics-card-head">
            <h3><Activity size={18} /> Hormone Status Indicator</h3>
            <span>Latest TSH range check</span>
          </div>
          {latestRecord ? (
            <div className="indicator-block">
              <strong>{latestTshStatus}</strong>
              <p>
                Latest TSH is {latestRecord.tsh} mIU/L. Normal range: {REFERENCE_RANGES.tsh.low} to {REFERENCE_RANGES.tsh.high}.
              </p>
            </div>
          ) : (
            <div className="analytics-empty">No latest report is available yet.</div>
          )}
        </div>

        <div className="analytics-card compact-card">
          <div className="analytics-card-head">
            <h3><Sparkles size={18} /> AI Insight</h3>
            <span>Trend summary generated from patient history</span>
          </div>
          <p className="insight-copy">{buildHormoneInsight(records)}</p>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
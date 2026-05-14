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
  ReferenceLine,
} from 'recharts';
import { Activity, BarChart3, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  REFERENCE_RANGES,
  buildAnalyticsChartData,
  buildHormoneInsight,
  getHormoneStatus,
} from '../utils/patientRecords';
import '../styles/Analytics.css';

/* ── Custom Tooltip ───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#1a1f14', border: '1px solid #7D9645', borderRadius: 10,
      padding: '10px 16px', fontSize: 13, color: '#e8ecd8', minWidth: 180,
    }}>
      <p style={{ color: '#7D9645', fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        p.value != null && (
          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: p.color }}>{p.dataKey}</span>
            <span style={{ fontWeight: 600 }}>{Number(p.value).toFixed(2)}</span>
          </div>
        )
      ))}
    </div>
  );
};

/* ── Custom Dot — colours by normal/abnormal ──────────────────── */
const TshDot = (props) => {
  const { cx, cy, payload } = props;
  const tsh = payload?.TSH;
  if (tsh == null) return null;
  const low = REFERENCE_RANGES.tsh.low;
  const high = REFERENCE_RANGES.tsh.high;
  const color = tsh < low || tsh > high ? '#ef4444' : '#7D9645';
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />;
};

function Analytics({ user, records }) {
  const patientName = user?.fullName ?? 'the user';
  const hasNumericValue = (value) => value != null && !Number.isNaN(Number(value));
  const hasAnyLabValues = (record) =>
    [record?.tsh, record?.freeT3, record?.freeT4].some((value) => hasNumericValue(value));

  /* ── Build chart data — ONE point per record, sorted oldest→newest ── */
  const allChartData = React.useMemo(() => {
    const raw = buildAnalyticsChartData(records);          // already sorted asc
    return raw
      .filter((p) => !Number.isNaN(new Date(p.fullDate).getTime()))
      .map((p, i) => ({
        ...p,
        // Label: short date for X-axis
        label: new Date(p.fullDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        index: i,
      }));
  }, [records]);

  /* ── Dynamic Y-axis domain with 20 % padding ─────────────────── */
  const yDomain = React.useMemo(() => {
    const vals = allChartData.flatMap((p) =>
      [p.TSH, p['Free T3'], p['Free T4']].filter((v) => v != null && !Number.isNaN(Number(v))).map(Number)
    );
    if (!vals.length) return [0, 10];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.2 || 1;
    return [Math.max(0, +(min - pad).toFixed(2)), +(max + pad).toFixed(2)];
  }, [allChartData]);

  /* ── Trend arrow helper ──────────────────────────────────────── */
  const tshValues = allChartData.map((p) => p.TSH).filter((v) => v != null);
  const tshTrend = tshValues.length >= 2
    ? tshValues[tshValues.length - 1] - tshValues[tshValues.length - 2]
    : 0;

  /* ── Latest record for bar chart + status chip ───────────────── */
  const latestRecord = [...records]
    .filter(hasAnyLabValues)
    .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))[0] || null;

  const latestComparison = [
    { name: 'TSH',     value: hasNumericValue(latestRecord?.tsh)    ? +latestRecord.tsh    : 0, fill: '#7D9645' },
    { name: 'Free T3', value: hasNumericValue(latestRecord?.freeT3) ? +latestRecord.freeT3 : 0, fill: '#3B82F6' },
    { name: 'Free T4', value: hasNumericValue(latestRecord?.freeT4) ? +latestRecord.freeT4 : 0, fill: '#F59E0B' },
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

      {/* ── Trend Line Chart ── */}
      <div className="analytics-card">
        <div className="analytics-card-head">
          <h3>
            {tshTrend > 0 ? <TrendingUp size={18} color="#ef4444" /> : tshTrend < 0 ? <TrendingDown size={18} color="#7D9645" /> : <Minus size={18} />}
            &nbsp;Hormone Trend Over Time
          </h3>
          <span>
            Every recorded test — TSH, Free T3, Free T4&nbsp;
            {tshValues.length >= 2 && Math.abs(tshTrend) > 0.01 && (
              <strong style={{ color: tshTrend > 0 ? '#ef4444' : '#7D9645' }}>
                (TSH {tshTrend > 0 ? '▲' : '▼'} {Math.abs(tshTrend).toFixed(2)} mIU/L since last test)
              </strong>
            )}
            {tshValues.length >= 2 && Math.abs(tshTrend) <= 0.01 && (
              <strong style={{ color: '#8a9a6a' }}>(TSH stable since last test)</strong>
            )}
          </span>
        </div>
        <div className="analytics-chart-shell">
          {allChartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={allChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3020" />

                <XAxis
                  dataKey="label"
                  stroke="#8a9a6a"
                  tick={{ fontSize: 11, fill: '#8a9a6a' }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                  height={55}
                />
                <YAxis
                  domain={yDomain}
                  stroke="#8a9a6a"
                  tick={{ fontSize: 11, fill: '#8a9a6a' }}
                  tickFormatter={(v) => Number(v).toFixed(1)}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 10, color: '#8a9a6a' }} />

                {/* Normal TSH range band */}
                <ReferenceLine y={REFERENCE_RANGES.tsh.low}  stroke="#7D9645" strokeDasharray="6 3" strokeOpacity={0.5}
                  label={{ value: `TSH low (${REFERENCE_RANGES.tsh.low})`, position: 'insideTopRight', fill: '#7D9645', fontSize: 10 }} />
                <ReferenceLine y={REFERENCE_RANGES.tsh.high} stroke="#ef4444" strokeDasharray="6 3" strokeOpacity={0.5}
                  label={{ value: `TSH high (${REFERENCE_RANGES.tsh.high})`, position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />

                <Line type="monotone" dataKey="TSH"     stroke="#7D9645" strokeWidth={2.5} dot={<TshDot />} activeDot={{ r: 7 }} connectNulls />
                <Line type="monotone" dataKey="Free T3" stroke="#3B82F6" strokeWidth={2}   dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 7 }} connectNulls />
                <Line type="monotone" dataKey="Free T4" stroke="#F59E0B" strokeWidth={2}   dot={{ r: 4, fill: '#F59E0B' }} activeDot={{ r: 7 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : allChartData.length === 1 ? (
            <div className="analytics-empty">Only one record found — upload more reports to see the trend.</div>
          ) : (
            <div className="analytics-empty">No records available for charting yet.</div>
          )}
        </div>
      </div>

      {/* ── Latest Report Bar Chart ── */}
      <div className="analytics-card">
        <div className="analytics-card-head">
          <h3><BarChart3 size={18} /> Latest Report Comparison</h3>
          <span>Compare the most recent hormone values</span>
        </div>
        <div className="analytics-chart-shell">
          {latestRecord ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={latestComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3020" />
                <XAxis dataKey="name" stroke="#8a9a6a" />
                <YAxis stroke="#8a9a6a" />
                <Tooltip formatter={(v) => Number(v).toFixed(2)} />
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

      {/* ── Status + AI Insight ── */}
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
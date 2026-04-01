import React from 'react';
import { Activity, FileUp, History, BarChart3 } from 'lucide-react';
import { REFERENCE_RANGES, buildHormoneInsight, getHormoneStatus } from '../utils/patientRecords';
import '../styles/DashboardOverview.css';

function DashboardOverview({ patientName, records, setActiveTab }) {
  const latestRecord = records[records.length - 1] || null;
  const latestStatus = latestRecord
    ? getHormoneStatus(latestRecord.tsh, REFERENCE_RANGES.tsh.low, REFERENCE_RANGES.tsh.high)
    : 'Unknown';

  return (
    <div className="dashboard-overview">
      <div className="dashboard-hero-card">
        <div>
          <span className="dashboard-kicker">Dashboard</span>
          <h2>{patientName}</h2>
          <p>Review thyroid history, upload new lab reports, and monitor hormone trends in one place.</p>
        </div>
        <div className={`dashboard-status dashboard-status-${latestStatus.toLowerCase()}`}>
          <Activity size={18} /> Latest TSH Status: {latestStatus}
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">History Records</span>
          <strong>{records.length}</strong>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Latest TSH</span>
          <strong>{latestRecord?.tsh ?? '—'}</strong>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Latest Free T3</span>
          <strong>{latestRecord?.freeT3 ?? '—'}</strong>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Latest Free T4</span>
          <strong>{latestRecord?.freeT4 ?? '—'}</strong>
        </div>
      </div>

      <div className="dashboard-insight-card">
        <h3>Clinical Insight</h3>
        <p>{buildHormoneInsight(records)}</p>
      </div>

      <div className="dashboard-actions-grid">
        <button className="dashboard-action-card" onClick={() => setActiveTab('upload')}>
          <FileUp size={22} />
          <div>
            <strong>Upload Report</strong>
            <span>Add a new JPEG lab report and update history automatically.</span>
          </div>
        </button>
        <button className="dashboard-action-card" onClick={() => setActiveTab('history')}>
          <History size={22} />
          <div>
            <strong>Patient History</strong>
            <span>Review all static and uploaded thyroid hormone records.</span>
          </div>
        </button>
        <button className="dashboard-action-card" onClick={() => setActiveTab('analytics')}>
          <BarChart3 size={22} />
          <div>
            <strong>Analytics</strong>
            <span>Visualize trends, compare the latest report, and inspect TSH status.</span>
          </div>
        </button>
      </div>
    </div>
  );
}

export default DashboardOverview;
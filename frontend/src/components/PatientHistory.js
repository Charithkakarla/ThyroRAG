import React, { useMemo, useState } from 'react';
import { Calendar, Activity, Search, X, Download, FileText } from 'lucide-react';
import '../styles/PatientHistory.css';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Records' },
  { value: 'any-abnormal', label: 'Any Abnormal' },
  { value: 'all-normal', label: 'All Normal' },
  { value: 'tsh-high', label: 'TSH High' },
  { value: 'tsh-normal', label: 'TSH Normal' },
  { value: 'free-t3-low', label: 'Free T3 Low' },
  { value: 'free-t3-normal', label: 'Free T3 Normal' },
  { value: 'free-t4-normal', label: 'Free T4 Normal' },
];

function matchesFilter(record, filterValue) {
  if (filterValue === 'all') return true;
  if (filterValue === 'any-abnormal') {
    return [record.statuses?.tsh, record.statuses?.freeT3, record.statuses?.freeT4].some(
      (status) => status && status !== 'Normal'
    );
  }
  if (filterValue === 'all-normal') {
    return [record.statuses?.tsh, record.statuses?.freeT3, record.statuses?.freeT4].every(
      (status) => status === 'Normal'
    );
  }
  if (filterValue === 'tsh-high') return record.statuses?.tsh === 'High';
  if (filterValue === 'tsh-normal') return record.statuses?.tsh === 'Normal';
  if (filterValue === 'free-t3-low') return record.statuses?.freeT3 === 'Low';
  if (filterValue === 'free-t3-normal') return record.statuses?.freeT3 === 'Normal';
  if (filterValue === 'free-t4-normal') return record.statuses?.freeT4 === 'Normal';
  return true;
}

function formatValue(value) {
  return value == null ? '—' : Number(value).toFixed(1);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatConfidence(value) {
  if (value == null || value === '') return 'N/A';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';

  // Stored model confidence is typically 0..1; support legacy 0..100 as well.
  if (numeric > 1) return `${numeric.toFixed(1)}%`;
  return `${(numeric * 100).toFixed(1)}%`;
}

// Detail Modal Component
function RecordDetailModal({ record, onClose }) {
  if (!record) return null;

  const uploadedFile = record.uploadedFile || (record.file_url
    ? {
        name: record.file_name || 'Uploaded report',
        type: record.file_type || 'File',
        size: record.file_size || 0,
        preview: null,
        url: record.file_url,
      }
    : null);

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="detail-modal-header">
          <h3>Thyroid Lab Record Details</h3>
          <button className="detail-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="detail-modal-body">
          {/* Record Details Section */}
          <div className="detail-section">
            <h4>Lab Results</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Date</label>
                <span>{formatDate(record.date)}</span>
              </div>
              <div className="detail-item">
                <label>TSH</label>
                <span className={`detail-value detail-value-${record.statuses?.tsh?.toLowerCase()}`}>
                  {formatValue(record.tsh)} <span className="detail-status">({record.statuses?.tsh})</span>
                </span>
              </div>
              <div className="detail-item">
                <label>Free T3</label>
                <span className={`detail-value detail-value-${record.statuses?.freeT3?.toLowerCase()}`}>
                  {formatValue(record.freeT3)} <span className="detail-status">({record.statuses?.freeT3})</span>
                </span>
              </div>
              <div className="detail-item">
                <label>Free T4</label>
                <span className={`detail-value detail-value-${record.statuses?.freeT4?.toLowerCase()}`}>
                  {formatValue(record.freeT4)} <span className="detail-status">({record.statuses?.freeT4})</span>
                </span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>Prediction Result</h4>
            <div className="result-panel">
              <div className="result-item">
                <label>Result</label>
                <span className="result-label">{record.prediction || 'Not available'}</span>
              </div>
              <div className="result-item">
                <label>Confidence</label>
                <span className="result-confidence">{formatConfidence(record.confidence)}</span>
              </div>
            </div>
          </div>

          {/* Uploaded File Section */}
          {uploadedFile ? (
            <div className="detail-section">
              <h4>Uploaded File</h4>
              <div className="file-info">
                <div className="file-header">
                  <FileText size={20} className="file-icon" />
                  <div className="file-meta">
                    <p className="file-name">{uploadedFile.name}</p>
                    <p className="file-size">{formatFileSize(uploadedFile.size)}</p>
                  </div>
                </div>

                {/* Image Preview */}
                {uploadedFile.preview && uploadedFile.type.startsWith('image/') && (
                  <div className="file-preview">
                    <img src={uploadedFile.preview} alt="Lab report preview" />
                  </div>
                )}

                {uploadedFile.url && (
                  <a href={uploadedFile.url} target="_blank" rel="noreferrer" className="file-link">
                    <Download size={16} /> View / Download File
                  </a>
                )}

                {/* PDF or Other File Type */}
                {!uploadedFile.preview && !uploadedFile.url && (
                  <div className="file-preview-placeholder">
                    <FileText size={48} />
                    <p>{uploadedFile.type || 'File'}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="detail-section">
              <p className="detail-note">No file uploaded with this record.</p>
            </div>
          )}

          <div className="detail-modal-footer">
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Record Card Component
function RecordCard({ record, onCardClick }) {
  const overallStatus = [record.statuses?.tsh, record.statuses?.freeT3, record.statuses?.freeT4].some(
    (status) => status && status !== 'Normal'
  )
    ? 'abnormal'
    : 'normal';

  return (
    <div className={`record-card status-border-${overallStatus}`} onClick={() => onCardClick(record)}>
      <div className="card-header">
        <div className="card-date">
          <Calendar size={16} />
          <span>{formatDate(record.date)}</span>
        </div>
        <div className={`card-status-badge status-${overallStatus}`}>
          <Activity size={14} />
          <span>{overallStatus === 'abnormal' ? 'Abnormal' : 'Normal'}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="value-item">
          <span className="value-label">TSH</span>
          <span className={`value-data status-text-${record.statuses?.tsh?.toLowerCase()}`}>
            {formatValue(record.tsh)}
          </span>
        </div>
        <div className="value-item">
          <span className="value-label">Free T3</span>
          <span className={`value-data status-text-${record.statuses?.freeT3?.toLowerCase()}`}>
            {formatValue(record.freeT3)}
          </span>
        </div>
        <div className="value-item">
          <span className="value-label">Free T4</span>
          <span className={`value-data status-text-${record.statuses?.freeT4?.toLowerCase()}`}>
            {formatValue(record.freeT4)}
          </span>
        </div>
        <div className="result-row">
          <span className="result-pill">{record.prediction || 'Result Pending'}</span>
          {record.uploadedFile && <span className="file-pill">File Uploaded</span>}
        </div>
      </div>
    </div>
  );
}

function PatientHistory({ records, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records
      .filter((r) => matchesFilter(r, filter))
      .filter((r) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const date = formatDate(r.date).toLowerCase();
        const status = (r.statuses?.tsh || '').toLowerCase();
        return date.includes(searchLower) || status.includes(searchLower);
      });
  }, [records, searchTerm, filter]);

  const handleClearSearch = () => setSearchTerm('');
  const handleRecordClick = (record) => setSelectedRecord(record);
  const handleCloseModal = () => setSelectedRecord(null);

  return (
    <div className="patient-history-container">
      <div className="controls-container">
        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search by date or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={handleClearSearch}>
              <X size={18} />
            </button>
          )}
        </div>
        <div className="filter-wrapper">
          <label htmlFor="filter-select" className="filter-label">Filter</label>
          <select
            id="filter-select"
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <main className="records-grid-container">
        {filteredRecords.length > 0 ? (
          <div className="records-grid">
            {filteredRecords.map((record) => (
              <RecordCard key={record.id} record={record} onCardClick={handleRecordClick} />
            ))}
          </div>
        ) : (
          <div className="no-records-found">
            <div className="no-records-icon-wrapper">
              <FileText size={48} />
            </div>
            <h3 className="no-records-title">No Thyroid Records Found</h3>
            <p className="no-records-subtitle">
              Records for {user?.fullName ?? 'this user'} will appear here after a diagnosis.
            </p>
          </div>
        )}
      </main>

      {selectedRecord && <RecordDetailModal record={selectedRecord} onClose={handleCloseModal} />}
    </div>
  );
}

export default PatientHistory;

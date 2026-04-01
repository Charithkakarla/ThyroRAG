import React, { useMemo, useState } from 'react';
import { Calendar, Activity, Search, X, Download, FileText, ChevronRight, Eye, ExternalLink } from 'lucide-react';
import { generatePDF } from '../utils/generatePDF';
import '../styles/PatientHistory.css';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Records' },
  { value: 'abnormal', label: 'Abnormal Outcomes' },
  { value: 'normal', label: 'Normal Outcomes' },
];

function matchesFilter(record, filterValue) {
  if (filterValue === 'all') return true;
  const isAbnormal = record.prediction && record.prediction.toLowerCase() !== 'negative' && record.prediction !== '0';
  if (filterValue === 'abnormal') return isAbnormal;
  if (filterValue === 'normal') return !isAbnormal;
  return true;
}

function formatValue(value) {
  return value == null ? '—' : Number(value).toFixed(1);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Enhanced Detail Modal Component
function RecordDetailModal({ record, onClose }) {
  const [pdfGenerating, setPdfGenerating] = useState(false);
  if (!record) return null;

  const predictionLabel = record.prediction === '0' ? 'Negative' :
                          record.prediction === '1' ? 'Hypothyroid' :
                          record.prediction === '2' ? 'Hyperthyroid' :
                          (record.prediction || 'Unknown');
  
  // Use the stored Source field from the DB if available, fallback to file detection
  const recordSource = record.rawRecord?.source === 'report_upload' ? 'Extracted from Medical Report' : 'Manual Data Entry';
  const hasFile = !!record.reportFileUrl;

  const handleDownloadPDF = async () => {
    setPdfGenerating(true);
    try {
      const raw = record.rawRecord;
      const formData = {
        fullName: record.patientName,
        age: raw.age,
        sex: raw.sex,
        weight: raw.weight,
        TSH: raw.tsh,
        T3: raw.t3,
        TT4: raw.tt4,
        T4U: raw.t4u,
        FTI: raw.fti,
        on_thyroxine: raw.on_thyroxine ? 'Yes' : 'No',
        thyroid_surgery: raw.thyroid_surgery ? 'Yes' : 'No',
        pregnant: raw.pregnant ? 'Yes' : 'No',
        sick: raw.sick ? 'Yes' : 'No',
        goitre: raw.goitre ? 'Yes' : 'No',
        tumor: raw.tumor ? 'Yes' : 'No',
        lithium: raw.lithium ? 'Yes' : 'No',
        query_hypothyroid: raw.query_hypothyroid ? 'Yes' : 'No',
        query_hyperthyroid: raw.query_hyperthyroid ? 'Yes' : 'No',
      };
      
      const result = {
        result_label: predictionLabel,
        confidence: record.confidence,
        probabilities: record.probabilities,
        clinical_interpretation: record.interpretation,
        key_reasons: record.keyReasons
      };
      
      await generatePDF(result, formData);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="glass-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="modal-header-hero">
          <div className="modal-date-chip">{formatDate(record.created_at)}</div>
          <h2>Medical Assessment Summary</h2>
          <div className={`status-glow-badge outcome-${predictionLabel.toLowerCase()}`}>
            {predictionLabel}
          </div>
          {record.confidence && (
            <div className="modal-confidence">AI Confidence Level: {(record.confidence * 100).toFixed(1)}%</div>
          )}
        </div>

        <div className="modal-scroll-area">
          <div className="modal-grid-body">
            {/* Left Column: Metrics & Analysis */}
            <div className="modal-main-col">

              <div className="glass-section metrics-container-section">
                <h3><Activity size={16} /> Hormone Analysis</h3>
                <div className="lab-metrics-grid">
                  <div className="metric-box highlight">
                    <span className="metric-label">TSH</span>
                    <span className="metric-value">{formatValue(record.tsh)} <small>mIU/L</small></span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Free T3</span>
                    <span className="metric-value">{formatValue(record.freeT3)} <small>ng/mL</small></span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Free T4</span>
                    <span className="metric-value">{formatValue(record.freeT4)} <small>µg/dL</small></span>
                  </div>
                </div>
              </div>

              {hasFile ? (
                <div className="glass-section document-preview-section">
                  <div className="section-header-row">
                    <h3><Eye size={16} /> Original Report Preview</h3>
                    <div className="header-actions">
                      <a 
                        href={record.reportFileUrl} 
                        download={record.reportFilename || 'medical-report'}
                        className="download-text-btn"
                      >
                        <Download size={14} /> Download File
                      </a>
                    </div>
                  </div>
                  <div className="modal-file-preview-container">
                    {(record.reportFiletype?.startsWith('image/') || 
                      /\.(webp|avif|jpg|jpeg|png|gif|bmp)$/i.test(record.reportFileUrl || '')) ? (
                      <img src={record.reportFileUrl} alt="Report Preview" className="preview-image" />
                    ) : record.reportFiletype?.includes('pdf') || 
                        record.reportFilename?.toLowerCase().endsWith('.pdf') || 
                        !record.reportFiletype ? (
                      <iframe 
                        src={`${record.reportFileUrl}#toolbar=0`} 
                        title="PDF Preview" 
                        className="preview-iframe"
                      />
                    ) : (
                      <div className="unsupported-preview">
                        <div className="file-card-box">
                          <FileText size={64} className="file-icon-large" />
                          <div className="file-details-stack">
                            <strong>{record.reportFilename || 'Medical Document'}</strong>
                            <span>{record.reportFiletype || 'Binary File'}</span>
                          </div>
                          <a 
                            href={record.reportFileUrl} 
                            download={record.reportFilename || 'document'}
                            className="btn-modal-action primary download-full-btn"
                          >
                            <Download size={18} /> Download Original File
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-section no-file-section">
                  <div className="no-file-msg">
                    <Activity size={24} className="faint-icon" />
                    <p>No medical file was attached to this specific evaluation.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Actions */}
            <div className="modal-side-col">
              <div className="glass-section actions-section">
                <h3>Quick Actions</h3>
                <div className="action-buttons-stack">
                  <button 
                    className="btn-modal-action primary" 
                    onClick={handleDownloadPDF}
                    disabled={pdfGenerating}
                  >
                    {pdfGenerating ? 'Generating...' : <><Download size={16} /> Re-generate AI PDF</>}
                  </button>
                  
                  {hasFile && (
                    <a 
                      href={record.reportFileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-modal-action secondary"
                    >
                      <ExternalLink size={16} /> Open in New Tab
                    </a>
                  )}
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeline Record Component
function TimelineRecord({ record, onCardClick }) {
  const predictionLabel = record.prediction === '0' ? 'Negative' :
                          record.prediction === '1' ? 'Hypothyroid' :
                          record.prediction === '2' ? 'Hyperthyroid' :
                          (record.prediction || 'Unknown');
  
  const isAbnormal = predictionLabel !== 'Negative' && predictionLabel !== 'Unknown';

  return (
    <div className="timeline-item" onClick={() => onCardClick(record)}>
      <div className="timeline-node">
        <div className={`node-dot ${isAbnormal ? 'dot-abnormal' : 'dot-normal'}`}></div>
        <div className="node-line"></div>
      </div>
      
      <div className={`timeline-card glassmorphism hover-glow-${isAbnormal ? 'abnormal' : 'normal'}`}>
        <div className="t-card-header">
          <span className="t-card-date">
            <Calendar size={14}/> {formatDate(record.date)}
            {record.reportFileUrl && <FileText size={14} className="file-linked-icon" title="Original file attached" />}
          </span>
          <span className={`t-card-badge badge-${predictionLabel.toLowerCase()}`}>
            {predictionLabel}
          </span>
        </div>
        
        <div className="t-card-metrics">
          <div className="t-metric">
            <em>TSH</em> <strong>{formatValue(record.tsh)}</strong>
          </div>
          <div className="t-metric">
            <em>T3</em> <strong>{formatValue(record.freeT3)}</strong>
          </div>
          <div className="t-metric">
            <em>T4</em> <strong>{formatValue(record.freeT4)}</strong>
          </div>
        </div>

        <div className="t-card-footer">
          {record.reportFileUrl && (
            <button 
              className="t-card-file-btn" 
              onClick={(e) => {
                e.stopPropagation();
                window.open(record.reportFileUrl, '_blank');
              }}
            >
              <FileText size={14} /> View Source
            </button>
          )}
          <div className="t-card-view-details">
            <span>Details</span>
            <ChevronRight size={16} />
          </div>
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
        const pred = (r.prediction || '').toString().toLowerCase();
        return date.includes(searchLower) || pred.includes(searchLower);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, filter]);

  return (
    <div className="ph-dashboard">
      
      {/* Dynamic Header */}
      <div className="ph-header glassmorphism">
        <div className="ph-title-area">
          <Activity size={28} className="ph-icon" />
          <div>
            <h1>Clinical History</h1>
            <p>Chronological patient records for {user?.fullName || 'the user'}</p>
          </div>
        </div>
        
        <div className="ph-filters">
          <div className="search-pill">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <X size={14} className="clear-icon" onClick={() => setSearchTerm('')} />}
          </div>
          
          <div className="filter-pill">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="ph-timeline-container">
        {filteredRecords.length > 0 ? (
          <div className="timeline-wrapper">
            {filteredRecords.map((record) => (
              <TimelineRecord key={record.id} record={record} onCardClick={setSelectedRecord} />
            ))}
          </div>
        ) : (
          <div className="empty-state glassmorphism">
            <div className="empty-pulse"></div>
            <Activity size={48} />
            <h3>No Records Found</h3>
            <p>Patient outcome data will populate here after screening.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedRecord && (
        <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}

export default PatientHistory;

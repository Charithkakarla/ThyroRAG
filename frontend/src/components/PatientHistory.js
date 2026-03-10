import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Activity, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Search,
  RefreshCw
} from 'lucide-react';
import { getPredictionHistory } from '../services/api';
import '../styles/PatientHistory.css';

/**
 * PatientHistory Component
 * Fetches and displays the authenticated user's thyroid prediction records from Supabase.
 */
function PatientHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiagnosis, setFilterDiagnosis] = useState('all');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPredictionHistory();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load prediction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleRecord = (id) => {
    setExpandedRecord(expandedRecord === id ? null : id);
  };

  const getDiagnosisClass = (diagnosis) => {
    switch (diagnosis) {
      case 'Negative': return 'diagnosis-negative';
      case 'Hypothyroid': return 'diagnosis-hypothyroid';
      case 'Hyperthyroid': return 'diagnosis-hyperthyroid';
      default: return '';
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown date';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const filteredRecords = records.filter(record => {
    const diagnosis = record.prediction || record.diagnosis || '';
    const dateStr = record.created_at || '';
    const matchesSearch =
      diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dateStr.includes(searchTerm);
    const matchesDiagnosis = filterDiagnosis === 'all' || diagnosis === filterDiagnosis;
    return matchesSearch && matchesDiagnosis;
  });

  return (
    <div className="patient-history-container">
      <div className="history-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by diagnosis or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <label>Filter by Diagnosis:</label>
          <select
            value={filterDiagnosis}
            onChange={(e) => setFilterDiagnosis(e.target.value)}
          >
            <option value="all">All Records</option>
            <option value="Negative">Negative</option>
            <option value="Hypothyroid">Hypothyroid</option>
            <option value="Hyperthyroid">Hyperthyroid</option>
          </select>
        </div>

        <button
          className="action-btn refresh-btn"
          onClick={fetchHistory}
          disabled={loading}
          title="Refresh records"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="no-results">
          <Activity size={48} />
          <p>Loading your prediction history...</p>
        </div>
      )}

      {!loading && error && (
        <div className="no-results">
          <FileText size={48} />
          <p>{error}</p>
          <button className="action-btn" onClick={fetchHistory}>Try Again</button>
        </div>
      )}

      {!loading && !error && filteredRecords.length === 0 && (
        <div className="no-results">
          <FileText size={48} />
          <p>
            {records.length === 0
              ? 'No prediction records yet. Run a thyroid prediction to see your history here.'
              : 'No records match your search.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredRecords.length > 0 && (
        <div className="patients-list">
          {filteredRecords.map((record, index) => {
            const diagnosis = record.prediction || record.diagnosis || 'Unknown';
            const rawConf = record.confidence;
            const confidence = rawConf != null
              ? (Number(rawConf) * (Number(rawConf) <= 1 ? 100 : 1)).toFixed(1)
              : null;
            const inputData = record.input_data || {};
            const recordId = record.id || index;
            const labKeys = ['TSH', 'T3', 'TT4', 'T4U', 'FTI'];

            return (
              <div key={recordId} className="patient-card">
                <div className="patient-header" onClick={() => toggleRecord(recordId)}>
                  <div className="patient-basic-info">
                    <div className="patient-avatar">
                      <Activity size={24} />
                    </div>
                    <div className="patient-details">
                      <h3>Thyroid Screening</h3>
                      <div className="patient-meta">
                        <span className="patient-id">{formatDate(record.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="patient-status">
                    <div className={"diagnosis-badge " + getDiagnosisClass(diagnosis)}>
                      {diagnosis}
                    </div>
                    {confidence != null && (
                      <div className="confidence-indicator">{confidence}% confidence</div>
                    )}
                  </div>

                  <button className="expand-btn">
                    {expandedRecord === recordId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {expandedRecord === recordId && (
                  <div className="patient-expanded">
                    {labKeys.some(k => inputData[k] != null) && (
                      <div className="records-history">
                        <h4><Activity size={18} /> Lab Values</h4>
                        <div className="record-entry">
                          <div className="lab-results">
                            {labKeys.map(key =>
                              inputData[key] != null ? (
                                <div key={key} className="lab-value">
                                  <span className="lab-label">{key}:</span>
                                  <span className="lab-number">{inputData[key]}</span>
                                </div>
                              ) : null
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {Object.keys(inputData).filter(k => !labKeys.includes(k)).length > 0 && (
                      <div className="patient-info-grid">
                        <div className="info-section">
                          <h4><FileText size={18} /> Patient Info</h4>
                          <div className="lab-results">
                            {Object.entries(inputData)
                              .filter(([k]) => !labKeys.includes(k))
                              .map(([key, val]) => (
                                <div key={key} className="lab-value">
                                  <span className="lab-label">{key.replace(/_/g, ' ')}:</span>
                                  <span className="lab-number">{String(val)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {record.model_version && (
                      <p style={{ padding: '0.5rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-lighter)' }}>
                        Model: {record.model_version}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PatientHistory;
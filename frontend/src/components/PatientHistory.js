import React, { useState } from 'react';
import { 
  User, 
  Calendar, 
  Activity, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Download,
  Printer,
  Search
} from 'lucide-react';
import '../styles/PatientHistory.css';

/**
 * Static Patient Records Data
 * Sample patient records for demonstration
 */
const samplePatients = [
  {
    id: 'P001',
    fullName: 'Sarah Johnson',
    age: 45,
    sex: 'F',
    dob: '1980-05-15',
    lastVisit: '2025-01-20',
    diagnosis: 'Hypothyroid',
    confidence: 92.5,
    records: [
      {
        date: '2025-01-20',
        TSH: 8.5,
        T3: 0.8,
        TT4: 65,
        T4U: 0.85,
        FTI: 76,
        diagnosis: 'Hypothyroid',
        confidence: 92.5,
        notes: 'Patient showing classic symptoms of hypothyroidism. Recommended medication adjustment.'
      },
      {
        date: '2024-12-10',
        TSH: 7.2,
        T3: 0.9,
        TT4: 70,
        T4U: 0.88,
        FTI: 79,
        diagnosis: 'Hypothyroid',
        confidence: 89.3,
        notes: 'Follow-up visit. Hormone levels still elevated.'
      }
    ],
    medications: ['Levothyroxine 50mcg'],
    allergies: ['None'],
    weight: 68.5
  },
  {
    id: 'P002',
    fullName: 'Michael Chen',
    age: 38,
    sex: 'M',
    dob: '1987-08-22',
    lastVisit: '2025-01-18',
    diagnosis: 'Hyperthyroid',
    confidence: 87.8,
    records: [
      {
        date: '2025-01-18',
        TSH: 0.2,
        T3: 2.8,
        TT4: 185,
        T4U: 1.45,
        FTI: 127,
        diagnosis: 'Hyperthyroid',
        confidence: 87.8,
        notes: 'Patient experiencing weight loss and increased heart rate. Prescribed anti-thyroid medication.'
      },
      {
        date: '2024-11-25',
        TSH: 0.3,
        T3: 2.5,
        TT4: 175,
        T4U: 1.40,
        FTI: 125,
        diagnosis: 'Hyperthyroid',
        confidence: 85.2,
        notes: 'Initial diagnosis. Monitoring required.'
      }
    ],
    medications: ['Methimazole 10mg', 'Propranolol 20mg'],
    allergies: ['Penicillin'],
    weight: 72.3
  },
  {
    id: 'P003',
    fullName: 'Emily Rodriguez',
    age: 52,
    sex: 'F',
    dob: '1973-03-10',
    lastVisit: '2025-01-15',
    diagnosis: 'Negative',
    confidence: 95.2,
    records: [
      {
        date: '2025-01-15',
        TSH: 2.1,
        T3: 1.2,
        TT4: 105,
        T4U: 1.0,
        FTI: 105,
        diagnosis: 'Negative',
        confidence: 95.2,
        notes: 'Annual checkup. All hormone levels within normal range.'
      },
      {
        date: '2024-01-12',
        TSH: 2.3,
        T3: 1.1,
        TT4: 102,
        T4U: 0.98,
        FTI: 104,
        diagnosis: 'Negative',
        confidence: 94.8,
        notes: 'Previous annual checkup. No concerns.'
      }
    ],
    medications: ['None'],
    allergies: ['Latex'],
    weight: 65.0
  },
  {
    id: 'P004',
    fullName: 'David Thompson',
    age: 62,
    sex: 'M',
    dob: '1963-11-30',
    lastVisit: '2025-01-12',
    diagnosis: 'Hypothyroid',
    confidence: 91.3,
    records: [
      {
        date: '2025-01-12',
        TSH: 9.2,
        T3: 0.7,
        TT4: 58,
        T4U: 0.82,
        FTI: 70,
        diagnosis: 'Hypothyroid',
        confidence: 91.3,
        notes: 'Patient on medication. Showing improvement but still requires monitoring.'
      }
    ],
    medications: ['Levothyroxine 75mcg', 'Metformin 500mg'],
    allergies: ['Sulfa drugs'],
    weight: 85.2
  },
  {
    id: 'P005',
    fullName: 'Priya Sharma',
    age: 29,
    sex: 'F',
    dob: '1996-07-18',
    lastVisit: '2025-01-10',
    diagnosis: 'Negative',
    confidence: 96.5,
    records: [
      {
        date: '2025-01-10',
        TSH: 1.8,
        T3: 1.3,
        TT4: 110,
        T4U: 1.05,
        FTI: 105,
        diagnosis: 'Negative',
        confidence: 96.5,
        notes: 'Pre-pregnancy screening. All levels normal. Cleared for conception.'
      }
    ],
    medications: ['Prenatal vitamins'],
    allergies: ['None'],
    weight: 58.0
  }
];

function PatientHistory() {
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiagnosis, setFilterDiagnosis] = useState('all');

  const togglePatient = (patientId) => {
    setExpandedPatient(expandedPatient === patientId ? null : patientId);
  };

  // Filter patients based on search term and diagnosis filter
  const filteredPatients = samplePatients.filter(patient => {
    const matchesSearch = patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiagnosis = filterDiagnosis === 'all' || patient.diagnosis === filterDiagnosis;
    return matchesSearch && matchesDiagnosis;
  });

  const getDiagnosisClass = (diagnosis) => {
    switch (diagnosis) {
      case 'Negative':
        return 'diagnosis-negative';
      case 'Hypothyroid':
        return 'diagnosis-hypothyroid';
      case 'Hyperthyroid':
        return 'diagnosis-hyperthyroid';
      default:
        return '';
    }
  };

  return (
    <div className="patient-history-container">
      {/* Search and Filter Bar */}
      <div className="history-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name or ID..."
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
            <option value="all">All Patients</option>
            <option value="Negative">Negative</option>
            <option value="Hypothyroid">Hypothyroid</option>
            <option value="Hyperthyroid">Hyperthyroid</option>
          </select>
        </div>
      </div>

      {/* Patient List */}
      <div className="patients-list">
        {filteredPatients.length === 0 ? (
          <div className="no-results">
            <FileText size={48} />
            <p>No patient records found</p>
          </div>
        ) : (
          filteredPatients.map(patient => (
            <div key={patient.id} className="patient-card">
              {/* Patient Summary Header */}
              <div className="patient-header" onClick={() => togglePatient(patient.id)}>
                <div className="patient-basic-info">
                  <div className="patient-avatar">
                    <User size={24} />
                  </div>
                  <div className="patient-details">
                    <h3>{patient.fullName}</h3>
                    <div className="patient-meta">
                      <span className="patient-id">ID: {patient.id}</span>
                      <span className="patient-age">{patient.age} years, {patient.sex === 'F' ? 'Female' : 'Male'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="patient-status">
                  <div className={`diagnosis-badge ${getDiagnosisClass(patient.diagnosis)}`}>
                    {patient.diagnosis}
                  </div>
                  <div className="confidence-indicator">
                    {patient.confidence}% confidence
                  </div>
                  <Calendar size={16} />
                  <span className="last-visit">Last visit: {patient.lastVisit}</span>
                </div>
                
                <button className="expand-btn">
                  {expandedPatient === patient.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {/* Expanded Patient Details */}
              {expandedPatient === patient.id && (
                <div className="patient-expanded">
                  <div className="patient-info-grid">
                    <div className="info-section">
                      <h4><Activity size={18} /> Current Medications</h4>
                      <ul>
                        {patient.medications.map((med, idx) => (
                          <li key={idx}>{med}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="info-section">
                      <h4><FileText size={18} /> Allergies</h4>
                      <p>{patient.allergies.join(', ')}</p>
                    </div>
                    
                    <div className="info-section">
                      <h4>Weight</h4>
                      <p>{patient.weight} kg</p>
                    </div>
                  </div>

                  {/* Medical Records History */}
                  <div className="records-history">
                    <h4><Calendar size={18} /> Medical Records History</h4>
                    {patient.records.map((record, idx) => (
                      <div key={idx} className="record-entry">
                        <div className="record-header">
                          <strong>{record.date}</strong>
                          <span className={`diagnosis-tag ${getDiagnosisClass(record.diagnosis)}`}>
                            {record.diagnosis}
                          </span>
                        </div>
                        
                        <div className="lab-results">
                          <div className="lab-value">
                            <span className="lab-label">TSH:</span>
                            <span className="lab-number">{record.TSH}</span>
                          </div>
                          <div className="lab-value">
                            <span className="lab-label">T3:</span>
                            <span className="lab-number">{record.T3}</span>
                          </div>
                          <div className="lab-value">
                            <span className="lab-label">TT4:</span>
                            <span className="lab-number">{record.TT4}</span>
                          </div>
                          <div className="lab-value">
                            <span className="lab-label">T4U:</span>
                            <span className="lab-number">{record.T4U}</span>
                          </div>
                          <div className="lab-value">
                            <span className="lab-label">FTI:</span>
                            <span className="lab-number">{record.FTI}</span>
                          </div>
                        </div>
                        
                        <div className="record-notes">
                          <strong>Notes:</strong> {record.notes}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="patient-actions">
                    <button className="action-btn">
                      <Download size={16} />
                      Export Records
                    </button>
                    <button className="action-btn">
                      <Printer size={16} />
                      Print Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PatientHistory;

import React, { useState, useRef } from 'react';
import {
  Loader2,
  Activity,
  RotateCcw,
  AlertCircle,
  BarChart2,
  PieChart,
  Info,
  Upload,
  FileDown
} from 'lucide-react';
import { predictThyroidDisease, parseUploadedFile, storeReportFile } from '../services/api';
import { generatePDF } from '../utils/generatePDF';
import { useNotification } from '../context/NotificationContext';
import '../styles/PredictionForm.css';

function extractHistoryValues(fields) {
  const tsh = fields.TSH ?? fields.tsh;
  const freeT3 = fields.freeT3 ?? fields.free_t3 ?? fields.FT3 ?? fields.ft3 ?? fields.T3 ?? fields.t3;
  const freeT4 = fields.freeT4 ?? fields.free_t4 ?? fields.FT4 ?? fields.ft4 ?? fields.TT4 ?? fields.tt4;

  if (tsh == null && freeT3 == null && freeT4 == null) {
    return null;
  }

  return {
    tsh,
    freeT3,
    freeT4,
  };
}

/**
 * PredictionForm Component
 * Collects user input for thyroid-related medical data
 * Sends data to FastAPI backend and displays prediction results
 */
function PredictionForm({ defaultPatientName = '', onHistoryRecordCreated }) {
  const { showSuccess, showError } = useNotification();
  
  // Form data state - matches features from thyroid dataset
  const [formData, setFormData] = useState({
    fullName: defaultPatientName,
    dob: '',
    age: '',
    weight: '',
    sex: 'F',
    TSH: '',
    T3: '',
    TT4: '',
    T4U: '',
    FTI: '',
    on_thyroxine: 'No',
    query_on_thyroxine: 'No',
    on_antithyroid_medication: 'No',
    sick: 'No',
    pregnant: 'No',
    thyroid_surgery: 'No',
    I131_treatment: 'No',
    query_hypothyroid: 'No',
    query_hyperthyroid: 'No',
    lithium: 'No',
    goitre: 'No',
    tumor: 'No',
    hypopituitary: 'No',
    psych: 'No',
    TSH_measured: 'Yes',
    T3_measured: 'Yes',
    TT4_measured: 'Yes',
    T4U_measured: 'Yes',
    FTI_measured: 'Yes',
    TBG_measured: 'No',
    TBG: '',
    referral_source: 'other'
  });

  // UI state management
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [uploadedReportMeta, setUploadedReportMeta] = useState(null); // { file_url, filename, filetype }

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await generatePDF(result, formData);
    } finally {
      setPdfLoading(false);
    }
  };
  const fileInputRef = useRef(null);

  /**
   * Handle patient data file upload (CSV or JSON).
   * Calls the backend to parse the file and auto-fills the form.
   */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      // Parse file fields AND upload to Supabase Storage simultaneously
      const [data, storedReport] = await Promise.all([
        parseUploadedFile(file),
        storeReportFile(file),
      ]);

      const fields = data.fields || {};
      const fieldCount = Object.keys(fields).length;
      const extractedReportDate = fields.report_date || fields.reportDate || null;
      const { report_date, reportDate, ...formFields } = fields;

      if (fieldCount > 0) {
        setFormData(prev => ({ ...prev, fullName: prev.fullName || defaultPatientName, ...formFields }));
      }

      // Store the uploaded file metadata for attaching to the prediction
      if (storedReport?.file_url) {
        setUploadedReportMeta(storedReport);
      }

      const extractedHistoryValues = extractHistoryValues(formFields);
      if (onHistoryRecordCreated) {
        onHistoryRecordCreated({
          date: extractedReportDate || new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
          tsh: extractedHistoryValues?.tsh ?? null,
          freeT3: extractedHistoryValues?.freeT3 ?? null,
          freeT4: extractedHistoryValues?.freeT4 ?? null,
          source: extractedHistoryValues ? 'report-upload' : 'report-upload-partial',
        });
      }

      if (data.status === 'partial' || fieldCount === 0) {
        showSuccess(`File "${file.name}" uploaded and indexed. No lab values detected.`);
      } else {
        showSuccess(`Successfully loaded "${file.name}" with ${fieldCount} fields!`);
      }
    } catch (err) {
      showError(`Failed to upload file: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Handle input changes for all form fields
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handle form submission
   * Sends data to backend API and displays results
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Filter out non-medical fields before sending to API
      const { fullName, dob, ...medicalData } = formData;

      // Convert form data to proper types (numbers for numeric fields)
      const processedData = {
        ...medicalData,
        // Include patient identity so backend can store & index them
        full_name: fullName,
        dob: dob,
        age: formData.age ? parseFloat(formData.age) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        TSH: formData.TSH ? parseFloat(formData.TSH) : null,
        T3: formData.T3 ? parseFloat(formData.T3) : null,
        TT4: formData.TT4 ? parseFloat(formData.TT4) : null,
        T4U: formData.T4U ? parseFloat(formData.T4U) : null,
        FTI: formData.FTI ? parseFloat(formData.FTI) : null,
        TBG: formData.TBG ? parseFloat(formData.TBG) : null
      };

      // Include uploaded report metadata if available
      if (uploadedReportMeta?.file_url) {
        processedData.report_file_url = uploadedReportMeta.file_url;
        processedData.report_filename = uploadedReportMeta.filename;
        processedData.report_filetype = uploadedReportMeta.filetype;
      }

      // Call API
      const response = await predictThyroidDisease(processedData);
      setResult(response);
      setUploadedReportMeta(null); // clear after use

      // Show success message & refresh history after a short delay to let DB write complete
      if (onHistoryRecordCreated) {
        showSuccess('✅ Prediction saved! Your Patient History & Analytics have been updated.');
        setTimeout(() => onHistoryRecordCreated(), 700);
      }
    } catch (err) {
      setError(err.message || 'Failed to get prediction. Please check your input and try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const handleReset = () => {
    setFormData({
    fullName: defaultPatientName,
      dob: '',
      age: '',
      weight: '',
      sex: 'F',
      TSH: '',
      T3: '',
      TT4: '',
      T4U: '',
      FTI: '',
      on_thyroxine: 'No',
      query_on_thyroxine: 'No',
      on_antithyroid_medication: 'No',
      sick: 'No',
      pregnant: 'No',
      thyroid_surgery: 'No',
      I131_treatment: 'No',
      query_hypothyroid: 'No',
      query_hyperthyroid: 'No',
      lithium: 'No',
      goitre: 'No',
      tumor: 'No',
      hypopituitary: 'No',
      psych: 'No',
      TSH_measured: 'Yes',
      T3_measured: 'Yes',
      TT4_measured: 'Yes',
      T4U_measured: 'Yes',
      FTI_measured: 'Yes',
      TBG_measured: 'No',
      TBG: '',
      referral_source: 'other'
    });
    setResult(null);
    setError(null);
  };

  React.useEffect(() => {
    setFormData((prev) => ({ ...prev, fullName: prev.fullName || defaultPatientName }));
  }, [defaultPatientName]);

  return (
    <div className="prediction-form-container">
      {/* ── Top-right file upload button ─────────────────────────── */}
      <div className="prediction-form-header">
        <div className="form-title">
          <Activity size={22} />
          <span>Thyroid Diagnosis Form</span>
        </div>
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            id="patient-file-input"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            className="upload-file-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload any medical report (PDF, image, CSV, JSON, DOCX, AVIF…) to auto-fill available fields"
          >
            {uploading
              ? <Loader2 size={16} className="animate-spin" />
              : <Upload size={16} />}
            {uploading ? 'Parsing...' : 'Upload File'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="prediction-form">

        {/* Basic Information Section */}
        <div className="form-section">
          <h3 className="section-heading">Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter patient's full name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="dob">Date of Birth</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="0"
                max="120"
                placeholder="Enter age (optional)"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sex">Sex</label>
              <select
                id="sex"
                name="sex"
                value={formData.sex}
                onChange={handleChange}
              >
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                min="0"
                step="0.1"
                placeholder="Enter weight in kg (optional)"
              />
            </div>
          </div>
        </div>

        {/* Hormone Levels Section */}
        <div className="form-section">
          <h3 className="section-heading">Hormone Levels (Lab Results)</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="TSH">TSH (Thyroid Stimulating Hormone)</label>
              <input
                type="number"
                id="TSH"
                name="TSH"
                value={formData.TSH}
                onChange={handleChange}
                step="0.01"
                placeholder="e.g., 2.5"
              />
            </div>
            <div className="form-group">
              <label htmlFor="T3">T3 (Triiodothyronine)</label>
              <input
                type="number"
                id="T3"
                name="T3"
                value={formData.T3}
                onChange={handleChange}
                step="0.01"
                placeholder="e.g., 1.8"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="TT4">TT4 (Total Thyroxine)</label>
              <input
                type="number"
                id="TT4"
                name="TT4"
                value={formData.TT4}
                onChange={handleChange}
                step="0.01"
                placeholder="e.g., 110"
              />
            </div>
            <div className="form-group">
              <label htmlFor="T4U">T4U (T4 Uptake)</label>
              <input
                type="number"
                id="T4U"
                name="T4U"
                value={formData.T4U}
                onChange={handleChange}
                step="0.01"
                placeholder="e.g., 0.95"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="FTI">FTI (Free Thyroxine Index)</label>
              <input
                type="number"
                id="FTI"
                name="FTI"
                value={formData.FTI}
                onChange={handleChange}
                step="0.01"
                placeholder="e.g., 105"
              />
            </div>
            <div className="form-group">
              <label htmlFor="TBG">TBG (Thyroxine Binding Globulin)</label>
              <input
                type="number"
                id="TBG"
                name="TBG"
                value={formData.TBG}
                onChange={handleChange}
                step="0.01"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* Medical History Section */}
        <div className="form-section">
          <h3 className="section-heading">Medical History & Symptoms</h3>
          <div className="checkbox-grid">
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="on_thyroxine"
                  checked={formData.on_thyroxine === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    on_thyroxine: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                On Thyroxine Medication
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="query_on_thyroxine"
                  checked={formData.query_on_thyroxine === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    query_on_thyroxine: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Suspected On Thyroxine
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="on_antithyroid_medication"
                  checked={formData.on_antithyroid_medication === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    on_antithyroid_medication: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                On Antithyroid Medication
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="thyroid_surgery"
                  checked={formData.thyroid_surgery === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    thyroid_surgery: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Previous Thyroid Surgery
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="I131_treatment"
                  checked={formData.I131_treatment === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    I131_treatment: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                I131 Treatment
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="query_hypothyroid"
                  checked={formData.query_hypothyroid === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    query_hypothyroid: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Hypothyroid Symptoms
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="query_hyperthyroid"
                  checked={formData.query_hyperthyroid === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    query_hyperthyroid: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Hyperthyroid Symptoms
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="pregnant"
                  checked={formData.pregnant === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    pregnant: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Pregnant
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="sick"
                  checked={formData.sick === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sick: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Currently Sick
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="goitre"
                  checked={formData.goitre === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    goitre: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Goitre (Enlarged Thyroid)
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="tumor"
                  checked={formData.tumor === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    tumor: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Tumor
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="lithium"
                  checked={formData.lithium === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    lithium: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Taking Lithium
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="hypopituitary"
                  checked={formData.hypopituitary === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    hypopituitary: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Hypopituitary History
              </label>
            </div>
            <div className="checkbox-item">
              <label>
                <input
                  type="checkbox"
                  name="psych"
                  checked={formData.psych === 'Yes'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    psych: e.target.checked ? 'Yes' : 'No'
                  }))}
                />
                Psychiatric History
              </label>
            </div>
          </div>
        </div>

        {/* Referral Source */}


        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Activity size={20} /> Get Prediction</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            <RotateCcw size={20} /> Reset Form
          </button>
        </div>
      </form>

      {/* Results Display */}
      {loading && (
        <div className="result-container loading">
          <div className="spinner"></div>
          <p>Analyzing your data with AI model...</p>
        </div>
      )}

      {error && (
        <div className="result-container error">
          <h3><AlertCircle size={24} /> Error</h3>
          <p>{error}</p>
        </div>
      )}

      {result && !loading && (
        <div className={`result-container success ${result.result_label?.toLowerCase()}`}>
          <h3><BarChart2 size={24} /> Prediction Results</h3>
          <div className="result-details">
            <div className="result-item main-result">
              <span className="result-label">AI Diagnosis:</span>
              <span className="result-value">{result.result_label || 'N/A'}</span>
            </div>
            {result.confidence && (
              <div className="result-item">
                <span className="result-label">Overall Confidence:</span>
                <span className="result-value">{(result.confidence * 100).toFixed(2)}%</span>
              </div>
            )}
            {result.probabilities && (
              <div className="probabilities">
                <h4><PieChart size={20} /> Medical Analysis Breakdown:</h4>
                {Object.entries(result.probabilities).map(([key, value]) => (
                  <div key={key} className="probability-bar">
                    <span className="prob-label">{key} Chance:</span>
                    <div className="prob-bar-container">
                      <div
                        className="prob-bar-fill"
                        style={{ width: `${(value * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                    <span className="prob-value">{(value * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
            {result.clinical_interpretation && (
              <div className="result-interpretation">
                <h4><Info size={18} /> Clinical Interpretation</h4>
                <p>{result.clinical_interpretation}</p>
              </div>
            )}
            {result.key_reasons && result.key_reasons.length > 0 && (
              <div className="result-key-reasons">
                <h4>Key Factors Influencing This Prediction:</h4>
                <ul>
                  {result.key_reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
          <p className="result-disclaimer">
            <Info size={18} /> This is an AI prediction for educational purposes. Please consult a healthcare professional for proper diagnosis.
          </p>
          <div className="result-actions">
            <button
              className="btn-download-pdf"
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
            >
              {pdfLoading
                ? <><Loader2 size={18} className="animate-spin" /> Generating Report…</>
                : <><FileDown size={18} /> Download Full Report (PDF)</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictionForm;

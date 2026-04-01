import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Singleton reference to Clerk's getToken function.
 * App.js calls setTokenGetter(getToken) after the Clerk hook is ready.
 */
let _getToken = null;

export function setTokenGetter(fn) {
  _getToken = fn;
}

/** Returns an Authorization header using the current Clerk JWT. */
const getAuthHeaders = async () => {
  if (!_getToken) return {};
  try {
    const token = await _getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/**
 * Predict thyroid disease from patient data using the FastAPI backend.
 */
export const predictThyroidDisease = async (patientData) => {
  try {
    const headers = await getAuthHeaders();
    const NUMERIC_OPTIONAL = ['age', 'weight', 'TSH', 'T3', 'TT4', 'T4U', 'FTI', 'TBG'];
    const sanitized = { ...patientData };
    for (const field of NUMERIC_OPTIONAL) {
      const v = sanitized[field];
      if (v === '' || v === undefined) {
        sanitized[field] = null;
      } else if (v !== null) {
        sanitized[field] = Number(v);
      }
    }
    const response = await axios.post(`${API_BASE_URL}/predict`, sanitized, { headers });
    return response.data;
  } catch (error) {
    console.error('Prediction API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to connect to ML backend');
  }
};

/**
 * Send a chat message to the RAG-powered chatbot.
 */
export const sendChatMessage = async (message, history = []) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/chat`, { message, history }, { headers });
    return response.data;
  } catch (error) {
    console.error('Chat API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to connect to RAG chatbot backend');
  }
};

/**
 * Fetch the current user's prediction history.
 */
export const getPredictionHistory = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/predictions/history`, { headers });
    return response.data;
  } catch (error) {
    console.error('History API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch prediction history');
  }
};

/**
 * Upload a patient data file (CSV or JSON) to the backend for parsing.
 * Returns { fields: { age, sex, TSH, ... } } to auto-fill the diagnosis form.
 */
export const parseUploadedFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/upload/parse-file`, formData, {
      headers: { ...headers },
    });
    return response.data;
  } catch (error) {
    console.error('File Parse API Error:', error);
    const detail = error.response?.data?.detail;
    const msg = Array.isArray(detail)
      ? detail.map(d => d.msg || JSON.stringify(d)).join('; ')
      : (detail || 'Failed to parse uploaded file');
    throw new Error(msg);
  }
};

/**
 * Upload a report file to Supabase Storage via the backend (uses service role key).
 * Returns { file_url, filename, filetype } on success, or null if it fails (non-fatal).
 */
export const storeReportFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/upload/store-report`, formData, {
      headers: { ...headers },
    });
    return response.data;
  } catch (error) {
    console.warn('Report storage failed (non-blocking):', error?.response?.data?.detail || error.message);
    return null;
  }
};

/**
 * Upload any file (PDF, Word, image, CSV, etc.) to the RAG knowledge base.
 * Apache Tika on the backend extracts the text; the result is ingested into Qdrant.
 *
 * @param {File} file - The file to upload (any format, any size).
 * @param {function} [onProgress] - Optional callback (0-100) for upload progress.
 * @returns {{ status, document_id, filename, extracted_chars, chunks_ingested }}
 */
export const uploadDocumentToRAG = async (file, onProgress) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    const response = await axios.post(
      `${API_BASE_URL}/rag/upload-file`,
      formData,
      {
        headers: { ...headers },
        onUploadProgress: onProgress
          ? (evt) => {
              const pct = evt.total ? Math.round((evt.loaded * 100) / evt.total) : 0;
              onProgress(pct);
            }
          : undefined,
      }
    );
    return response.data;
  } catch (error) {
    console.error('RAG Upload API Error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to upload document to knowledge base');
  }
};

const apiService = { predictThyroidDisease, sendChatMessage, getPredictionHistory, parseUploadedFile, storeReportFile, uploadDocumentToRAG };
export default apiService;

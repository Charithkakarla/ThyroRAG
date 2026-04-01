/**
 * Patient Records Utilities — Powered by Supabase
 * Fetches predictions from the backend `predictions` table
 * Only shows real predictions from thyroid diagnosis evaluations
 */
import { supabase } from '../supabase/supabaseClient';

export const REFERENCE_RANGES = {
  tsh: { label: 'TSH', low: 0.4, high: 4.0 },
  freeT3: { label: 'Free T3', low: 2.3, high: 4.2 },
  freeT4: { label: 'Free T4', low: 0.8, high: 1.8 },
};

export function getPatientDisplayName(user) {
  return user?.fullName?.trim() || 'Patient';
}

export function getHormoneStatus(value, low, high) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 'Unknown';
  if (numericValue < low) return 'Low';
  if (numericValue > high) return 'High';
  return 'Normal';
}

function sortAscending(records) {
  return [...records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

/**
 * Parses the notes field, which may contain a JSON string with an interpretation and report file data.
 */
function parseNotes(notesStr) {
  if (!notesStr) return { interpretation: '', report_file_url: null, report_filename: null, report_filetype: null };
  try {
    const obj = JSON.parse(notesStr);
    return {
      interpretation: obj.interpretation || '',
      key_reasons: obj.key_reasons || [],
      report_file_url: obj.report_file_url || null,
      report_filename: obj.report_filename || null,
      report_filetype: obj.report_filetype || null,
    };
  } catch {
    // Falls back to string if notes is not valid JSON
    return { interpretation: notesStr, report_file_url: null, report_filename: null, report_filetype: null };
  }
}

/**
 * Normalize Supabase prediction record to internal format
 */
function normalizeSupabaseRecord(record, patientName) {
  const notes = parseNotes(record.notes);
  return {
    id: record.id,
    patientName: patientName,
    date: new Date(record.created_at).toISOString().split('T')[0],
    created_at: record.created_at,
    tsh: record.tsh ?? null,
    freeT3: record.t3 ?? null,    // DB column is 't3'
    freeT4: record.tt4 ?? null,   // DB column is 'tt4'
    source: 'prediction',
    prediction: record.prediction,
    confidence: record.confidence ?? null,
    probabilities: {
      Negative: record.prob_negative ?? null,
      Hypothyroid: record.prob_hypothyroid ?? null,
      Hyperthyroid: record.prob_hyperthyroid ?? null,
    },
    interpretation: notes.interpretation,
    keyReasons: notes.key_reasons,
    reportFileUrl: notes.report_file_url,
    reportFilename: notes.report_filename,
    reportFiletype: notes.report_filetype,
    // Store original record data to re-generate PDF if needed
    rawRecord: record 
  };
}


/**
 * Add hormone status to each record based on reference ranges
 */
export function hydratePatientRecords(records) {
  return sortAscending(records).map((record) => {
    const tshStatus = getHormoneStatus(record.tsh, REFERENCE_RANGES.tsh.low, REFERENCE_RANGES.tsh.high);
    const freeT3Status = getHormoneStatus(record.freeT3, REFERENCE_RANGES.freeT3.low, REFERENCE_RANGES.freeT3.high);
    const freeT4Status = getHormoneStatus(record.freeT4, REFERENCE_RANGES.freeT4.low, REFERENCE_RANGES.freeT4.high);
    return {
      ...record,
      statuses: {
        tsh: tshStatus,
        freeT3: freeT3Status,
        freeT4: freeT4Status,
      },
    };
  });
}

/**
 * Fetch all predictions from Supabase for the current user
 * Only shows real predictions made in the diagnosis module
 */
export async function loadPatientRecords(user) {
  if (!user?.id) return [];

  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Supabase] Could not load predictions:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    console.log('[Supabase] Raw data received:', data); // DEBUGGING

    const patientName = getPatientDisplayName(user);
    const normalized = data.map((record) => normalizeSupabaseRecord(record, patientName));
    const hydrated = hydratePatientRecords(normalized);
    
    console.log('[Supabase] Processed records:', hydrated); // DEBUGGING
    return hydrated;
  } catch (err) {
    console.error('[Patient records] Failed to load from Supabase:', err);
    return [];
  }
}

/**
 * Generate insight text based on hormone trends
 */
export function buildHormoneInsight(records) {
  if (!records.length) {
    return 'No thyroid history yet. Start by evaluating your thyroid in the Diagnosis module.';
  }

  const sorted = sortAscending(records);
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const tshDelta = Number((latest.tsh - first.tsh).toFixed(1));
  const direction = tshDelta < 0 ? 'decreased' : tshDelta > 0 ? 'increased' : 'remained stable';
  const latestStatus = getHormoneStatus(latest.tsh, REFERENCE_RANGES.tsh.low, REFERENCE_RANGES.tsh.high).toLowerCase();

  if (direction === 'remained stable') {
    return `TSH remained stable at ${latest.tsh} over time, and the latest reading is ${latestStatus}.`;
  }

  return `TSH ${direction} from ${first.tsh} to ${latest.tsh} over time, indicating ${tshDelta < 0 ? 'improvement toward' : 'movement away from'} the normal range. The latest TSH is ${latestStatus}.`;
}

/**
 * Build chart data for analytics visualization
 */
export function buildAnalyticsChartData(records) {
  return sortAscending(records).map((record) => ({
    date: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: record.date,
    TSH: record.tsh,
    'Free T3': record.freeT3,
    'Free T4': record.freeT4,
  }));
}

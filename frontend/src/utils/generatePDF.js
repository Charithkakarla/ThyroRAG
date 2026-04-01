import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// â”€â”€ Fallback static diet data (used when Groq is unavailable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FALLBACK_DIET = {
  hypothyroid: {
    recommended: [
      'Iodine-rich foods: seaweed, iodized salt, fish (cod, tuna)',
      'Selenium sources: Brazil nuts, sunflower seeds, eggs',
      'Zinc-rich foods: pumpkin seeds, lentils, chickpeas',
      'Lean proteins: chicken, turkey, legumes',
      'Whole grains: oats, quinoa, brown rice',
      'Fruits high in antioxidants: blueberries, strawberries',
    ],
    avoid: [
      'Raw cruciferous vegetables in large amounts (broccoli, cauliflower, cabbage)',
      'Soy products: tofu, soy milk (can interfere with hormone absorption)',
      'Ultra-processed foods and refined sugar',
      'Calcium supplements within 4 hours of thyroid medication',
    ],
    tips: [
      'Take thyroid medication on an empty stomach, 30â€“60 minutes before breakfast.',
      'Cook cruciferous vegetables to reduce goitrogens.',
      'Stay hydrated â€“ aim for at least 8 glasses of water daily.',
    ],
  },
  hyperthyroid: {
    recommended: [
      'Calcium-rich foods: dairy, fortified plant-based milk, leafy greens',
      'Vitamin D: fatty fish, egg yolks, fortified cereals',
      'Cruciferous vegetables: broccoli, cauliflower (may mildly slow thyroid)',
      'Anti-inflammatory foods: turmeric, ginger, olive oil',
    ],
    avoid: [
      'Iodine-rich foods: seaweed, kelp, iodized salt (in excess)',
      'Caffeine: coffee, tea, energy drinks (worsens palpitations)',
      'Alcohol (disrupts thyroid hormone regulation)',
    ],
    tips: [
      'Eat small, frequent meals to maintain body weight and energy.',
      'Monitor bone health â€“ hyperthyroidism reduces bone density.',
      'Avoid iodine supplements unless prescribed.',
    ],
  },
  normal: {
    recommended: [
      'Balanced diet with adequate iodine from iodized salt and seafood',
      'Selenium from whole grains, eggs, and sunflower seeds',
      'Lean proteins: chicken, fish, legumes, eggs',
      'Whole fruits and vegetables daily (5+ servings)',
    ],
    avoid: [
      'Excessive processed food and added sugars',
      'Trans fats and deep-fried foods',
      'Very high iodine supplementation without medical need',
    ],
    tips: [
      'Get your thyroid levels checked annually.',
      'Maintain a healthy body weight through regular exercise.',
      'Stay hydrated and get adequate sleep (7â€“9 hours/night).',
    ],
  },
};

const FALLBACK_HOSPITALS = [
  { name: 'KIMS Hospitals', area: 'Secunderabad', specialty: 'Endocrinology & Thyroid surgery', contact: '+91-40-4488 5000' },
  { name: 'Apollo Hospitals', area: 'Jubilee Hills', specialty: 'Endocrinology, Thyroid disorders', contact: '+91-40-2360 7777' },
  { name: 'Yashoda Hospitals', area: 'Somajiguda', specialty: 'Thyroid & Endocrine', contact: '+91-40-4567 4567' },
  { name: 'Care Hospitals', area: 'Banjara Hills', specialty: 'Diabetes & Thyroid', contact: '+91-40-6789 6789' },
  { name: 'Nizams Institute of Medical Sciences (NIMS)', area: 'Punjagutta', specialty: 'Endocrinology (Government)', contact: '+91-40-2489 3000' },
  { name: 'Continental Hospitals', area: 'Gachibowli', specialty: 'Thyroid & Metabolic disorders', contact: '+91-40-6700 0000' },
  { name: 'Star Hospitals', area: 'Banjara Hills', specialty: 'Endocrinology & Internal Medicine', contact: '+91-40-4477 7777' },
];

const FALLBACK_EXERCISES = {
  hypothyroid: [
    'Walking: 30 minutes daily at a moderate pace to help boost a sluggish metabolism',
    'Low-impact aerobics: cycling or swimming for 20–30 min, 3–5 days/week',
    'Yoga: gentle poses including Sarvangasana (shoulder stand) may support thyroid function',
    'Strength training: light weights 2–3x/week to improve metabolic rate and energy',
    'Short 5-minute walks every hour — avoid prolonged inactivity',
    'Gradually increase intensity as energy improves with treatment',
    'Pranayama/breathing exercises to reduce fatigue and improve oxygenation',
  ],
  hyperthyroid: [
    'Low-impact activities only: gentle walking, slow-paced swimming',
    'Avoid intense cardio and heavy weightlifting — both raise heart rate excessively',
    'Restorative yoga: focus on relaxation poses; avoid inversions and power yoga',
    'Tai Chi or Qi Gong: gentle movement to reduce anxiety and palpitations',
    'Short sessions (15–20 min) with adequate rest between activities',
    'Monitor heart rate during exercise — stop if palpitations or dizziness occur',
    'Daily stretching and flexibility exercises for joint and muscle health',
  ],
  normal: [
    'Aerobic exercise: 150 minutes of moderate-intensity activity per week (WHO guideline)',
    'Strength training: 2–3 sessions/week targeting major muscle groups',
    'Yoga or Pilates: 2x/week for core strength and stress management',
    'Swimming or cycling: excellent full-body low-impact options',
    'Brisk walking: 30 minutes daily keeps metabolism and cardiovascular health optimal',
    'Maintain a healthy BMI through balanced diet and regular physical activity',
    'Annual thyroid screening recommended even with a normal result',
  ],
};

// â”€â”€ Condition colour palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CONDITION_COLORS = {
  hypothyroid: [52, 100, 180],
  hyperthyroid: [200, 80, 60],
  normal: [40, 140, 80],
};

function detectCondition(label) {
  if (!label) return 'normal';
  const l = label.toLowerCase();
  if (l.includes('hypo')) return 'hypothyroid';
  if (l.includes('hyper')) return 'hyperthyroid';
  return 'normal';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

// â”€â”€ Fetch AI-generated content from backend Groq endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchGroqContent(result, formData) {
  try {
    const body = {
      condition: result?.result_label || 'thyroid disorder',
      age: formData?.age ? Number(formData.age) : null,
      sex: formData?.sex || null,
      tsh: formData?.TSH ? Number(formData.TSH) : null,
      t3: formData?.T3 ? Number(formData.T3) : null,
      tt4: formData?.TT4 ? Number(formData.TT4) : null,
      t4u: formData?.T4U ? Number(formData.T4U) : null,
      fti: formData?.FTI ? Number(formData.FTI) : null,
      on_thyroxine: formData?.on_thyroxine === 'Yes',
      on_antithyroid_medication: formData?.on_antithyroid_medication === 'Yes',
      thyroid_surgery: formData?.thyroid_surgery === 'Yes',
      pregnant: formData?.pregnant === 'Yes',
      sick: formData?.sick === 'Yes',
    };

    const resp = await fetch(`${API_BASE_URL}/rag/generate-report-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.content || null;
  } catch {
    return null;
  }
}

// â”€â”€ Main export (async) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function generatePDF(result, formData) {
  // 1. Fetch AI-generated diet + hospital content from Groq via backend
  const aiContent = await fetchGroqContent(result, formData);

  const condition = detectCondition(result?.result_label);
  const color = CONDITION_COLORS[condition];

  // Resolve diet data: AI content preferred, fallback to static
  const dietRaw = aiContent?.diet || {};
  const diet = {
    recommended: dietRaw.recommended?.length ? dietRaw.recommended : FALLBACK_DIET[condition].recommended,
    avoid: dietRaw.avoid?.length ? dietRaw.avoid : FALLBACK_DIET[condition].avoid,
    tips: dietRaw.tips?.length ? dietRaw.tips : FALLBACK_DIET[condition].tips,
  };

  // Resolve hospitals: AI content preferred, fallback to static
  const hospitals = aiContent?.hospitals?.length ? aiContent.hospitals : FALLBACK_HOSPITALS;

  // Resolve exercises: AI content preferred, fallback to static
  const exercises = aiContent?.exercises?.length ? aiContent.exercises : FALLBACK_EXERCISES[condition];

  // â”€â”€ Build PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // â”€â”€ Header banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFillColor(...color);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ThyroRAG', margin, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Thyroid Disease Detection & Analysis Report', margin, 20);
  const reportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Report Date: ${reportDate}`, pageWidth - margin, 20, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  let y = 36;

  function sectionTitle(title, col = [30, 30, 30]) {
    doc.setDrawColor(...col);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...col);
    doc.text(title.toUpperCase(), margin, y);
    doc.setTextColor(0, 0, 0);
    y += 7;
  }

  function checkNewPage(needed = 20) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  }

  // â”€â”€ 1. Patient Information â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionTitle('1. Patient Information', [50, 50, 120]);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ['Full Name', formData?.fullName || 'N/A'],
      ['Date of Birth', formatDate(formData?.dob)],
      ['Age', formData?.age ? `${formData.age} years` : 'N/A'],
      ['Sex', formData?.sex === 'M' ? 'Male' : formData?.sex === 'F' ? 'Female' : 'N/A'],
      ['Weight', formData?.weight ? `${formData.weight} kg` : 'N/A'],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, textColor: [80, 80, 80] },
      1: { cellWidth: contentWidth - 60 },
    },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  // â”€â”€ 2. Lab Values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  checkNewPage(40);
  sectionTitle('2. Laboratory Test Results', [50, 50, 120]);
  autoTable(doc, {
    startY: y,
    head: [['Test', 'Value', 'Normal Range']],
    body: [
      ['TSH (Thyroid Stimulating Hormone)', formData?.TSH || 'N/A', '0.4 â€“ 4.0 mIU/L'],
      ['T3 (Triiodothyronine)', formData?.T3 || 'N/A', '0.8 â€“ 2.0 ng/mL'],
      ['TT4 (Total Thyroxine)', formData?.TT4 || 'N/A', '5.0 â€“ 12.0 Âµg/dL'],
      ['T4U (T4 Uptake)', formData?.T4U || 'N/A', '0.85 â€“ 1.15'],
      ['FTI (Free Thyroxine Index)', formData?.FTI || 'N/A', '6.0 â€“ 10.5'],
      ['TBG (Thyroxine Binding Globulin)', formData?.TBG || 'N/A', '13 â€“ 39 Âµg/mL'],
    ],
    theme: 'striped',
    headStyles: { fillColor: color, textColor: 255, fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: contentWidth - 120 },
    },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  // â”€â”€ 3. Medical History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  checkNewPage(40);
  sectionTitle('3. Medical History & Symptoms', [50, 50, 120]);
  const boolFields = [
    ['on_thyroxine', 'On Thyroxine Medication'],
    ['on_antithyroid_medication', 'On Antithyroid Medication'],
    ['thyroid_surgery', 'Previous Thyroid Surgery'],
    ['I131_treatment', 'I131 Treatment'],
    ['pregnant', 'Pregnant'],
    ['sick', 'Currently Sick'],
    ['goitre', 'Goitre (Enlarged Thyroid)'],
    ['tumor', 'Tumor'],
    ['lithium', 'Taking Lithium'],
    ['psych', 'Psychiatric History'],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Condition / Medication', 'Status']],
    body: boolFields.map(([key, label]) => [label, formData?.[key] === 'Yes' ? 'Yes' : 'No']),
    theme: 'striped',
    headStyles: { fillColor: color, textColor: 255, fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: contentWidth - 130, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        data.cell.styles.textColor = data.cell.raw === 'Yes' ? [180, 50, 50] : [50, 130, 50];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // â”€â”€ 4. AI Prediction Result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  checkNewPage(40);
  sectionTitle('4. AI Prediction Result', [50, 50, 120]);

  doc.setFillColor(...color.map(c => Math.min(255, c + 160)));
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');
  doc.setFillColor(...color);
  doc.roundedRect(margin, y, 6, 18, 3, 0, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text('AI Diagnosis:', margin + 12, y + 7);
  doc.setFontSize(13);
  doc.text(result?.result_label || 'N/A', margin + 55, y + 7);
  if (result?.confidence) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, margin + 12, y + 14);
  }
  doc.setTextColor(0, 0, 0);
  y += 24;

  if (result?.probabilities && Object.keys(result.probabilities).length > 0) {
    checkNewPage(35);
    autoTable(doc, {
      startY: y,
      head: [['Condition', 'Probability']],
      body: Object.entries(result.probabilities).map(([k, v]) => [k, `${(v * 100).toFixed(1)}%`]),
      theme: 'grid',
      headStyles: { fillColor: color, textColor: 255, fontSize: 10 },
      styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // â”€â”€ 5. AI-Generated Diet Recommendations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const condLabel = result?.result_label || 'Thyroid Disorder';

  // ── 5. Clinical Interpretation & Key Reasons ─────────────────────────────
  checkNewPage(50);
  sectionTitle('5. Clinical Interpretation & Key Reasons', [50, 110, 70]);

  if (result?.clinical_interpretation) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const interpLines = doc.splitTextToSize(result.clinical_interpretation, contentWidth);
    doc.text(interpLines, margin, y);
    y += interpLines.length * 5.5 + 4;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Clinical interpretation not available.', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
  }

  if (result?.key_reasons && result.key_reasons.length > 0) {
    checkNewPage(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 110, 50);
    doc.text('Key Factors Influencing This Prediction:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    for (const reason of result.key_reasons) {
      checkNewPage(10);
      const rLines = doc.splitTextToSize(`\u2022 ${reason}`, contentWidth - 4);
      doc.text(rLines, margin + 3, y);
      y += rLines.length * 5.5;
    }
    y += 4;
  }

  // ── 6. Exercise Recommendations ───────────────────────────────────────────
  checkNewPage(50);
  sectionTitle(`6. Exercise Recommendations \u2014 ${condLabel}`, [80, 50, 140]);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Exercise programme tailored to your condition (AI personalised):', margin, y);
  y += 6;
  for (const ex of exercises) {
    checkNewPage(10);
    const exLines = doc.splitTextToSize(`\u2022 ${ex}`, contentWidth - 4);
    doc.text(exLines, margin + 3, y);
    y += exLines.length * 5.5;
  }
  y += 4;

  // ── 7. AI-Generated Diet Recommendations ─────────────────────────────────
  checkNewPage(50);
  sectionTitle(`7. Diet Recommendations â€“ ${condLabel}  (AI Generated)`, color);

  const writeList = (items, bulletColor) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    for (const item of items) {
      checkNewPage(10);
      const lines = doc.splitTextToSize(`â€¢ ${item}`, contentWidth - 4);
      doc.text(lines, margin + 3, y);
      y += lines.length * 5.5;
    }
  };

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 130, 60);
  doc.text('Recommended Foods & Nutrients:', margin, y);
  y += 6;
  writeList(diet.recommended);

  y += 4;
  checkNewPage(20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 50, 50);
  doc.text('Foods to Avoid / Limit:', margin, y);
  y += 6;
  writeList(diet.avoid);

  y += 4;
  checkNewPage(20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 180);
  doc.text('Dietary & Lifestyle Tips:', margin, y);
  y += 6;
  writeList(diet.tips);

  // â”€â”€ 6. Hyderabad Hospitals (AI Generated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  checkNewPage(60);
  sectionTitle('8. Recommended Hospitals in Hyderabad  (AI Generated)', [80, 60, 130]);

  autoTable(doc, {
    startY: y,
    head: [['Hospital', 'Area', 'Specialty', 'Contact']],
    body: hospitals.map(h => [h.name || '', h.area || '', h.specialty || '', h.contact || '']),
    theme: 'striped',
    headStyles: { fillColor: [80, 60, 130], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 60 },
      3: { cellWidth: contentWidth - 150 },
    },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  // â”€â”€ 7. Disclaimer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  checkNewPage(30);
  doc.setFillColor(255, 248, 220);
  doc.setDrawColor(200, 160, 30);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 100, 0);
  doc.text('DISCLAIMER', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const dLines = doc.splitTextToSize(
    'This report is AI-generated by ThyroRAG for informational and educational purposes only. ' +
    'It is NOT a substitute for professional medical advice, diagnosis, or treatment. ' +
    'Diet recommendations and hospital information are AI-generated and should be verified with a qualified healthcare professional.',
    contentWidth - 8
  );
  doc.text(dLines, margin + 4, y + 12);
  doc.setTextColor(0, 0, 0);

  // â”€â”€ Footer on every page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `ThyroRAG AI Report  |  Page ${i} of ${totalPages}  |  ${reportDate}`,
      pageWidth / 2, pageHeight - 8, { align: 'center' }
    );
  }

  const filename = `ThyroRAG_Report_${(formData?.fullName || 'Patient').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

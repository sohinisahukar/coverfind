/**
 * synonyms.js
 *
 * Maps common layperson symptom/condition queries to the medical keywords
 * that actually exist in the clinics database.
 *
 * Usage: call expandQuery(q) to get a DB-friendly search string.
 *
 * Two levels of matching:
 *   1. Phrase-first — "food poison" checked before individual words
 *   2. Term-level   — remaining unmatched words checked individually
 *
 * The returned string is space-separated; the SQL layer ANDs each token.
 * We keep expansions to 1-2 terms so we don't over-constrain the AND.
 */

/**
 * Phrase → replacement query string.
 * Keyed by lowercase phrase; value is the DB search string to use instead.
 */
const PHRASE_MAP = {
  'food poison':         'nausea vomiting',
  'food poisoning':      'nausea vomiting',
  'food allergy':        'allergy',
  'food allergies':      'allergy',
  'upset stomach':       'stomach nausea',
  'stomach ache':        'stomach pain',
  'stomach pain':        'stomach pain',
  'stomach bug':         'nausea vomiting',
  'tummy ache':          'stomach nausea',
  'sore throat':         'sore throat',
  'strep throat':        'sore throat',
  'sinus infection':     'sinus infection',
  'ear infection':       'ear infection',
  'eye infection':       'infection',
  'skin infection':      'skin infection',
  'skin rash':           'skin rash',
  'back pain':           'back pain',
  'knee pain':           'knee pain',
  'chest pain':          'chest pain',
  'neck pain':           'neck pain',
  'joint pain':          'joint pain',
  'muscle pain':         'muscle pain',
  'high blood pressure': 'blood pressure hypertension',
  'blood pressure':      'blood pressure',
  'panic attack':        'mental health',
  'mental health':       'mental health',
  'substance abuse':     'substance abuse',
  'drug addiction':      'substance abuse',
  'alcohol addiction':   'substance abuse',
  'birth control':       'women',
  'prenatal care':       'women',
  'ob gyn':              'ob',
  'women health':        'women',
  'eye exam':            'vision',
  'eye care':            'vision',
  'dental care':         'dental',
  'tooth pain':          'dental',
  'teeth cleaning':      'dental',
  'sports injury':       'sports injury',
  'broken bone':         'fracture broken',
  'weight loss':         'wellness',
  'annual checkup':      'checkup physical',
  'annual physical':     'checkup physical',
  'std test':            'uti infection',
  'std testing':         'uti infection',
  'sti test':            'uti infection',
  'urinary tract':       'uti',
};

/**
 * Single term → replacement query string.
 * Applied only when no phrase match was found for the full query.
 */
const TERM_MAP = {
  // Skin
  acne:           'skin rash',
  pimple:         'skin rash',
  pimples:        'skin rash',
  eczema:         'skin rash',
  psoriasis:      'skin rash',
  hives:          'skin rash allergies',
  rosacea:        'skin',
  dermatitis:     'skin rash',
  // Stomach / GI
  poison:         'nausea vomiting',
  poisoning:      'nausea vomiting',
  diarrhea:       'stomach',
  constipation:   'stomach',
  bloating:       'stomach',
  heartburn:      'stomach',
  reflux:         'stomach',
  nauseous:       'nausea',
  vomit:          'vomiting',
  // Respiratory
  coughing:       'cough',
  congestion:     'cold',
  runny:          'cold',
  sinuses:        'sinus',
  sinus:          'sinus',
  bronchitis:     'cough breathing',
  pneumonia:      'breathing infection',
  asthmatic:      'asthma',
  // Pain
  migraine:       'headache pain',
  migraines:      'headache pain',
  sprained:       'sprain',
  fractures:      'fracture broken',
  // Mental health
  anxiety:        'mental health',
  depression:     'mental health',
  stress:         'mental health',
  insomnia:       'mental health',
  therapy:        'behavioral health',
  counseling:     'behavioral health',
  // Chronic conditions
  diabetic:       'diabetes',
  hypertension:   'blood pressure',
  cholesterol:    'cholesterol',
  thyroid:        'checkup',
  // Infections
  infected:       'infection',
  abscess:        'infection',
  wound:          'wound',
  cut:            'cut wound',
  laceration:     'cut wound',
  // Vaccines / preventive
  vaccine:        'vaccine',
  vaccination:    'vaccination',
  immunization:   'immunization',
  flu:            'flu vaccine',
  covid:          'flu vaccination',
  booster:        'vaccination',
  // Dental
  tooth:          'dental',
  teeth:          'dental',
  gum:            'dental',
  cavity:         'dental',
  // Eye
  eye:            'vision',
  eyes:           'vision',
  glasses:        'vision optometry',
  contacts:       'vision optometry',
  // Women's health
  pregnancy:      'women ob',
  pregnant:       'women ob',
  prenatal:       'women ob',
  gynecology:     'ob',
  // Other
  hangover:       'nausea headache',
  fatigue:        'fatigue',
  tired:          'fatigue',
  dizzy:          'headache',
  dizziness:      'headache',
  uti:            'uti',
  std:            'uti infection',
  sti:            'uti infection',
  sports:         'sports',
  rehab:          'rehab',
  rehabilitation: 'rehabilitation',
};

/**
 * Expand a raw user query string into DB-friendly search terms.
 *
 * @param {string} q  Raw user input (e.g. "food poison")
 * @returns {string}  Expanded query (e.g. "nausea vomiting")
 */
export function expandQuery(q) {
  if (!q || !q.trim()) return q;

  const lower = q.trim().toLowerCase();

  // 1. Check for exact phrase match first (longest wins)
  if (PHRASE_MAP[lower]) {
    return PHRASE_MAP[lower];
  }

  // 2. Check for partial phrase match (query contains a known phrase)
  for (const [phrase, expansion] of Object.entries(PHRASE_MAP)) {
    if (lower.includes(phrase)) {
      return expansion;
    }
  }

  // 3. Expand individual terms
  const words = lower.split(/\s+/).filter(Boolean);
  const expanded = words.map(word => TERM_MAP[word] || word);

  // If any term was expanded, return the expanded version.
  // Use only the first expansion token per term to avoid over-constraining AND.
  const result = expanded.map(e => e.split(' ')[0]).join(' ');
  return result !== lower ? result : q;
}

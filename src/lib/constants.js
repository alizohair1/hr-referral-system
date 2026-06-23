export const STAGES = {
  inbox:            { label: 'Inbox',            color: '#6b7280' },
  inprocess:        { label: 'In process',       color: '#3b5bff' },
  background_check: { label: 'Background check', color: '#c98a16' },
  decision_pending: { label: 'Decision pending', color: '#7c3aed' },
  accepted:         { label: 'Accepted',         color: '#1f7a5a' },
  rejected:         { label: 'Rejected',         color: '#c8462e' },
  sent_to_bl:       { label: 'Sent to BL',       color: '#0891b2' }, // virtual stage for display only
}

export const PIPELINE = ['inprocess', 'background_check', 'decision_pending', 'accepted', 'rejected']

export const FIELD_TYPES = {
  short_text: { label: 'Short text' },
  long_text:  { label: 'Long text' },
  number:     { label: 'Number' },
  dropdown:   { label: 'Dropdown (choose one)', hasOptions: true },
  checkboxes: { label: 'Multiple choice (checkboxes)', hasOptions: true },
  date:       { label: 'Date' },
  yesno:      { label: 'Yes / No' },
}

// ─── OJE rating field IDs (used for auto score calculation) ──────────────────
export const OJE_RATING_IDS = [
  'oje_grasp', 'oje_energy', 'oje_hygiene',
  'oje_listening', 'oje_patience', 'oje_teamwork', 'oje_willingness',
]
// 7 ratings × max 5 = 35 raw → scaled to 40: multiply raw sum by (40/35)
export const OJE_SCORE_MAX     = 40
export const OJE_SCORE_FORMULA = (rawSum) => Math.round((rawSum / 35) * 40 * 10) / 10

// ─── Interview rating field IDs (used for auto score calculation) ─────────────
export const IV_RATING_IDS = [
  'iv_grooming', 'iv_interpersonal', 'iv_integrity',
  'iv_growth_mindset', 'iv_customer',
]
// 5 ratings × max 5 = 25 raw → scaled to 15: multiply raw sum by (15/25) = 0.6
export const IV_SCORE_MAX     = 15
export const IV_SCORE_FORMULA = (rawSum) => Math.round((rawSum / 25) * 15 * 10) / 10

// ─── OJE FORM ────────────────────────────────────────────────────────────────
export const OJE_FIELDS = [
  { id: 'oje_date',        label: 'Date of OJE',   type: 'date',     required: true },
  {
    id: 'oje_designation', label: 'Designation',   type: 'dropdown', required: true,
    options: ['Crew (9 Hours)', 'Crew (6 Hours)', 'Delivery Rider (9 Hours)', 'Delivery Rider (6 Hours)'],
  },
  {
    id: 'oje_branch',      label: 'Branch',         type: 'dropdown', required: true,
    options: ['Phase 6', 'CC', 'Bahria Town', 'Cloud Kitchen', 'Valencia', 'Johar Town', 'Emporium'],
  },
  { id: 'oje_grasp',       label: 'The crew member was able to grasp things quickly and learn',                         type: 'rating', required: true },
  { id: 'oje_energy',      label: 'The crew member was able to show energy and enthusiasm for the job',                 type: 'rating', required: true },
  { id: 'oje_hygiene',     label: 'The individual had good personal hygiene',                                           type: 'rating', required: true },
  { id: 'oje_listening',   label: 'The individual had good listening skills',                                           type: 'rating', required: true },
  { id: 'oje_patience',    label: 'The individual had patience to learn',                                               type: 'rating', required: true },
  { id: 'oje_teamwork',    label: 'The individual interacted well with other team members and management',              type: 'rating', required: true },
  { id: 'oje_willingness', label: 'The individual showed good willingness to improve themselves and their performance', type: 'rating', required: true },
  { id: 'oje_overall',     label: 'Overall Score (out of 40)',  type: 'auto_score', required: false }, // auto-calculated
  { id: 'oje_comments',    label: 'Comments',                   type: 'long_text',  required: true },
  { id: 'oje_email',       label: 'Email Address',              type: 'short_text', required: true },
]

// ─── INTERVIEW FORM ───────────────────────────────────────────────────────────
export const INTERVIEW_FIELDS = [
  { id: 'iv_contact',           label: 'Contact #',                  type: 'short_text', required: true },
  { id: 'iv_grooming',          label: 'Grooming',                   type: 'rating',     required: true },
  { id: 'iv_interpersonal',     label: 'Interpersonal Savvy',        type: 'rating',     required: true },
  { id: 'iv_integrity',         label: 'Integrity and Trust',        type: 'rating',     required: true },
  { id: 'iv_growth_mindset',    label: 'Growth Mindset (HDNA)',      type: 'rating',     required: true },
  { id: 'iv_customer',          label: 'Customer Centricity (HDNA)', type: 'rating',     required: true },
  { id: 'iv_total_marks',       label: 'Total Marks (out of 15)',    type: 'auto_score', required: false }, // auto-calculated
  { id: 'iv_section',           label: 'Section',                    type: 'short_text', required: true },
  { id: 'iv_employment_type',   label: 'Full Time / Part Time',      type: 'dropdown',   required: true, options: ['Full Time', 'Part Time'] },
  { id: 'iv_recommended_branch',label: 'Recommended Branch',         type: 'dropdown',   required: true, options: ['Phase 6', 'CC', 'Bahria Town', 'Cloud Kitchen', 'Valencia', 'Johar Town', 'Emporium'] },
  { id: 'iv_position',          label: 'Position',                   type: 'dropdown',   required: true, options: ['Crew', 'Delivery Boy', 'Helper', 'Shift Manager'] },
  { id: 'iv_education',         label: 'Education',                  type: 'dropdown',   required: true, options: ['Under Matric', 'Matric', 'Inter', 'Bachelor', 'Masters'] },
  { id: 'iv_comments',          label: 'Comments',                   type: 'long_text',  required: true },
  { id: 'iv_additional',        label: 'Additional Remarks',         type: 'long_text',  required: true },
]

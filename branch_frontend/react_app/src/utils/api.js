// src/utils/api.js
// Session-based auth for the Firebase-backed backend.
// All API calls use Vite proxy to the Flask backend.

import axios from 'axios'

const TOKEN_KEY = 'atm_auth_token'
export const saveToken  = (t) => localStorage.setItem(TOKEN_KEY, t)
export const getToken   = ()  => localStorage.getItem(TOKEN_KEY) || ''
export const clearToken = ()  => localStorage.removeItem(TOKEN_KEY)

const api = axios.create({
  baseURL: '',
  timeout: 15000,
  withCredentials: true,
})

api.interceptors.request.use(cfg => {
  const t = getToken()
  if (t) cfg.headers['X-Auth-Token'] = t
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status
    if (status === 401) {
      clearToken()
      err.userMessage = err.response?.data?.error || 'Session expired. Please log in again.'
    } else if (status === 403) {
      err.userMessage = err.response?.data?.error
        || 'You do not have permission to do that. Ask an admin for access.'
    } else if (status === 429) {
      err.userMessage = err.response?.data?.error
        || 'Too many attempts. Please wait a minute and try again.'
    } else {
      err.userMessage = err.response?.data?.error || 'Something went wrong. Please try again.'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────
export const loginUser = async (username, password) => {
  const res = await api.post('/auth/login', { username, password })
  saveToken(res.data.user_id || '')
  return {
    user: {
      username: res.data.user_id,
      user_id: res.data.user_id,
    },
  }
}

export const logoutUser = async () => {
  try {
    await api.post('/auth/logout', {})
  } finally {
    clearToken()
  }
}

export const fetchMe = async () => {
  const res = await api.get('/auth/me')
  return {
    user: {
      username: res.data.user_id,
      user_id: res.data.user_id,
    },
  }
}

// ── Dashboard ─────────────────────────────────────────────
export const fetchPrediction = ({ date, atmFilter, isHoliday }) =>
  api.post('/predict', {
    pred_date:  date,
    atm_select: atmFilter,
    is_holiday: isHoliday,
  }).then(r => r.data)

export const downloadWeeklyReport = ({ weekStart }) =>
  api.get('/report/weekly', {
    params: { week_start: weekStart },
    responseType: 'blob',
  }).then(res => {
    const blob = new Blob([res.data], {
      type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ATM_CashPredict_Report_${weekStart}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  })

export const fetchHistory      = (atm, days = 90) =>
  api.get('/history',        { params: { atm, days } }).then(r => r.data)

export const fetchAtmStats     = () =>
  api.get('/atm_stats').then(r => r.data)

export const fetchMissingDates = (atm) =>
  api.get('/missing_dates',  { params: { atm } }).then(r => r.data)

export const fetchHealth       = () =>
  api.get('/health').then(r => r.data)

// ── Poya Day ──────────────────────────────────────────────
export const fetchPoyaCalendar = (year) =>
  api.get('/poya/calendar',         { params: { year } }).then(r => r.data)

export const fetchPoyaCheck    = (date) =>
  api.get('/poya/check',            { params: { date } }).then(r => r.data)

export const fetchPoyaPredict  = ({ date, atmFilter, isHoliday }) =>
  api.post('/poya/predict', {
    pred_date:  date,
    atm_select: atmFilter,
    is_holiday: isHoliday,
  }).then(r => r.data)

export const fetchPoyaYearPredictions = (year) =>
  api.get('/poya/year_predictions', { params: { year } }).then(r => r.data)

// ── Special Days (Christmas, New Year, Diwali) ────────────
export const fetchSpecialCheck   = (date) =>
  api.get('/special/check',   { params: { date } }).then(r => r.data)

export const fetchSpecialPredict = ({ date, atmFilter, isHoliday }) =>
  api.post('/special/predict', {
    pred_date:  date,
    atm_select: atmFilter,
    is_holiday: isHoliday,
  }).then(r => r.data)

export const fetchChristmasDates = (year) =>
  api.get('/special/christmas', { params: { year } }).then(r => r.data)

// ── Sinhala & Tamil New Year ──────────────────────────────
export const fetchSinhalaNewYear  = (year) =>
  api.get('/special/sinhala_new_year', { params: { year } }).then(r => r.data)

export const fetchSinhalaPredict  = ({ date, atmFilter, isHoliday }) =>
  api.post('/special/sinhala_predict', {
    pred_date:  date,
    atm_select: atmFilter,
    is_holiday: isHoliday,
  }).then(r => r.data)

// ── 7-Day Forecast ────────────────────────────────────────
export const fetchWeekForecast = ({ startDate, atmFilter }) =>
  api.post('/forecast/week', {
    start_date: startDate,
    atm_select: atmFilter || 'all',
  }).then(r => r.data)

// ── Low Cash Alerts ───────────────────────────────────────
export const fetchCashLevels  = () =>
  api.get('/alerts/cash_levels').then(r => r.data)

export const saveCashLevels   = (cashLevels) =>
  api.post('/alerts/cash_levels', { cash_levels: cashLevels }).then(r => r.data)

export const fetchAlerts      = ({ startDate, days, cashLevels }) =>
  api.post('/alerts/check', {
    start_date:  startDate,
    days:        days || 7,
    cash_levels: cashLevels,
  }).then(r => r.data)

/* branch_frontend/static/js/dashboard.js */
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let histChartInst = null;

function fmt(n){return '₹'+Math.round(n).toLocaleString('en-IN')}
function fmtShort(n){return n>=100000?'₹'+(n/100000).toFixed(1)+'L':'₹'+(n/1000).toFixed(0)+'K'}

/* ── PREDICTION ─────────────────────────────────────── */
async function runPrediction(){
  const dateVal = document.getElementById('pred_date').value;
  if(!dateVal){alert('Please select a date');return}
  document.getElementById('pred_empty').style.display='none';
  document.getElementById('pred_loader').style.display='flex';
  document.getElementById('atm_results').style.display='none';
  document.getElementById('summary_stats').style.display='none';

  const payload = {
    pred_date:  dateVal,
    is_holiday: document.getElementById('is_holiday').value,
    atm_select: document.getElementById('atm_select').value,
    is_salary:  document.getElementById('salary_toggle').checked ? '1' : '0'
  };

  try {
    const resp = await fetch('/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data = await resp.json();
    document.getElementById('pred_loader').style.display='none';
    if(data.error){
      showEmpty(`⚠️ ${data.error}`); return;
    }
    renderResults(data);
  } catch(e){
    document.getElementById('pred_loader').style.display='none';
    showEmpty(`Connection error: ${e.message}`);
  }
}

function showEmpty(msg){
  const el = document.getElementById('pred_empty');
  el.innerHTML = `<div class="empty-icon">⚠️</div><div class="empty-title">${msg}</div>`;
  el.style.display='block';
}

function renderResults(data){
  const preds  = data.predictions;
  const maxP50 = Math.max(...preds.map(p=>p.predicted));
  const total  = preds.reduce((s,p)=>s+p.predicted,0);
  const peak   = preds.reduce((a,b)=>a.predicted>b.predicted?a:b);
  const d      = new Date(data.date+'T12:00:00');

  const html = preds.map(p=>{
    const pct = Math.round(p.predicted/maxP50*100);
    return `<div class="atm-row">
      <div>
        <div class="atm-name">${p.atm}</div>
        <div style="margin-top:3px"><span class="zone-pill zone-${p.zone}">${p.zone}</span></div>
      </div>
      <div>
        <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div style="font-size:10px;color:var(--ink3);margin-top:3px">${pct}% of network peak</div>
      </div>
      <div>
        <div class="atm-amount">${fmtShort(p.predicted)}</div>
        <div class="atm-band">P50</div>
      </div>
      <div>
        <div class="atm-amount" style="color:var(--ink3)">${fmtShort(p.p90)}</div>
        <div class="atm-band">with buffer</div>
      </div>
    </div>`}).join('');

  document.getElementById('atm_results').innerHTML = html;
  document.getElementById('atm_results').style.display='flex';

  document.getElementById('stat_total').textContent   = fmtShort(total);
  document.getElementById('stat_peak').textContent    = peak.atm.replace(' ATM','');
  document.getElementById('stat_peak_val').textContent= fmt(peak.predicted);
  document.getElementById('stat_daytype').textContent = data.is_holiday ? '🔴 Holiday' : '🟢 Working';
  document.getElementById('stat_dow').textContent     = DAY_NAMES[d.getDay()];
  document.getElementById('summary_stats').style.display='block';

  const bandHtml = preds.map(p=>{
    const w50=Math.round(p.predicted/maxP50*100),w90=Math.round(p.p90/maxP50*100);
    return `<div class="band-row">
      <div class="band-label">${p.atm.replace(' ATM','')}</div>
      <div class="band-bar-wrap">
        <div class="band-bar-p90" style="width:${w90}%"></div>
        <div class="band-bar-p50" style="width:${w50}%"></div>
      </div>
      <div class="band-val">${fmtShort(p.predicted)}</div>
    </div>`}).join('');
  document.getElementById('band_chart').innerHTML = bandHtml;
}

/* ── CHART TAB ──────────────────────────────────────── */
async function drawHistChart(){
  const atm = document.getElementById('chart_atm').value;
  const ctx  = document.getElementById('hist_chart').getContext('2d');
  if(histChartInst) histChartInst.destroy();
  try {
    const resp = await fetch(`/history?atm=${encodeURIComponent(atm)}&days=90`);
    const data = await resp.json();
    histChartInst = new Chart(ctx,{
      type:'line',
      data:{labels:data.dates,datasets:[{
        label:'Amount Withdrawn (₹)',data:data.values,
        borderColor:'#1B4FD8',backgroundColor:'rgba(27,79,216,0.07)',
        borderWidth:1.5,pointRadius:0,fill:true,tension:0.3
      }]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'₹'+Math.round(c.raw).toLocaleString('en-IN')}}},
        scales:{
          x:{ticks:{maxTicksLimit:10,font:{size:10}},grid:{display:false}},
          y:{ticks:{callback:v=>'₹'+(v/100000).toFixed(1)+'L',font:{size:10}},grid:{color:'rgba(0,0,0,0.04)'}}
        }}
    });
  } catch(e){console.log('History API unavailable',e)}
}

/* ── ATM STATS TAB ──────────────────────────────────── */
async function loadAtmStats(){
  try {
    const resp = await fetch('/atm_stats');
    const data = await resp.json();
    const html = Object.entries(data).map(([atm,d])=>`
      <div class="atm-stat-card">
        <div class="atm-stat-name">${atm} <span class="zone-pill zone-${d.zone}" style="float:right">${d.zone}</span></div>
        <div class="atm-stat-row"><span>Avg daily withdrawal</span><span>${fmtShort(d.mean)}</span></div>
        <div class="atm-stat-row"><span>Historical max</span><span>${fmtShort(d.max)}</span></div>
        <div class="atm-stat-row"><span>Missing dates filled</span><span>${d.missing}</span></div>
        <div class="atm-stat-row"><span>Model sMAPE</span><span>${d.smape}%</span></div>
        <div class="atm-stat-row"><span>Improvement</span><span style="color:${d.improvement>0?'var(--success)':'var(--danger)'}">${d.improvement>0?'▲ +':'▼ '}${Math.abs(d.improvement).toFixed(1)}%</span></div>
      </div>`).join('');
    document.getElementById('atm_stats_grid').innerHTML = html;
  } catch(e){console.log('Stats API unavailable',e)}
}

/* ── MISSING DATES TAB ──────────────────────────────── */
async function loadMissing(){
  const atm = document.getElementById('missing_atm').value;
  try {
    const resp = await fetch(`/missing_dates?atm=${encodeURIComponent(atm)}`);
    const data = await resp.json();
    document.getElementById('missing_list').innerHTML =
      data.dates.map(d=>`<span class="missing-pill">${d}</span>`).join('');
    document.getElementById('missing_count').textContent = `${data.count} dates filled`;
  } catch(e){
    document.getElementById('missing_list').innerHTML =
      '<em style="color:var(--ink3);font-size:12px">Connect to Flask API to view</em>';
  }
}

/* ── TAB SWITCHER ───────────────────────────────────── */
function switchTab(id,btn){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab_'+id).classList.add('active');
  btn.classList.add('active');
  if(id==='chart') drawHistChart();
}

/* ── INIT ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('pred_date').value = new Date().toISOString().split('T')[0];
  loadAtmStats();
  loadMissing();
});

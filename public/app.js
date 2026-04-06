// ═══════════════════════════════════════════════════
// StockBot Pro v3 - Global AI Trading Intelligence
// ═══════════════════════════════════════════════════

const API = window.location.origin;
let currentReport = null;
let allStocks = [];
let intelData = null;
let searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('fade-out');
        document.getElementById('app').classList.remove('hidden');
        init();
    }, 2200);
});

function init() {
    setupNav();
    setupSearch();
    setupButtons();
    updateTime();
    updateMarketStatus();
    loadWatchlist();
    loadExistingReport();
    setInterval(updateTime, 1000);
    setInterval(updateMarketStatus, 60000);
}

// ═══ NAVIGATION ═══
function setupNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchPage(item.dataset.page));
    });
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

function switchPage(name) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.querySelector(`[data-page="${name}"]`);
    if (navEl) navEl.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${name}`).classList.add('active');
    const titles = { dashboard:'Dashboard', intelligence:'🧠 Intelligence', news:'📰 News & Sentiment', global:'🌍 Global Markets', report:'📋 Daily Report', analyze:'🔍 Deep Analysis', watchlist:'⭐ Watchlist', signals:'🎯 Signals', trading:'💸 Paper Trading' };
    document.getElementById('page-title').textContent = titles[name] || name;
    document.getElementById('sidebar').classList.remove('open');
    
    // Auto-load portfolio when entering Paper Trading page
    if(name === 'trading') {
        if(typeof loadPortfolio === 'function') loadPortfolio();
    }
}

// ═══ GLOBAL SEARCH (Any stock, any country) ═══
function setupSearch() {
    const input = document.getElementById('stock-search');
    const results = document.getElementById('search-results');

    input.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (q.length < 1) { results.classList.remove('show'); return; }
        // Debounce: wait 300ms after user stops typing
        clearTimeout(searchTimer);
        searchTimer = setTimeout(async () => {
            try {
                const r = await fetch(`${API}/api/search/${encodeURIComponent(q)}`);
                const d = await r.json();
                if (d.success && d.data.length > 0) {
                    results.innerHTML = d.data.map(s => `<div class="search-result-item" data-symbol="${s.symbol}"><div><div class="search-result-symbol">${s.symbol} <span class="search-result-flag">${s.country||''}</span></div><div class="search-result-name">${s.name}</div></div><span class="search-result-sector">${s.exchange || s.type || ''}</span></div>`).join('');
                } else {
                    results.innerHTML = '<div class="search-result-item"><span class="search-result-name">No results found</span></div>';
                }
                results.classList.add('show');
                results.querySelectorAll('[data-symbol]').forEach(el => el.addEventListener('click', () => {
                    input.value = '';
                    results.classList.remove('show');
                    runAnalysis(el.dataset.symbol);
                }));
            } catch(e) {
                results.innerHTML = '<div class="search-result-item"><span class="search-result-name">Search failed</span></div>';
                results.classList.add('show');
            }
        }, 300);
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#search-container')) results.classList.remove('show'); });
}

// ═══ BUTTONS ═══
function setupButtons() {
    document.getElementById('btn-generate-report').addEventListener('click', generateReport);
    document.getElementById('btn-new-report').addEventListener('click', generateReport);
    document.getElementById('btn-first-report').addEventListener('click', generateReport);
    document.getElementById('btn-run-intel').addEventListener('click', runIntelligence);
    document.getElementById('btn-refresh-intel').addEventListener('click', runIntelligence);
    document.getElementById('btn-first-intel').addEventListener('click', runIntelligence);
    document.getElementById('btn-refresh-news').addEventListener('click', loadNews);
    document.getElementById('btn-first-news').addEventListener('click', loadNews);
    document.getElementById('btn-refresh-global').addEventListener('click', loadGlobalMarkets);
    document.getElementById('btn-first-global').addEventListener('click', loadGlobalMarkets);
    document.getElementById('btn-analyze').addEventListener('click', () => { const s = document.getElementById('analyze-symbol').value.trim(); if(s) runAnalysis(s); else showToast('⚠️','Enter stock symbol'); });
    document.getElementById('btn-analyze-quick').addEventListener('click', () => { switchPage('analyze'); document.getElementById('analyze-symbol').focus(); });
    document.getElementById('analyze-symbol').addEventListener('keypress', (e) => { if(e.key==='Enter'){ const s=e.target.value.trim(); if(s) runAnalysis(s); }});

    // Trade bindings
    const btnTradeBuy = document.getElementById('btn-trade-buy');
    if(btnTradeBuy) btnTradeBuy.addEventListener('click', () => handleTradeAction('BUY'));
    const btnTradeSell = document.getElementById('btn-trade-sell');
    if(btnTradeSell) btnTradeSell.addEventListener('click', () => handleTradeAction('SELL'));
}

// ═══ TIME & MARKET ═══
function updateTime() {
    const now = new Date();
    document.getElementById('header-time').textContent = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true, timeZone:'Asia/Kolkata' }) + ' IST';
}
function updateMarketStatus() {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const h = ist.getHours(), m = ist.getMinutes(), d = ist.getDay(), t = h*60+m;
    const wd = d>=1&&d<=5, open = wd && t>=555 && t<=930;
    const el = document.getElementById('market-status');
    el.innerHTML = open ? '<span class="status-dot open"></span><span class="status-text">Market Open</span>' :
        (wd && t<555) ? '<span class="status-dot"></span><span class="status-text">Pre-Market</span>' :
        '<span class="status-dot closed"></span><span class="status-text">Market Closed</span>';
}

// ═══ WATCHLIST ═══
async function loadWatchlist() {
    try { const r = await fetch(`${API}/api/watchlist`); const d = await r.json(); if(d.success) { allStocks=d.data; renderWatchlist(d.data); } } catch(e) {}
}
function renderWatchlist(stocks) {
    document.getElementById('watchlist-grid').innerHTML = stocks.map(s => `<div class="watchlist-card" onclick="runAnalysis('${s.symbol.replace('.NS','')}')" ><div><span class="watchlist-symbol">${s.symbol.replace('.NS','')}</span><div class="watchlist-name">${s.name}</div><span class="watchlist-sector">${s.sector}</span></div><button class="watchlist-action-btn" onclick="event.stopPropagation();runAnalysis('${s.symbol.replace('.NS','')}')">Analyze</button></div>`).join('');
}

// ═══ EXISTING REPORT ═══
async function loadExistingReport() {
    try { const r = await fetch(`${API}/api/report`); const d = await r.json(); if(d.success&&d.data) { currentReport=d.data; updateDashboard(d.data); renderReport(d.data); renderSignals(d.data); } } catch(e) {}
}

// ═══ GENERATE REPORT ═══
async function generateReport() {
    const btn = document.getElementById('btn-generate-report');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Analyzing...';
    showToast('📊','25+ stocks analyze ho rahe hain... 2-3 min lagenge');
    document.getElementById('report-content').innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div class="loading-text">🔍 Analyzing 25+ stocks...</div></div>';
    try {
        const r = await fetch(`${API}/api/report/generate`, { method: 'POST' }); const d = await r.json();
        if(d.success) { currentReport=d.data; updateDashboard(d.data); renderReport(d.data); renderSignals(d.data); showToast('✅',`Done! ${d.data.summary.buySignals} BUY, ${d.data.summary.sellSignals} SELL`); }
        else showToast('❌', d.error||'Failed');
    } catch(e) { showToast('❌','Connection failed'); }
    btn.disabled = false; btn.innerHTML = '<span class="action-icon">📋</span><span>Generate Report</span>';
}

// ═══ INTELLIGENCE SCAN ═══
async function runIntelligence() {
    showToast('🧠','Intelligence scan shuru...');
    document.getElementById('intel-content').innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div class="loading-text">🧠 Scanning news, global markets, policies...</div></div>';
    try {
        const r = await fetch(`${API}/api/intelligence`); const d = await r.json();
        if(d.success) { intelData = d.data; renderIntelligence(d.data); updateRiskUI(d.data.riskAssessment); showToast('✅',`Risk: ${d.data.riskAssessment.riskScore}/100`); }
        else showToast('❌', d.error||'Failed');
    } catch(e) { showToast('❌','Connection failed'); }
}

// ═══ RENDER INTELLIGENCE ═══
function renderIntelligence(data) {
    const risk = data.riskAssessment;
    const riskClass = risk.riskScore < 20 ? 'low' : risk.riskScore < 35 ? 'moderate' : risk.riskScore < 50 ? 'high' : risk.riskScore < 70 ? 'very-high' : 'extreme';
    const adviceClass = risk.riskScore < 35 ? 'safe' : risk.riskScore < 50 ? 'caution' : 'danger';
    let html = `<div class="risk-gauge"><div class="risk-score-big ${riskClass}">${risk.riskScore}</div><div class="risk-label-big">Risk Score / 100</div><div class="risk-bar"><div class="risk-bar-fill ${riskClass}" style="width:${risk.riskScore}%"></div></div><div class="risk-advice ${adviceClass}">${risk.tradingAdvice}</div></div>`;
    if(data.quickSummary?.length > 0) html += `<div class="quick-summary">${data.quickSummary.map(l=>`<div class="summary-line">${l}</div>`).join('')}</div>`;
    if(risk.riskFactors?.length > 0) html += `<div class="section-card" style="border:none;padding:0;background:none"><div class="section-header"><h2>⚠️ Risk Factors</h2></div><div class="risk-factor-list">${risk.riskFactors.map(f=>`<div class="risk-factor"><span class="risk-factor-dot ${f.level.toLowerCase()}"></span><span class="risk-factor-name">${f.factor}</span><span class="risk-factor-detail">${f.detail}</span></div>`).join('')}</div></div>`;
    if(data.newsSentiment?.blackSwanAlerts?.length > 0) html += `<div style="margin-top:20px"><h3>🦢 Black Swan Alerts</h3>${data.newsSentiment.blackSwanAlerts.map(a=>`<div class="alert-card critical"><div class="alert-card-header"><span class="alert-type critical">BLACK SWAN</span><span class="alert-date">${timeAgo(a.pubDate)}</span></div><div class="alert-description">${a.title}</div></div>`).join('')}</div>`;
    if(data.globalMarkets?.alerts?.length > 0) html += `<div style="margin-top:20px"><h3>🌍 Global Alerts</h3>${data.globalMarkets.alerts.map(a=>`<div class="global-alert ${a.severity?.toLowerCase()||'normal'}"><span class="global-alert-icon">${a.severity==='CRITICAL'?'🚨':'⚠️'}</span><span class="global-alert-text">${a.message}</span></div>`).join('')}</div>`;
    if(data.globalMarkets?.indices?.length > 0) html += `<div style="margin-top:20px"><div class="section-header" style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:16px"><h2>🌍 Global Markets</h2></div><div class="global-grid">${data.globalMarkets.indices.map(renderGlobalCard).join('')}</div></div>`;
    if(data.govtPolicy?.articles?.length > 0) html += `<div style="margin-top:20px"><h3>🏛️ Govt/RBI Policy</h3><div class="news-list">${data.govtPolicy.articles.slice(0,10).map(a=>renderNewsCard(a)).join('')}</div></div>`;
    document.getElementById('intel-content').innerHTML = html;
}

function updateRiskUI(risk) {
    if(!risk) return;
    const cls = risk.riskScore < 20 ? 'low' : risk.riskScore < 35 ? 'moderate' : risk.riskScore < 50 ? 'high' : 'extreme';
    const hRisk = document.getElementById('header-risk');
    hRisk.className = `risk-indicator ${cls}`;
    hRisk.querySelector('.risk-text').textContent = `Risk: ${risk.riskScore}/100`;
    const badge = document.getElementById('risk-badge');
    badge.className = `nav-badge risk-${cls}`; badge.textContent = risk.riskScore;
    const statEl = document.getElementById('stat-risk-score');
    statEl.textContent = `${risk.riskScore}/100`;
    statEl.style.color = risk.riskScore < 20 ? 'var(--green)' : risk.riskScore < 35 ? 'var(--yellow)' : risk.riskScore < 50 ? '#f97316' : 'var(--red)';
    const banner = document.getElementById('risk-banner');
    if(risk.riskScore >= 35) { banner.classList.remove('hidden'); document.getElementById('risk-banner-text').textContent = risk.tradingAdvice; }
    else banner.classList.add('hidden');
}

// ═══ NEWS ═══
async function loadNews() {
    showToast('📰','News fetch ho rahi hain...');
    document.getElementById('news-content').innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div class="loading-text">📰 Fetching news...</div></div>';
    try {
        const r = await fetch(`${API}/api/news`); const d = await r.json();
        if(d.success) { renderNews(d.data); showToast('✅',`${d.data.totalArticles} articles`); }
        else showToast('❌',d.error);
    } catch(e) { showToast('❌','Failed'); }
}
function renderNews(data) {
    let html = `<div class="sentiment-summary"><div class="sentiment-stat"><div class="sentiment-stat-value">${data.overallSentiment}</div><div class="sentiment-stat-label">Mood</div></div><div class="sentiment-stat"><div class="sentiment-stat-value" style="color:var(--green)">${data.bullishCount}</div><div class="sentiment-stat-label">Positive</div></div><div class="sentiment-stat"><div class="sentiment-stat-value" style="color:var(--red)">${data.bearishCount}</div><div class="sentiment-stat-label">Negative</div></div><div class="sentiment-stat"><div class="sentiment-stat-value">${data.totalArticles}</div><div class="sentiment-stat-label">Total</div></div></div>`;
    if(data.blackSwanAlerts?.length > 0) html += `<div style="margin-bottom:20px"><h3>🦢 Black Swan Alerts</h3>${data.blackSwanAlerts.map(a=>`<div class="alert-card critical"><div class="alert-card-header"><span class="alert-type critical">BLACK SWAN</span></div><div class="alert-description">${a.title}</div></div>`).join('')}</div>`;
    if(data.topBearish?.length > 0) html += `<div style="margin-bottom:20px"><h3>🔴 Negative News</h3><div class="news-list">${data.topBearish.map(a=>renderNewsCard(a)).join('')}</div></div>`;
    if(data.topBullish?.length > 0) html += `<div style="margin-bottom:20px"><h3>🟢 Positive News</h3><div class="news-list">${data.topBullish.map(a=>renderNewsCard(a)).join('')}</div></div>`;
    html += `<div><h3>📰 All News</h3><div class="news-list">${data.allArticles.slice(0,30).map(a=>renderNewsCard(a)).join('')}</div></div>`;
    document.getElementById('news-content').innerHTML = html;
}
function renderNewsCard(a) {
    const dotClass = a.sentimentScore > 0 ? 'positive' : a.sentimentScore < -5 ? 'danger' : a.sentimentScore < 0 ? 'negative' : 'neutral';
    const tag = a.isBlackSwan ? '<span class="news-tag danger">BLACK SWAN</span>' : a.isGovtRelated ? '<span class="news-tag govt">GOVT/RBI</span>' : a.sentimentScore > 0 ? '<span class="news-tag bullish">BULLISH</span>' : a.sentimentScore < 0 ? '<span class="news-tag bearish">BEARISH</span>' : '<span class="news-tag neutral">NEUTRAL</span>';
    return `<a class="news-card" href="${a.link||'#'}" target="_blank" rel="noopener"><span class="news-sentiment-dot ${dotClass}"></span><div class="news-card-body"><div class="news-title">${a.title}</div><div class="news-meta"><span>${timeAgo(a.pubDate)}</span>${tag}</div></div></a>`;
}

// ═══ GLOBAL MARKETS ═══
async function loadGlobalMarkets() {
    showToast('🌍','Global markets loading...');
    document.getElementById('global-content').innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div class="loading-text">🌍 Checking indices...</div></div>';
    try {
        const r = await fetch(`${API}/api/global-markets`); const d = await r.json();
        if(d.success) { renderGlobalMarkets(d.data); showToast('✅',`${d.data.indices.length} indices`); }
        else showToast('❌',d.error);
    } catch(e) { showToast('❌','Failed'); }
}
function renderGlobalMarkets(data) {
    let html = '';
    if(data.alerts?.length > 0) html += `<div style="margin-bottom:20px"><h3>⚠️ Alerts</h3>${data.alerts.map(a=>`<div class="global-alert ${a.severity?.toLowerCase()||'normal'}"><span class="global-alert-icon">${a.severity==='CRITICAL'?'🚨':'⚠️'}</span><span class="global-alert-text">${a.message}</span></div>`).join('')}</div>`;
    html += `<div class="section-header" style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:16px"><h2>Status: ${data.overallStatus}</h2></div>`;
    html += `<div class="global-grid">${data.indices.map(renderGlobalCard).join('')}</div>`;
    document.getElementById('global-content').innerHTML = html;
}
function renderGlobalCard(idx) {
    return `<div class="global-card ${idx.changePct >= 0 ? 'up' : 'down'}"><div class="global-name">${idx.name}</div><div class="global-region">${idx.region}</div><div class="global-price">${idx.price?.toLocaleString()}</div><div class="global-change ${idx.changePct >= 0 ? 'positive' : 'negative'}">${idx.changePct >= 0 ? '▲' : '▼'} ${Math.abs(idx.changePct)}%</div></div>`;
}

// ═══ DASHBOARD ═══
function updateDashboard(report) {
    document.getElementById('stat-buy').textContent = report.summary.buySignals;
    document.getElementById('stat-sell').textContent = report.summary.sellSignals;
    document.getElementById('stat-hold').textContent = report.summary.holdStocks;
    const gEl = document.getElementById('top-gainers');
    if(report.topGainers?.length>0) gEl.innerHTML = report.topGainers.map((s,i)=>`<div class="stock-item" onclick="runAnalysis('${s.symbol}')"><div class="stock-item-left"><span class="stock-rank gainer">${i+1}</span><div><div class="stock-symbol">${s.symbol}</div><div class="stock-name">${s.name}</div></div></div><div class="stock-price"><div class="stock-price-value">₹${s.currentPrice?.toFixed(2)}</div><div class="stock-change positive">+${s.dayChangePct}%</div></div></div>`).join('');
    const lEl = document.getElementById('top-losers');
    if(report.topLosers?.length>0) lEl.innerHTML = report.topLosers.map((s,i)=>`<div class="stock-item" onclick="runAnalysis('${s.symbol}')"><div class="stock-item-left"><span class="stock-rank loser">${i+1}</span><div><div class="stock-symbol">${s.symbol}</div><div class="stock-name">${s.name}</div></div></div><div class="stock-price"><div class="stock-price-value">₹${s.currentPrice?.toFixed(2)}</div><div class="stock-change negative">${s.dayChangePct}%</div></div></div>`).join('');
    const recGrid = document.getElementById('recommendations-grid');
    const allRecs = [...(report.recommendations.strongBuys||[]),...(report.recommendations.buys||[]),...(report.recommendations.sells||[]),...(report.recommendations.strongSells||[])].slice(0,8);
    if(allRecs.length>0) recGrid.innerHTML = allRecs.map(s=>renderRecCard(s)).join('');
    document.getElementById('rec-date').textContent = new Date(report.generatedAt).toLocaleString('en-IN');
}
function renderRecCard(s) {
    const ac = s.recommendation.action.includes('BUY')?'buy':s.recommendation.action.includes('SELL')?'sell':'hold';
    const cur = s.currency === 'USD' ? '$' : '₹';
    return `<div class="rec-card ${ac}" onclick="runAnalysis('${s.symbol}')"><div class="rec-card-header"><div><div class="rec-symbol">${s.symbol}</div><div style="font-size:12px;color:var(--text-secondary)">${s.name}</div></div><span class="rec-action ${ac}">${s.recommendation.action.replace('_',' ')}</span></div><div class="rec-details"><div class="rec-detail"><span class="rec-detail-label">Price</span><span class="rec-detail-value">${cur}${s.currentPrice?.toFixed(2)}</span></div><div class="rec-detail"><span class="rec-detail-label">Confidence</span><span class="rec-detail-value">${s.recommendation.confidence}%</span></div><div class="rec-detail"><span class="rec-detail-label">Target</span><span class="rec-detail-value" style="color:var(--green)">${cur}${s.recommendation.targetPrice}</span></div><div class="rec-detail"><span class="rec-detail-label">Stop Loss</span><span class="rec-detail-value" style="color:var(--red)">${cur}${s.recommendation.stopLoss}</span></div></div><div class="rec-today-action">${s.recommendation.todayAction}</div><div class="confidence-meter"><div class="confidence-fill ${s.recommendation.confidence>=70?'high':s.recommendation.confidence>=50?'medium':'low'}" style="width:${s.recommendation.confidence}%"></div></div></div>`;
}

// ═══ REPORT ═══
function renderReport(report) {
    const c = document.getElementById('report-content');
    c.innerHTML = `<div style="margin-bottom:16px;color:var(--text-secondary);font-size:14px">📅 ${report.marketDate}</div>
    <div class="report-summary"><div class="report-stat"><div class="report-stat-value" style="color:var(--green)">${report.summary.buySignals}</div><div class="report-stat-label">Buy</div></div><div class="report-stat"><div class="report-stat-value" style="color:var(--red)">${report.summary.sellSignals}</div><div class="report-stat-label">Sell</div></div><div class="report-stat"><div class="report-stat-value" style="color:var(--yellow)">${report.summary.holdStocks}</div><div class="report-stat-label">Hold</div></div><div class="report-stat"><div class="report-stat-value" style="color:var(--accent-primary)">${report.summary.marketSentiment}</div><div class="report-stat-label">Sentiment</div></div></div>
    ${renderSection('🟢 STRONG BUY', report.recommendations.strongBuys)}${renderSection('🟢 BUY', report.recommendations.buys)}${renderSection('🔴 SELL', report.recommendations.sells)}${renderSection('🔴 STRONG SELL', report.recommendations.strongSells)}${renderSection('⏸️ HOLD', report.recommendations.holds)}`;
}
function renderSection(title, stocks) {
    if(!stocks?.length) return '';
    return `<div class="report-section"><h3 class="report-section-title">${title}</h3><div class="recommendations-grid">${stocks.map(s=>renderRecCard(s)).join('')}</div></div>`;
}

// ═══ SIGNALS ═══
function renderSignals(report) {
    document.getElementById('signals-date').textContent = new Date(report.generatedAt).toLocaleString('en-IN');
    const all = report.allStocks||[];
    if(!all.length) return;
    document.getElementById('signals-content').innerHTML = `<div style="overflow-x:auto"><table class="signals-table"><thead><tr><th>Stock</th><th>Price</th><th>Change</th><th>RSI</th><th>Signal</th><th>Confidence</th><th>Target</th><th>SL</th><th>Action</th></tr></thead><tbody>${all.map(s=>{
        const ac=s.recommendation?.action?.includes('BUY')?'buy':s.recommendation?.action?.includes('SELL')?'sell':'hold';
        return `<tr onclick="runAnalysis('${s.symbol}')"><td><div class="stock-symbol">${s.symbol}</div><div class="stock-name">${s.name}</div></td><td style="font-family:'JetBrains Mono',monospace;font-weight:600">₹${s.currentPrice?.toFixed(2)}</td><td><span class="stock-change ${s.dayChangePct>=0?'positive':'negative'}">${s.dayChangePct>=0?'+':''}${s.dayChangePct}%</span></td><td style="font-family:'JetBrains Mono',monospace;color:${s.indicators?.rsi<30?'var(--green)':s.indicators?.rsi>70?'var(--red)':'var(--text-primary)'}">${s.indicators?.rsi||'--'}</td><td><span class="rec-action ${ac}" style="font-size:10px">${s.recommendation?.action?.replace('_',' ')||'--'}</span></td><td style="font-family:'JetBrains Mono',monospace">${s.recommendation?.confidence}%</td><td style="font-family:'JetBrains Mono',monospace;color:var(--green)">₹${s.recommendation?.targetPrice}</td><td style="font-family:'JetBrains Mono',monospace;color:var(--red)">₹${s.recommendation?.stopLoss}</td><td style="font-size:11px">${s.recommendation?.todayAction}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

// ═══════════════════════════════════════════════════
// 🔍 DEEP STOCK ANALYSIS (Global + Fundamentals)
// ═══════════════════════════════════════════════════
async function runAnalysis(symbol) {
    switchPage('analyze');
    document.getElementById('analyze-symbol').value = symbol;
    const result = document.getElementById('analysis-result');
    result.classList.remove('hidden');
    result.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div class="loading-text">🔍 Deep analyzing '+symbol+'...</div><div class="loading-text" style="font-size:12px;color:var(--text-muted)">Technical + Fundamentals + News + Insider scan</div></div>';

    try {
        const period = document.getElementById('analyze-period').value;
        // Fetch technical analysis + fundamentals in parallel
        const [techRes, fundRes] = await Promise.all([
            fetch(`${API}/api/analyze/${encodeURIComponent(symbol)}?period=${period}`).then(r=>r.json()),
            fetch(`${API}/api/fundamentals/${encodeURIComponent(symbol)}`).then(r=>r.json()).catch(()=>({success:false}))
        ]);

        if(techRes.success) {
            renderAnalysis(techRes.data, fundRes.success ? fundRes.data : null);
            showToast('✅',`${symbol} deep analysis done`);
        } else {
            result.innerHTML = `<div class="section-card"><div class="empty-state-large"><div class="empty-icon">❌</div><h3>Failed</h3><p>${techRes.error}</p></div></div>`;
        }
    } catch(e) {
        result.innerHTML = '<div class="section-card"><div class="empty-state-large"><div class="empty-icon">❌</div><h3>Error</h3><p>Server connect nahi hua</p></div></div>';
    }
}

function renderAnalysis(data, fundamentals) {
    const result = document.getElementById('analysis-result');
    const ac = data.recommendation.action.includes('BUY')?'buy':data.recommendation.action.includes('SELL')?'sell':'hold';
    const cur = data.currency === 'USD' ? '$' : data.currency === 'GBp' ? '£' : '₹';

    let html = `
    <div class="section-card"><div class="analysis-header"><div><div class="analysis-symbol">${data.symbol} <span style="font-size:12px;color:var(--text-muted);font-weight:400">${data.fullSymbol}</span></div><div style="color:var(--text-secondary);font-size:13px">${data.name} | ${data.sector} | ${data.exchange}</div></div><div style="text-align:right"><div class="analysis-current-price">${cur}${data.currentPrice?.toFixed(2)}</div><div class="analysis-change ${data.dayChangePct>=0?'positive':'negative'}">${data.dayChangePct>=0?'▲':'▼'} ${cur}${Math.abs(data.dayChange).toFixed(2)} (${data.dayChangePct>=0?'+':''}${data.dayChangePct}%)</div></div></div>
    <div style="text-align:center;padding:20px 0"><div class="action-badge ${ac}">${ac==='buy'?'📈':ac==='sell'?'📉':'⏸️'} ${data.recommendation.action.replace('_',' ')}</div><div style="margin-top:12px;font-size:14px;color:var(--text-secondary)">${data.recommendation.todayAction}</div><div style="margin-top:8px;display:flex;justify-content:center;gap:24px;font-size:13px;flex-wrap:wrap"><span>Confidence: <strong style="color:var(--accent-primary)">${data.recommendation.confidence}%</strong></span><span>Target: <strong style="color:var(--green)">${cur}${data.recommendation.targetPrice}</strong></span><span>SL: <strong style="color:var(--red)">${cur}${data.recommendation.stopLoss}</strong></span><span>R:R: <strong>1:${data.recommendation.riskRewardRatio}</strong></span></div><div class="confidence-meter" style="max-width:400px;margin:12px auto 0"><div class="confidence-fill ${data.recommendation.confidence>=70?'high':data.recommendation.confidence>=50?'medium':'low'}" style="width:${data.recommendation.confidence}%"></div></div></div></div>`;

    // ═══ FUNDAMENTAL ANALYSIS SECTION ═══
    if(fundamentals) {
        const hs = fundamentals.healthScore;
        const gradeColor = hs.grade.startsWith('A') ? 'var(--green)' : hs.grade.startsWith('B') ? 'var(--yellow)' : 'var(--red)';

        html += `<div class="section-card"><div class="section-header"><h2>📊 Fundamental Analysis</h2><span class="section-badge" style="font-size:16px;color:${gradeColor}">Grade: ${hs.grade} (${hs.score}%)</span></div>`;

        // Company Profile
        if(fundamentals.companyProfile?.description && fundamentals.companyProfile.description !== 'N/A') {
            html += `<div style="padding:12px;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:16px;font-size:13px;color:var(--text-secondary);line-height:1.6">${fundamentals.companyProfile.description.substring(0,400)}${fundamentals.companyProfile.description.length>400?'...':''}<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">${fundamentals.companyProfile.sector} | ${fundamentals.companyProfile.industry} | ${fundamentals.companyProfile.country}</div></div>`;
        }

        // Key Stats Grid
        const fr = fundamentals.financialRatios;
        const pr = fundamentals.profitability;
        html += `<div class="indicator-grid">
            ${fundCard('Market Cap', fr.marketCapFmt, '🏢')}
            ${fundCard('P/E Ratio', fr.peRatioFmt, '📐')}
            ${fundCard('EPS', fr.epsFmt, '💰')}
            ${fundCard('Revenue', pr.totalRevenue, '📊')}
            ${fundCard('Profit Margin', pr.profitMargin, '💹')}
            ${fundCard('ROE', pr.returnOnEquity, '📈')}
            ${fundCard('Debt/Equity', pr.debtToEquity, '⚖️')}
            ${fundCard('Dividend', fr.dividendYield, '🎁')}
            ${fundCard('Beta', fr.beta?.toFixed(2)||'N/A', '📉')}
            ${fundCard('Book Value', fr.bookValue?.toFixed(2)||'N/A', '📘')}
            ${fundCard('Revenue Growth', pr.revenueGrowth, '🚀')}
            ${fundCard('Free Cashflow', pr.freeCashflow, '💵')}
        </div>`;

        // Health Score Factors
        if(hs.factors?.length > 0) {
            html += `<div style="margin-top:16px"><h3 style="margin-bottom:12px">🏥 Financial Health Factors</h3><div class="risk-factor-list">${hs.factors.map(f=>`<div class="risk-factor"><span class="risk-factor-dot ${f.status==='EXCELLENT'?'low':f.status==='GOOD'?'moderate':f.status==='MODERATE'?'high':'critical'}"></span><span class="risk-factor-name">${f.name}</span><span class="risk-factor-detail">${f.detail} <span style="color:${f.status==='EXCELLENT'?'var(--green)':f.status==='GOOD'?'var(--yellow)':f.status==='MODERATE'?'#f97316':'var(--red)'}">(${f.status})</span></span></div>`).join('')}</div></div>`;
        }

        // Analyst Recommendations
        if(fundamentals.analystRecommendations) {
            const ar = fundamentals.analystRecommendations;
            const total = ar.strongBuy + ar.buy + ar.hold + ar.sell + ar.strongSell;
            html += `<div style="margin-top:16px"><h3 style="margin-bottom:12px">🎯 Analyst Ratings</h3><div class="indicator-grid">
                ${fundCard('Strong Buy', ar.strongBuy, '🟢')}
                ${fundCard('Buy', ar.buy, '🟢')}
                ${fundCard('Hold', ar.hold, '🟡')}
                ${fundCard('Sell', ar.sell, '🔴')}
                ${fundCard('Strong Sell', ar.strongSell, '🔴')}
                ${fundCard('Target Price', fundamentals.targetPrices.targetMean, '🎯')}
            </div></div>`;
        }

        // Income Statement Trend
        if(fundamentals.incomeStatement?.length > 0) {
            html += `<div style="margin-top:16px"><h3 style="margin-bottom:12px">📋 Income Statement (Yearly)</h3><div style="overflow-x:auto"><table class="signals-table"><thead><tr><th>Year</th><th>Revenue</th><th>Gross Profit</th><th>Net Income</th><th>EBIT</th></tr></thead><tbody>${fundamentals.incomeStatement.map(s=>`<tr><td>${s.date}</td><td>${s.totalRevenue}</td><td>${s.grossProfit}</td><td>${s.netIncome}</td><td>${s.ebit}</td></tr>`).join('')}</tbody></table></div></div>`;
        }

        html += `</div>`;
    }

    // Risk Assessment
    if(data.riskAssessment) {
        const ra = data.riskAssessment;
        const rc = ra.riskScore < 20 ? 'low' : ra.riskScore < 35 ? 'moderate' : ra.riskScore < 50 ? 'high' : 'extreme';
        html += `<div class="section-card"><div class="section-header"><h2>⚠️ Risk Assessment</h2><span class="section-badge">Score: ${ra.riskScore}/100</span></div><div class="risk-bar"><div class="risk-bar-fill ${rc}" style="width:${ra.riskScore}%"></div></div><div class="risk-advice ${ra.riskScore<35?'safe':ra.riskScore<50?'caution':'danger'}" style="margin-top:12px">${ra.tradingAdvice}</div>${ra.riskFactors?.length>0?`<div class="risk-factor-list" style="margin-top:12px">${ra.riskFactors.map(f=>`<div class="risk-factor"><span class="risk-factor-dot ${f.level.toLowerCase()}"></span><span class="risk-factor-name">${f.factor}</span><span class="risk-factor-detail">${f.detail}</span></div>`).join('')}</div>`:''}</div>`;
    }

    // Insider Detection
    if(data.insiderDetection?.detected) {
        html += `<div class="section-card"><div class="section-header"><h2>🕵️ Insider Activity</h2><span class="section-badge" style="color:var(--red)">⚠️ ${data.insiderDetection.riskLevel}</span></div>${data.insiderDetection.signals.map(s=>`<div class="alert-card ${s.severity.toLowerCase()}"><div class="alert-card-header"><span class="alert-type ${s.severity.toLowerCase()}">${s.type.replace(/_/g,' ')}</span><span class="alert-date">${s.date}</span></div><div class="alert-description">${s.description}</div></div>`).join('')}</div>`;
    }

    // Manipulation
    if(data.manipulationDetection?.detected) {
        html += `<div class="section-card"><div class="section-header"><h2>🎭 Manipulation Detection</h2><span class="section-badge" style="color:var(--red)">⚠️ ${data.manipulationDetection.riskLevel}</span></div>${data.manipulationDetection.signals.map(s=>`<div class="alert-card ${s.severity.toLowerCase()}"><div class="alert-card-header"><span class="alert-type ${s.severity.toLowerCase()}">${s.type.replace(/_/g,' ')}</span></div><div class="alert-description">${s.description}</div></div>`).join('')}</div>`;
    }

    // Stock News
    if(data.newsAnalysis?.allArticles?.length > 0) {
        html += `<div class="section-card"><div class="section-header"><h2>📰 News Sentiment</h2><span class="section-badge">${data.newsAnalysis.overallSentiment}</span></div><div class="sentiment-summary"><div class="sentiment-stat"><div class="sentiment-stat-value" style="color:var(--green)">${data.newsAnalysis.bullishCount}</div><div class="sentiment-stat-label">Positive</div></div><div class="sentiment-stat"><div class="sentiment-stat-value" style="color:var(--red)">${data.newsAnalysis.bearishCount}</div><div class="sentiment-stat-label">Negative</div></div></div><div class="news-list">${data.newsAnalysis.allArticles.slice(0,8).map(a=>renderNewsCard(a)).join('')}</div></div>`;
    }

    // 🧠 TRADING PSYCHOLOGY (80% OF TRADING)
    if(data.tradingPsychology) {
        const psy = data.tradingPsychology;
        const pClass = psy.marketState.includes('Greed') ? 'extreme' : psy.marketState.includes('Fear') ? 'high' : 'safe';
        html += `<div class="section-card" style="border:1px solid var(--accent-primary)"><div class="section-header"><h2 style="color:var(--accent-primary)">🧠 Trading Psychology & Discipline</h2><span class="section-badge ${pClass}">${psy.marketState}</span></div><div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">${psy.focus}</div><div class="signal-list" style="display:flex;flex-direction:column;gap:12px">${psy.tips.map(t=>`<div class="signal-item" style="padding:12px;background:var(--bg-card);border-left:4px solid var(--accent-primary);margin:0">${t}</div>`).join('')}</div></div>`;
    }

    // ═══ CANDLESTICK CHART ═══
    html += `<div class="section-card"><div class="section-header"><h2>🕯️ Candlestick Chart</h2><span class="section-badge">${data.priceHistory?.length} candles</span></div><div class="chart-container" style="height:400px"><canvas id="candlestickChart"></canvas></div></div>`;

    // Line Chart
    html += `<div class="section-card"><div class="section-header"><h2>📈 Price & Moving Averages</h2></div><div class="chart-container"><canvas id="priceChart"></canvas></div></div>`;

    // Technical Indicators
    const ind = data.indicators;
    html += `<div class="section-card"><div class="section-header"><h2>📊 Technical Indicators</h2><span class="section-badge">Score: ${data.trendAnalysis.score}/${data.trendAnalysis.maxScore}</span></div><div class="indicator-grid">${indCard('RSI',ind.rsi,ind.rsi<30?'🟢 Oversold':ind.rsi>70?'🔴 Overbought':'⚪ Neutral',ind.rsi<30?'var(--green)':ind.rsi>70?'var(--red)':'var(--text-primary)')}${indCard('MACD',ind.macd?.MACD?.toFixed(2),ind.macd?.histogram>0?'🟢 Bullish':'🔴 Bearish',ind.macd?.histogram>0?'var(--green)':'var(--red)')}${indCard('SMA 20',ind.movingAverages?.sma20,data.currentPrice>ind.movingAverages?.sma20?'🟢 Above':'🔴 Below',data.currentPrice>ind.movingAverages?.sma20?'var(--green)':'var(--red)')}${indCard('SMA 50',ind.movingAverages?.sma50,data.currentPrice>ind.movingAverages?.sma50?'🟢 Above':'🔴 Below',data.currentPrice>ind.movingAverages?.sma50?'var(--green)':'var(--red)')}${indCard('SMA 200',ind.movingAverages?.sma200||'--',ind.movingAverages?.sma200?(data.currentPrice>ind.movingAverages.sma200?'🟢 Above':'🔴 Below'):'N/A',ind.movingAverages?.sma200?(data.currentPrice>ind.movingAverages.sma200?'var(--green)':'var(--red)'):'var(--text-muted)')}${indCard('Stoch %K',ind.stochastic?.k?.toFixed(1),ind.stochastic?.k<20?'🟢 Oversold':ind.stochastic?.k>80?'🔴 Overbought':'⚪ Neutral',ind.stochastic?.k<20?'var(--green)':ind.stochastic?.k>80?'var(--red)':'var(--text-primary)')}${indCard('ADX',ind.adx,ind.adx>25?'💪 Strong':'📉 Weak',ind.adx>25?'var(--accent-primary)':'var(--text-muted)')}${indCard('Williams %R',ind.williamsR,ind.williamsR<-80?'🟢 Oversold':ind.williamsR>-20?'🔴 Overbought':'⚪ Neutral',ind.williamsR<-80?'var(--green)':ind.williamsR>-20?'var(--red)':'var(--text-primary)')}${indCard('CCI',ind.cci,ind.cci<-100?'🟢 Oversold':ind.cci>100?'🔴 Overbought':'⚪ Neutral',ind.cci<-100?'var(--green)':ind.cci>100?'var(--red)':'var(--text-primary)')}</div></div>`;

    // Trend Signals
    html += `<div class="section-card"><div class="section-header"><h2>📡 Trend Signals</h2><span class="section-badge">${data.trendAnalysis.strength}</span></div><div class="signal-list">${data.trendAnalysis.signals.map(s=>`<div class="signal-item">${s}</div>`).join('')}</div></div>`;

    // Support / Resistance
    html += `<div class="grid-2"><div class="section-card"><div class="section-header"><h2>🛡️ Support</h2></div>${data.supportResistance.supports.length>0?data.supportResistance.supports.map(l=>`<div class="level-item support"><span class="level-price">${cur}${l.level}</span><span class="level-strength">Str: ${l.strength}</span></div>`).join(''):'<div class="empty-state">None</div>'}</div><div class="section-card"><div class="section-header"><h2>🚧 Resistance</h2></div>${data.supportResistance.resistances.length>0?data.supportResistance.resistances.map(l=>`<div class="level-item resistance"><span class="level-price">${cur}${l.level}</span><span class="level-strength">Str: ${l.strength}</span></div>`).join(''):'<div class="empty-state">None</div>'}</div></div>`;

    // Candle Patterns
    if(data.candlePatterns?.length > 0) {
        html += `<div class="section-card"><div class="section-header"><h2>🕯️ Candlestick Patterns Detected</h2></div><div class="pattern-list">${data.candlePatterns.map(p=>`<div class="pattern-item"><span class="pattern-type ${p.type}">${p.type}</span><strong>${p.name}</strong><span style="color:var(--text-secondary);font-size:12px">${p.description} (${p.date})</span></div>`).join('')}</div></div>`;
    }

    // Predictions
    html += `<div class="section-card"><div class="section-header"><h2>🔮 Price Estimates</h2><span class="section-badge">Vol: ${data.prediction.volatility}%</span></div><div class="prediction-grid"><div class="prediction-card"><div class="prediction-period">1 Day</div><div class="prediction-target">${cur}${data.prediction.estimates['1day'].target}</div><div class="prediction-range">${cur}${data.prediction.estimates['1day'].range.low} - ${cur}${data.prediction.estimates['1day'].range.high}</div></div><div class="prediction-card"><div class="prediction-period">1 Week</div><div class="prediction-target">${cur}${data.prediction.estimates['1week'].target}</div><div class="prediction-range">${cur}${data.prediction.estimates['1week'].range.low} - ${cur}${data.prediction.estimates['1week'].range.high}</div></div><div class="prediction-card"><div class="prediction-period">1 Month</div><div class="prediction-target">${cur}${data.prediction.estimates['1month'].target}</div><div class="prediction-range">${cur}${data.prediction.estimates['1month'].range.low} - ${cur}${data.prediction.estimates['1month'].range.high}</div></div></div><div style="margin-top:12px;padding:10px;background:var(--bg-input);border-radius:var(--radius-sm);font-size:12px;color:var(--text-muted)">⚠️ Disclaimer: Statistical estimates hain, guaranteed nahi.</div></div>`;

    result.innerHTML = html;
    
    // Update Trade Ticket
    const ticket = document.getElementById('trade-ticket-container');
    if(ticket) {
        ticket.classList.remove('hidden');
        document.getElementById('ticket-symbol').textContent = data.symbol;
        document.getElementById('ticket-price').textContent = data.currentPrice.toFixed(2);
        if(typeof currentTradeSymbol !== 'undefined') {
            currentTradeSymbol = data.symbol;
            currentTradePrice = data.currentPrice;
        }
    }

    drawCandlestickChart(data);
    drawChart(data);
}

function fundCard(label, val, icon) {
    return `<div class="indicator-card"><div class="indicator-label">${icon} ${label}</div><div class="indicator-value">${val??'N/A'}</div></div>`;
}

function indCard(label, val, status, color) {
    return `<div class="indicator-card"><div class="indicator-label">${label}</div><div class="indicator-value" style="color:${color}">${val??'--'}</div><div class="indicator-status">${status}</div></div>`;
}

// ═══ CANDLESTICK CHART ═══
function drawCandlestickChart(data) {
    const ctx = document.getElementById('candlestickChart');
    if(!ctx || !data.priceHistory?.length) return;
    const prices = data.priceHistory;

    // Create OHLC bars using floating bar chart
    const upColor = 'rgba(34, 197, 94, 0.9)';
    const downColor = 'rgba(239, 68, 68, 0.9)';
    const wickUpColor = 'rgba(34, 197, 94, 0.5)';
    const wickDownColor = 'rgba(239, 68, 68, 0.5)';

    const bodies = prices.map(p => {
        const isUp = p.close >= p.open;
        return { x: p.date, y: [Math.min(p.open, p.close), Math.max(p.open, p.close)], isUp };
    });
    const wicks = prices.map(p => {
        return { x: p.date, y: [p.low, p.high], isUp: p.close >= p.open };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: prices.map(p => p.date),
            datasets: [
                {
                    label: 'Price Body',
                    data: bodies.map(b => b.y),
                    backgroundColor: bodies.map(b => b.isUp ? upColor : downColor),
                    borderColor: bodies.map(b => b.isUp ? upColor : downColor),
                    borderWidth: 1, barPercentage: 0.6, categoryPercentage: 0.8, borderSkipped: false
                },
                {
                    label: 'Wick',
                    data: wicks.map(w => w.y),
                    backgroundColor: wicks.map(w => w.isUp ? wickUpColor : wickDownColor),
                    borderColor: wicks.map(w => w.isUp ? wickUpColor : wickDownColor),
                    borderWidth: 1, barPercentage: 0.05, categoryPercentage: 0.8, borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1f2e', titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12,
                    callbacks: {
                        title: (items) => items[0]?.label || '',
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            const p = prices[idx];
                            return [`Open: ${p.open}`, `High: ${p.high}`, `Low: ${p.low}`, `Close: ${p.close}`, `Vol: ${(p.volume/1000000).toFixed(1)}M`];
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 9, family: 'JetBrains Mono' }, maxTicksLimit: 12, maxRotation: 45 } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } } }
            }
        }
    });
}

function drawChart(data) {
    const ctx = document.getElementById('priceChart');
    if(!ctx) return;
    const prices = data.priceHistory||[];
    const closes = prices.map(p=>p.close);
    const sma20 = closes.map((c,i)=>i<19?null:parseFloat((closes.slice(i-19,i+1).reduce((a,b)=>a+b,0)/20).toFixed(2)));
    const sma50 = closes.map((c,i)=>i<49?null:parseFloat((closes.slice(i-49,i+1).reduce((a,b)=>a+b,0)/50).toFixed(2)));

    new Chart(ctx, {
        type:'line',
        data:{ labels:prices.map(p=>p.date), datasets:[
            { label:'Close', data:closes, borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.08)', borderWidth:2, fill:true, tension:0.3, pointRadius:0, pointHoverRadius:4 },
            { label:'SMA 20', data:sma20, borderColor:'#f59e0b', borderWidth:1.5, borderDash:[5,5], fill:false, tension:0.3, pointRadius:0 },
            { label:'SMA 50', data:sma50, borderColor:'#ec4899', borderWidth:1.5, borderDash:[3,3], fill:false, tension:0.3, pointRadius:0 }
        ]},
        options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, plugins:{ legend:{labels:{color:'#94a3b8',font:{family:'Inter',size:12}}}, tooltip:{backgroundColor:'#1a1f2e',titleColor:'#f1f5f9',bodyColor:'#94a3b8',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,padding:12} }, scales:{ x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#64748b',font:{size:9,family:'JetBrains Mono'},maxTicksLimit:12}}, y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#64748b',font:{size:10,family:'JetBrains Mono'}}} } }
    });
}

// ═══ HELPERS ═══
function timeAgo(dateStr) {
    if(!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff/60000);
    if(mins < 1) return 'Just now';
    if(mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if(hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
}

function showToast(icon, msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className='toast';
    t.innerHTML=`<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{t.classList.add('fade-out');setTimeout(()=>t.remove(),300);},4000);
}

const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { analyzeStock, generateDailyReport, fetchStockData, getTopNiftyStocks, searchStocksGlobal, fetchFundamentals } = require('./analysis-engine');
const {
    fetchAllNews, fetchStockSpecificNews, analyzeAllNewsSentiment, analyzeSentiment,
    detectInsiderActivity, detectPumpAndDump, checkGlobalMarkets,
    checkGovtPolicyNews, calculateOverallRisk
} = require('./news-engine');
const { executeTrade, getPortfolioState } = require('./paper-trade');

const app = express();
const PORT = 4000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store in memory
let latestReport = null;
let reportHistory = [];
let latestNewsSentiment = null;
let latestGlobalMarkets = null;
let latestGovtPolicy = null;
let latestRiskAssessment = null;

// ═══ ORIGINAL APIs ═══

app.get('/api/analyze/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const period = req.query.period || '6mo';
        const analysis = await analyzeStock(symbol, period);

        // Add news + intelligence data
        let newsData = null;
        let insiderData = null;
        let pumpDumpData = null;
        try {
            const stockNews = await fetchStockSpecificNews(symbol.replace('.NS', ''));
            newsData = analyzeAllNewsSentiment(stockNews);
            insiderData = detectInsiderActivity(analysis.priceHistory);
            pumpDumpData = detectPumpAndDump(analysis.priceHistory);
        } catch (e) {
            console.log('News enrichment failed:', e.message);
        }

        analysis.newsAnalysis = newsData;
        analysis.insiderDetection = insiderData;
        analysis.manipulationDetection = pumpDumpData;

        // Calculate stock-level risk
        analysis.riskAssessment = calculateOverallRisk(
            newsData, latestGlobalMarkets, insiderData, pumpDumpData
        );

        res.json({ success: true, data: analysis });
    } catch (err) {
        console.error('Analysis error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/report', async (req, res) => {
    try {
        if (latestReport && isToday(latestReport.generatedAt)) {
            return res.json({ success: true, data: latestReport });
        }
        const report = await generateDailyReport();
        latestReport = report;
        reportHistory.unshift(report);
        if (reportHistory.length > 30) reportHistory = reportHistory.slice(0, 30);
        res.json({ success: true, data: report });
    } catch (err) {
        console.error('Report error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/report/generate', async (req, res) => {
    try {
        const report = await generateDailyReport();
        latestReport = report;
        reportHistory.unshift(report);
        if (reportHistory.length > 30) reportHistory = reportHistory.slice(0, 30);
        res.json({ success: true, data: report });
    } catch (err) {
        console.error('Generate report error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/reports/history', (req, res) => {
    res.json({ success: true, data: reportHistory });
});

app.post('/api/analyze/batch', async (req, res) => {
    try {
        const { symbols, period } = req.body;
        const results = [];
        for (const symbol of symbols) {
            try {
                const analysis = await analyzeStock(symbol, period || '6mo');
                results.push(analysis);
            } catch (e) {
                results.push({ symbol, error: e.message });
            }
        }
        res.json({ success: true, data: results });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/watchlist', async (req, res) => {
    try {
        const stocks = getTopNiftyStocks();
        res.json({ success: true, data: stocks });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        // Search globally via Yahoo Finance
        const globalResults = await searchStocksGlobal(query);
        // Also search local watchlist
        const allStocks = getTopNiftyStocks();
        const localFiltered = allStocks.filter(s =>
            s.symbol.toUpperCase().includes(query.toUpperCase()) || s.name.toUpperCase().includes(query.toUpperCase())
        ).map(s => ({ symbol: s.symbol, name: s.name, type: 'EQUITY', exchange: 'NSE', sector: s.sector, country: '🇮🇳 India' }));
        // Merge: local first, then global (avoid duplicates)
        const seenSymbols = new Set(localFiltered.map(s => s.symbol));
        const merged = [...localFiltered, ...globalResults.filter(g => !seenSymbols.has(g.symbol))];
        res.json({ success: true, data: merged.slice(0, 15) });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// Global stock search
app.get('/api/search-global/:query', async (req, res) => {
    try {
        const results = await searchStocksGlobal(req.params.query);
        res.json({ success: true, data: results });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// Fundamental analysis
app.get('/api/fundamentals/:symbol', async (req, res) => {
    try {
        let symbol = req.params.symbol;
        // Try with .NS first if no suffix
        if (!symbol.includes('.') && !symbol.includes('-')) {
            const data = await fetchFundamentals(symbol + '.NS');
            if (data) return res.json({ success: true, data });
            // Fallback to raw symbol
            const data2 = await fetchFundamentals(symbol);
            return res.json({ success: data2 ? true : false, data: data2, error: data2 ? undefined : 'No fundamental data available' });
        }
        const data = await fetchFundamentals(symbol);
        res.json({ success: data ? true : false, data, error: data ? undefined : 'No fundamental data available' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// ═══ NEW: NEWS & INTELLIGENCE APIs ═══

// Get latest news with sentiment analysis
app.get('/api/news', async (req, res) => {
    try {
        const articles = await fetchAllNews();
        const sentiment = analyzeAllNewsSentiment(articles);
        latestNewsSentiment = sentiment;
        res.json({ success: true, data: sentiment });
    } catch (err) {
        console.error('News error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

// Get stock-specific news
app.get('/api/news/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const articles = await fetchStockSpecificNews(symbol);
        const sentiment = analyzeAllNewsSentiment(articles);
        res.json({ success: true, data: sentiment });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// Get global market status
app.get('/api/global-markets', async (req, res) => {
    try {
        const markets = await checkGlobalMarkets();
        latestGlobalMarkets = markets;
        res.json({ success: true, data: markets });
    } catch (err) {
        console.error('Global markets error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

// Get government / RBI policy news
app.get('/api/govt-policy', async (req, res) => {
    try {
        const policy = await checkGovtPolicyNews();
        latestGovtPolicy = policy;
        res.json({ success: true, data: policy });
    } catch (err) {
        console.error('Govt policy error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

// Get comprehensive risk assessment
app.get('/api/risk-assessment', async (req, res) => {
    try {
        // Fetch fresh data if not cached
        if (!latestNewsSentiment) {
            const articles = await fetchAllNews();
            latestNewsSentiment = analyzeAllNewsSentiment(articles);
        }
        if (!latestGlobalMarkets) {
            latestGlobalMarkets = await checkGlobalMarkets();
        }

        const risk = calculateOverallRisk(latestNewsSentiment, latestGlobalMarkets, null, null);
        latestRiskAssessment = risk;
        res.json({ success: true, data: risk });
    } catch (err) {
        console.error('Risk assessment error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════
// 💸 VIRTUAL / PAPER TRADING APIs
// ═══════════════════════════════════════════

app.get('/api/portfolio', async (req, res) => {
    try {
        const state = await getPortfolioState();
        res.json({ success: true, data: state });
    } catch (error) {
        console.error("Portfolio Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/trade', async (req, res) => {
    try {
        const { symbol, action, quantity, type, price } = req.body;
        const result = await executeTrade(symbol, action, quantity, type, price);
        res.json(result);
    } catch (error) {
        console.error("Trade Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Master intelligence report - everything combined
app.get('/api/intelligence', async (req, res) => {
    try {
        console.log('\n🧠 ═══ Generating Intelligence Report ═══');

        // Fetch all intelligence data in parallel
        const [newsArticles, globalMarkets, govtPolicy] = await Promise.all([
            fetchAllNews(),
            checkGlobalMarkets(),
            checkGovtPolicyNews()
        ]);

        const newsSentiment = analyzeAllNewsSentiment(newsArticles);
        const risk = calculateOverallRisk(newsSentiment, globalMarkets, null, null);

        // Cache
        latestNewsSentiment = newsSentiment;
        latestGlobalMarkets = globalMarkets;
        latestGovtPolicy = govtPolicy;
        latestRiskAssessment = risk;

        const report = {
            generatedAt: new Date().toISOString(),
            riskAssessment: risk,
            newsSentiment,
            globalMarkets,
            govtPolicy,
            tradingAdvice: risk.tradingAdvice,
            shouldTrade: risk.riskScore < 50,
            quickSummary: generateQuickSummary(risk, newsSentiment, globalMarkets, govtPolicy)
        };

        console.log(`🧠 Risk Score: ${risk.riskScore}/100 | Level: ${risk.riskLevel}`);
        console.log(`📰 News: ${newsSentiment.overallSentiment} | Articles: ${newsSentiment.totalArticles}`);
        console.log(`🌍 Global: ${globalMarkets.overallStatus}\n`);

        res.json({ success: true, data: report });
    } catch (err) {
        console.error('Intelligence error:', err.message);
        res.json({ success: false, error: err.message });
    }
});

function generateQuickSummary(risk, news, global, govt) {
    const lines = [];

    // Risk level
    if (risk.riskScore >= 50) {
        lines.push(`🚨 DANGER: Risk Score ${risk.riskScore}/100 - ${risk.tradingAdvice}`);
    } else if (risk.riskScore >= 20) {
        lines.push(`⚠️ CAUTION: Risk Score ${risk.riskScore}/100 - Careful trading karein`);
    } else {
        lines.push(`✅ SAFE: Risk Score ${risk.riskScore}/100 - Normal trading environment`);
    }

    // News
    lines.push(`📰 News Mood: ${news.overallSentiment} (${news.bullishCount} positive, ${news.bearishCount} negative)`);

    // Black Swan check
    if (news.blackSwanAlerts?.length > 0) {
        lines.push(`🦢 BLACK SWAN ALERT: ${news.blackSwanAlerts[0].title}`);
    }

    // Global markets
    if (global.alerts?.length > 0) {
        lines.push(`🌍 Global Alert: ${global.alerts[0].message}`);
    }

    // Govt policy
    if (govt.impacts?.length > 0) {
        lines.push(`🏛️ Policy Alert: ${govt.impacts[0].title}`);
    }

    return lines;
}

function isToday(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
}

// ═══ SCHEDULED TASKS ═══

// Daily report at 9:00 AM IST
cron.schedule('30 3 * * 1-5', async () => {
    console.log('⏰ Generating scheduled daily report...');
    try {
        const report = await generateDailyReport();
        latestReport = report;
        reportHistory.unshift(report);
        if (reportHistory.length > 30) reportHistory = reportHistory.slice(0, 30);
        console.log('✅ Daily report generated');
    } catch (err) {
        console.error('❌ Daily report failed:', err.message);
    }
});

// Evening report at 4:00 PM IST
cron.schedule('30 10 * * 1-5', async () => {
    console.log('⏰ Generating evening report...');
    try {
        const report = await generateDailyReport();
        report.type = 'evening';
        latestReport = report;
        reportHistory.unshift(report);
        console.log('✅ Evening report generated');
    } catch (err) {
        console.error('❌ Evening report failed:', err.message);
    }
});

// News & Intelligence check every 30 minutes during market hours
cron.schedule('*/30 * * * 1-5', async () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const hour = ist.getHours();
    if (hour >= 8 && hour <= 17) {
        console.log('📰 Auto-checking news & global markets...');
        try {
            const articles = await fetchAllNews();
            latestNewsSentiment = analyzeAllNewsSentiment(articles);
            latestGlobalMarkets = await checkGlobalMarkets();
            latestRiskAssessment = calculateOverallRisk(latestNewsSentiment, latestGlobalMarkets, null, null);

            if (latestRiskAssessment.riskScore >= 50) {
                console.log(`🚨 HIGH RISK DETECTED! Score: ${latestRiskAssessment.riskScore}/100`);
            }
        } catch (err) {
            console.error('Auto-check failed:', err.message);
        }
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 ═══════════════════════════════════════════════════════════`);
    console.log(`   StockBot Pro v3.0 - AI Trading Intelligence System`);
    console.log(`   Server running at: http://localhost:${PORT}`);
    console.log(`   ─────────────────────────────────────────────────────────`);
    console.log(`   🌍 Global Stock Search   : Any stock, any country`);
    console.log(`   📊 Technical Analysis    : 12+ Indicators, 5yr data`);
    console.log(`   📈 Fundamental Analysis  : P/E, EPS, Revenue, Margins`);
    console.log(`   🕯️ Candlestick Charts    : OHLC visual patterns`);
    console.log(`   📰 News Sentiment        : Real-time monitoring`);
    console.log(`   🌍 Global Markets        : 11 indices tracked`);
    console.log(`   🕵️ Insider Detection     : Unusual pattern alerts`);
    console.log(`   🎭 Manipulation Detect   : Pump & Dump scanner`);
    console.log(`   🏛️ Govt Policy Tracker   : RBI, SEBI, Budget alerts`);
    console.log(`   🦢 Black Swan Monitor    : Crisis event detection`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);
});

const axios = require('axios');
const cheerio = require('cheerio');

// ═══════════════════════════════════════════════════════════════
// 📰 NEWS & INTELLIGENCE ENGINE
// Real-time news monitoring, sentiment analysis, manipulation
// detection, global event tracking, and risk assessment
// ═══════════════════════════════════════════════════════════════

// ─── SENTIMENT KEYWORDS DATABASE ───
const SENTIMENT_DB = {
    veryBullish: [
        'record high', 'all time high', 'massive growth', 'blockbuster', 'huge profit',
        'best ever', 'strong buy', 'upgrade', 'outperform', 'breakout', 'rally',
        'boom', 'surge', 'skyrocket', 'bullish', 'bonanza', 'jackpot', 'beat estimates',
        'exceeded expectations', 'strong earnings', 'dividend announced', 'stock split',
        'buyback', 'share buyback', 'expansion', 'mega deal', 'partnership',
        'government contract', 'record revenue', 'strong demand', 'overweight'
    ],
    bullish: [
        'growth', 'profit', 'gain', 'rise', 'positive', 'optimistic', 'recovery',
        'rebound', 'up', 'higher', 'advance', 'improve', 'beat', 'exceed',
        'momentum', 'support', 'stable', 'confident', 'opportunity', 'accumulate',
        'investment', 'uptrend', 'green', 'healthy', 'promising', 'strong'
    ],
    veryBearish: [
        'scam', 'fraud', 'crash', 'collapse', 'scandal', 'bankrupt', 'bankruptcy',
        'default', 'crisis', 'panic', 'plunge', 'tank', 'freefall', 'disaster',
        'investigation', 'probe', 'raid', 'arrested', 'seizure', 'money laundering',
        'ponzi', 'manipulation', 'insider trading', 'sec violation', 'sebi action',
        'ban', 'delisted', 'suspended', 'worst ever', 'massive loss', 'write off',
        'downgrade', 'sell rating', 'underperform', 'debt crisis', 'loan default'
    ],
    bearish: [
        'loss', 'fall', 'drop', 'decline', 'negative', 'concern', 'risk', 'cut',
        'reduce', 'lower', 'weak', 'slow', 'down', 'below', 'miss', 'missed',
        'warning', 'caution', 'threat', 'pressure', 'sell', 'bearish', 'red',
        'fear', 'uncertainty', 'volatile', 'trouble', 'challenge', 'slump'
    ],
    blackSwan: [
        'pandemic', 'covid', 'lockdown', 'war', 'invasion', 'nuclear', 'earthquake',
        'tsunami', 'terrorist', 'attack', 'martial law', 'emergency', 'shutdown',
        'global crisis', 'financial crisis', 'recession confirmed', 'depression',
        'market halt', 'circuit breaker', 'flash crash', 'bank failure', 'contagion',
        'sovereign default', 'currency collapse', 'hyperinflation', 'sanctions'
    ],
    govtPolicy: [
        'rbi', 'reserve bank', 'repo rate', 'interest rate', 'monetary policy',
        'fiscal policy', 'budget', 'union budget', 'gst', 'tax', 'taxation',
        'sebi', 'regulation', 'policy change', 'reform', 'subsidy', 'tariff',
        'import duty', 'export ban', 'price cap', 'government order', 'modi',
        'finance minister', 'nirmala', 'pli scheme', 'make in india', 'disinvestment',
        'privatization', 'fdi policy', 'election', 'vote', 'parliament'
    ],
    globalEvents: [
        'fed', 'federal reserve', 'powell', 'us economy', 'china', 'trade war',
        'oil price', 'crude oil', 'opec', 'dollar', 'forex', 'yuan', 'yen',
        'euro', 'inflation us', 'us inflation', 'us recession', 'china slowdown',
        'global recession', 'imf', 'world bank', 'us jobs', 'unemployment us',
        'nasdaq', 'dow jones', 's&p 500', 'wall street', 'treasury yield',
        'bond yield', 'geopolitical', 'middle east', 'russia', 'ukraine', 'taiwan'
    ]
};

// ─── STOCK-SPECIFIC NEWS KEYWORDS ───
const STOCK_KEYWORDS = {
    'RELIANCE': ['reliance', 'ril', 'jio', 'mukesh ambani', 'reliance industries'],
    'TCS': ['tcs', 'tata consultancy', 'tata consulting'],
    'HDFCBANK': ['hdfc bank', 'hdfc'],
    'INFY': ['infosys', 'infy', 'narayana murthy', 'salil parekh'],
    'ICICIBANK': ['icici bank', 'icici'],
    'SBIN': ['sbi', 'state bank of india', 'state bank'],
    'HINDUNILVR': ['hindustan unilever', 'hul', 'unilever india'],
    'BHARTIARTL': ['bharti airtel', 'airtel', 'sunil mittal'],
    'ITC': ['itc limited', 'itc ltd'],
    'KOTAKBANK': ['kotak mahindra', 'kotak bank'],
    'LT': ['larsen toubro', 'larsen & toubro', 'l&t'],
    'AXISBANK': ['axis bank'],
    'WIPRO': ['wipro', 'azim premji'],
    'TATAMOTORS': ['tata motors', 'tata motor', 'jaguar land rover', 'jlr'],
    'BAJFINANCE': ['bajaj finance'],
    'ADANIENT': ['adani', 'adani enterprises', 'gautam adani', 'adani group', 'hindenburg'],
    'MARUTI': ['maruti suzuki', 'maruti'],
    'SUNPHARMA': ['sun pharma', 'sun pharmaceutical'],
    'TATASTEEL': ['tata steel'],
    'TITAN': ['titan company', 'titan watch', 'tanishq'],
    'M&M': ['mahindra', 'mahindra & mahindra'],
    'COALINDIA': ['coal india'],
    'ONGC': ['ongc', 'oil and natural gas'],
    'NTPC': ['ntpc'],
    'POWERGRID': ['power grid', 'powergrid'],
};

// ─── NEWS SOURCES ───
const NEWS_SOURCES = [
    {
        name: 'Google News India Business',
        url: 'https://news.google.com/rss/search?q=indian+stock+market+OR+nifty+OR+sensex+OR+bse+OR+nse&hl=en-IN&gl=IN&ceid=IN:en',
        type: 'rss'
    },
    {
        name: 'Google News Markets',
        url: 'https://news.google.com/rss/search?q=stock+market+india+today&hl=en-IN&gl=IN&ceid=IN:en',
        type: 'rss'
    },
    {
        name: 'Google News Economy',
        url: 'https://news.google.com/rss/search?q=RBI+OR+indian+economy+OR+budget+india+OR+sebi&hl=en-IN&gl=IN&ceid=IN:en',
        type: 'rss'
    },
    {
        name: 'Google News Global Markets',
        url: 'https://news.google.com/rss/search?q=global+recession+OR+fed+rate+OR+us+economy+OR+oil+prices+OR+china+economy&hl=en&gl=US&ceid=US:en',
        type: 'rss'
    }
];

// ═══════════════════════════════════════════
// 📰 NEWS FETCHING
// ═══════════════════════════════════════════

async function fetchNewsFromRSS(source) {
    try {
        const response = await axios.get(source.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/xml, text/xml, application/rss+xml'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data, { xmlMode: true });
        const articles = [];

        $('item').each((i, el) => {
            if (i >= 30) return false; // Max 30 per source
            const title = $(el).find('title').text().trim();
            const link = $(el).find('link').text().trim();
            const pubDate = $(el).find('pubDate').text().trim();
            const description = $(el).find('description').text().trim();

            if (title) {
                articles.push({
                    title,
                    link,
                    pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    description: cheerio.load(description).text().substring(0, 300),
                    source: source.name
                });
            }
        });

        return articles;
    } catch (err) {
        console.log(`  ⚠️ News fetch failed for ${source.name}: ${err.message}`);
        return [];
    }
}

async function fetchStockSpecificNews(stockSymbol) {
    const keywords = STOCK_KEYWORDS[stockSymbol] || [stockSymbol.toLowerCase()];
    const query = keywords.join('+OR+');
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+stock&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });

        const $ = cheerio.load(response.data, { xmlMode: true });
        const articles = [];

        $('item').each((i, el) => {
            if (i >= 15) return false;
            const title = $(el).find('title').text().trim();
            const link = $(el).find('link').text().trim();
            const pubDate = $(el).find('pubDate').text().trim();

            if (title) {
                articles.push({
                    title,
                    link,
                    pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    source: 'Stock News'
                });
            }
        });

        return articles;
    } catch (err) {
        return [];
    }
}

async function fetchAllNews() {
    console.log('📰 Fetching news from all sources...');
    const allArticles = [];

    for (const source of NEWS_SOURCES) {
        const articles = await fetchNewsFromRSS(source);
        allArticles.push(...articles);
        console.log(`  ✅ ${source.name}: ${articles.length} articles`);
    }

    // Remove duplicates by title similarity
    const unique = [];
    const seen = new Set();
    for (const article of allArticles) {
        const key = article.title.toLowerCase().substring(0, 50);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(article);
        }
    }

    // Sort by date (newest first)
    unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return unique;
}

// ═══════════════════════════════════════════
// 🧠 SENTIMENT ANALYSIS ENGINE
// ═══════════════════════════════════════════

function analyzeSentiment(text) {
    const lower = text.toLowerCase();
    let score = 0;
    const triggers = [];

    // Check Black Swan first (highest priority)
    for (const keyword of SENTIMENT_DB.blackSwan) {
        if (lower.includes(keyword)) {
            score -= 10;
            triggers.push({ type: 'BLACK_SWAN', keyword, impact: -10 });
        }
    }

    // Very Bearish
    for (const keyword of SENTIMENT_DB.veryBearish) {
        if (lower.includes(keyword)) {
            score -= 5;
            triggers.push({ type: 'VERY_BEARISH', keyword, impact: -5 });
        }
    }

    // Bearish
    for (const keyword of SENTIMENT_DB.bearish) {
        if (lower.includes(keyword)) {
            score -= 2;
            triggers.push({ type: 'BEARISH', keyword, impact: -2 });
        }
    }

    // Very Bullish
    for (const keyword of SENTIMENT_DB.veryBullish) {
        if (lower.includes(keyword)) {
            score += 5;
            triggers.push({ type: 'VERY_BULLISH', keyword, impact: 5 });
        }
    }

    // Bullish
    for (const keyword of SENTIMENT_DB.bullish) {
        if (lower.includes(keyword)) {
            score += 2;
            triggers.push({ type: 'BULLISH', keyword, impact: 2 });
        }
    }

    // Govt policy
    let isGovtRelated = false;
    for (const keyword of SENTIMENT_DB.govtPolicy) {
        if (lower.includes(keyword)) {
            isGovtRelated = true;
            triggers.push({ type: 'GOVT_POLICY', keyword, impact: 0 });
        }
    }

    // Global events
    let isGlobalEvent = false;
    for (const keyword of SENTIMENT_DB.globalEvents) {
        if (lower.includes(keyword)) {
            isGlobalEvent = true;
            triggers.push({ type: 'GLOBAL_EVENT', keyword, impact: 0 });
        }
    }

    let sentiment = 'NEUTRAL';
    if (score >= 10) sentiment = 'VERY_BULLISH';
    else if (score >= 3) sentiment = 'BULLISH';
    else if (score <= -10) sentiment = 'EXTREME_DANGER';
    else if (score <= -5) sentiment = 'VERY_BEARISH';
    else if (score <= -2) sentiment = 'BEARISH';

    return {
        score,
        sentiment,
        isGovtRelated,
        isGlobalEvent,
        isBlackSwan: triggers.some(t => t.type === 'BLACK_SWAN'),
        triggers: triggers.slice(0, 10) // Top 10 triggers
    };
}

function analyzeAllNewsSentiment(articles) {
    let totalScore = 0;
    const analyzed = [];
    let blackSwanAlerts = [];
    let govtAlerts = [];
    let globalAlerts = [];
    let dangerAlerts = [];

    for (const article of articles) {
        const textToAnalyze = `${article.title} ${article.description || ''}`;
        const sentiment = analyzeSentiment(textToAnalyze);

        const result = {
            ...article,
            sentiment: sentiment.sentiment,
            sentimentScore: sentiment.score,
            isGovtRelated: sentiment.isGovtRelated,
            isGlobalEvent: sentiment.isGlobalEvent,
            isBlackSwan: sentiment.isBlackSwan,
            triggers: sentiment.triggers
        };

        analyzed.push(result);
        totalScore += sentiment.score;

        // Categorize alerts
        if (sentiment.isBlackSwan) {
            blackSwanAlerts.push(result);
        }
        if (sentiment.isGovtRelated) {
            govtAlerts.push(result);
        }
        if (sentiment.isGlobalEvent) {
            globalAlerts.push(result);
        }
        if (sentiment.score <= -5) {
            dangerAlerts.push(result);
        }
    }

    const avgScore = articles.length > 0 ? totalScore / articles.length : 0;
    let overallSentiment = 'NEUTRAL';
    if (avgScore >= 2) overallSentiment = 'BULLISH';
    else if (avgScore >= 0.5) overallSentiment = 'MILDLY_BULLISH';
    else if (avgScore <= -2) overallSentiment = 'BEARISH';
    else if (avgScore <= -0.5) overallSentiment = 'MILDLY_BEARISH';

    // Check for extreme danger
    if (blackSwanAlerts.length >= 2) overallSentiment = 'EXTREME_DANGER';
    if (dangerAlerts.length >= 5) overallSentiment = 'HIGH_RISK';

    return {
        totalArticles: articles.length,
        overallSentiment,
        avgScore: parseFloat(avgScore.toFixed(2)),
        totalScore,
        bullishCount: analyzed.filter(a => a.sentimentScore > 0).length,
        bearishCount: analyzed.filter(a => a.sentimentScore < 0).length,
        neutralCount: analyzed.filter(a => a.sentimentScore === 0).length,
        blackSwanAlerts,
        govtAlerts: govtAlerts.slice(0, 10),
        globalAlerts: globalAlerts.slice(0, 10),
        dangerAlerts: dangerAlerts.slice(0, 10),
        topBullish: analyzed.filter(a => a.sentimentScore > 0).sort((a, b) => b.sentimentScore - a.sentimentScore).slice(0, 5),
        topBearish: analyzed.filter(a => a.sentimentScore < 0).sort((a, b) => a.sentimentScore - b.sentimentScore).slice(0, 5),
        allArticles: analyzed.slice(0, 50)
    };
}

// ═══════════════════════════════════════════
// 🕵️ INSIDER TRADING DETECTION
// ═══════════════════════════════════════════

function detectInsiderActivity(priceData, volumeData) {
    if (!priceData || priceData.length < 20) return { detected: false, signals: [] };

    const signals = [];
    const recent = priceData.slice(-10);
    const avgVol20 = priceData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;

    for (let i = 0; i < recent.length; i++) {
        const d = recent[i];
        const volRatio = d.volume / avgVol20;
        const priceChange = Math.abs((d.close - d.open) / d.open) * 100;
        const bodySize = Math.abs(d.close - d.open);
        const totalRange = d.high - d.low;

        // Signal 1: Huge volume with small price change (accumulation/distribution)
        if (volRatio > 3 && priceChange < 1) {
            signals.push({
                type: 'SILENT_ACCUMULATION',
                date: d.date,
                severity: 'HIGH',
                description: `Volume ${volRatio.toFixed(1)}x normal lekin price sirf ${priceChange.toFixed(2)}% move hua - Koi bada player quietly buy/sell kar raha hai`,
                volumeRatio: volRatio,
                priceChange
            });
        }

        // Signal 2: Sudden spike before any news
        if (volRatio > 5 && priceChange > 3) {
            signals.push({
                type: 'PRE_NEWS_SPIKE',
                date: d.date,
                severity: 'CRITICAL',
                description: `Massive volume spike (${volRatio.toFixed(1)}x) with ${priceChange.toFixed(1)}% price move - Possible insider information leak`,
                volumeRatio: volRatio,
                priceChange
            });
        }

        // Signal 3: End-of-day manipulation (last hour unusual activity)
        if (totalRange > 0 && bodySize / totalRange < 0.15 && volRatio > 2) {
            signals.push({
                type: 'EOD_MANIPULATION',
                date: d.date,
                severity: 'MEDIUM',
                description: `High volume with doji pattern - Price manipulated to close near open`,
                volumeRatio: volRatio,
                priceChange
            });
        }

        // Signal 4: Gap up/down with high volume (news leak)
        if (i > 0) {
            const prevClose = recent[i - 1].close;
            const gap = Math.abs((d.open - prevClose) / prevClose) * 100;
            if (gap > 2 && volRatio > 2) {
                signals.push({
                    type: 'GAP_WITH_VOLUME',
                    date: d.date,
                    severity: 'HIGH',
                    description: `${gap.toFixed(1)}% gap ${d.open > prevClose ? 'UP' : 'DOWN'} with ${volRatio.toFixed(1)}x volume - Possible information asymmetry`,
                    volumeRatio: volRatio,
                    priceChange: gap
                });
            }
        }
    }

    return {
        detected: signals.length > 0,
        signalCount: signals.length,
        signals: signals.sort((a, b) => {
            const severity = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1 };
            return (severity[b.severity] || 0) - (severity[a.severity] || 0);
        }),
        riskLevel: signals.some(s => s.severity === 'CRITICAL') ? 'CRITICAL' :
            signals.some(s => s.severity === 'HIGH') ? 'HIGH' :
            signals.length > 0 ? 'MEDIUM' : 'LOW'
    };
}

// ═══════════════════════════════════════════
// 🎭 PUMP & DUMP DETECTION
// ═══════════════════════════════════════════

function detectPumpAndDump(priceData) {
    if (!priceData || priceData.length < 30) return { detected: false, signals: [] };

    const signals = [];

    // Look for pump & dump pattern in last 30 days
    for (let i = 5; i < priceData.length; i++) {
        const window = priceData.slice(i - 5, i + 1);
        const startPrice = window[0].close;
        const maxPrice = Math.max(...window.map(d => d.high));
        const endPrice = window[window.length - 1].close;
        const avgVol = priceData.slice(Math.max(0, i - 25), i - 5).reduce((s, d) => s + d.volume, 0) / 20;
        const windowAvgVol = window.reduce((s, d) => s + d.volume, 0) / window.length;
        const volSpike = windowAvgVol / avgVol;

        const pumpPct = ((maxPrice - startPrice) / startPrice) * 100;
        const dumpPct = ((maxPrice - endPrice) / maxPrice) * 100;

        // Pump: >15% rise then >10% fall within 5 days with volume spike
        if (pumpPct > 15 && dumpPct > 10 && volSpike > 2) {
            signals.push({
                type: 'PUMP_AND_DUMP',
                startDate: window[0].date,
                endDate: window[window.length - 1].date,
                severity: 'CRITICAL',
                description: `Pump ${pumpPct.toFixed(1)}% rise phir ${dumpPct.toFixed(1)}% dump with ${volSpike.toFixed(1)}x volume - Classic pump & dump pattern!`,
                pumpPercent: parseFloat(pumpPct.toFixed(1)),
                dumpPercent: parseFloat(dumpPct.toFixed(1)),
                volumeSpike: parseFloat(volSpike.toFixed(1))
            });
        }

        // Continuous one-sided buying (potential operator activity)
        if (i >= 10) {
            const last10 = priceData.slice(i - 9, i + 1);
            const greenDays = last10.filter(d => d.close > d.open).length;
            const total10Change = ((last10[9].close - last10[0].open) / last10[0].open) * 100;

            if (greenDays >= 8 && total10Change > 20) {
                signals.push({
                    type: 'OPERATOR_BUYING',
                    startDate: last10[0].date,
                    endDate: last10[9].date,
                    severity: 'HIGH',
                    description: `10 mein se ${greenDays} green days, ${total10Change.toFixed(1)}% upar - Operator buying suspected`,
                    greenDays,
                    totalChange: parseFloat(total10Change.toFixed(1))
                });
            }

            const redDays = last10.filter(d => d.close < d.open).length;
            if (redDays >= 8 && total10Change < -15) {
                signals.push({
                    type: 'OPERATOR_SELLING',
                    startDate: last10[0].date,
                    endDate: last10[9].date,
                    severity: 'HIGH',
                    description: `10 mein se ${redDays} red days, ${total10Change.toFixed(1)}% neeche - Operator dumping suspected`,
                    redDays,
                    totalChange: parseFloat(total10Change.toFixed(1))
                });
            }
        }
    }

    // Deduplicate by date range
    const unique = [];
    const seenDates = new Set();
    for (const s of signals) {
        const key = `${s.type}-${s.startDate}`;
        if (!seenDates.has(key)) {
            seenDates.add(key);
            unique.push(s);
        }
    }

    return {
        detected: unique.length > 0,
        signalCount: unique.length,
        signals: unique.slice(-5), // Last 5 signals
        riskLevel: unique.some(s => s.severity === 'CRITICAL') ? 'CRITICAL' :
            unique.some(s => s.severity === 'HIGH') ? 'HIGH' : 'LOW'
    };
}

// ═══════════════════════════════════════════
// 🌍 GLOBAL MARKET MONITOR
// ═══════════════════════════════════════════

async function checkGlobalMarkets() {
    const indices = [
        { symbol: '^GSPC', name: 'S&P 500', region: 'US' },
        { symbol: '^DJI', name: 'Dow Jones', region: 'US' },
        { symbol: '^IXIC', name: 'NASDAQ', region: 'US' },
        { symbol: '^NSEI', name: 'Nifty 50', region: 'India' },
        { symbol: '^BSESN', name: 'Sensex', region: 'India' },
        { symbol: '^VIX', name: 'VIX (Fear Index)', region: 'Global' },
        { symbol: '^N225', name: 'Nikkei 225', region: 'Japan' },
        { symbol: '^HSI', name: 'Hang Seng', region: 'Hong Kong' },
        { symbol: 'CL=F', name: 'Crude Oil', region: 'Commodity' },
        { symbol: 'GC=F', name: 'Gold', region: 'Commodity' },
        { symbol: 'USDINR=X', name: 'USD/INR', region: 'Forex' },
    ];

    const results = [];
    const alerts = [];

    for (const idx of indices) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?range=5d&interval=1d`;
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });

            const result = response.data.chart.result[0];
            const meta = result.meta;
            const quotes = result.indicators.quote[0];
            const closes = quotes.close.filter(c => c !== null);

            const currentPrice = meta.regularMarketPrice;
            const prevClose = closes.length >= 2 ? closes[closes.length - 2] : currentPrice;
            const change = currentPrice - prevClose;
            const changePct = ((change / prevClose) * 100);

            const data = {
                symbol: idx.symbol,
                name: idx.name,
                region: idx.region,
                price: parseFloat(currentPrice?.toFixed(2)),
                change: parseFloat(change?.toFixed(2)),
                changePct: parseFloat(changePct?.toFixed(2)),
                status: changePct >= 0 ? 'UP' : 'DOWN'
            };

            results.push(data);

            // Generate alerts
            if (idx.symbol === '^VIX' && currentPrice > 30) {
                alerts.push({
                    type: 'VIX_HIGH',
                    severity: currentPrice > 40 ? 'CRITICAL' : 'HIGH',
                    message: `⚠️ VIX (Fear Index) at ${currentPrice.toFixed(1)} - Market mein EXTREME FEAR hai!`,
                    data
                });
            }

            if (Math.abs(changePct) > 3 && idx.region !== 'Commodity') {
                alerts.push({
                    type: changePct < 0 ? 'GLOBAL_CRASH' : 'GLOBAL_RALLY',
                    severity: Math.abs(changePct) > 5 ? 'CRITICAL' : 'HIGH',
                    message: `${changePct < 0 ? '🔴' : '🟢'} ${idx.name} ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% move - ${idx.region} market mein ${changePct < 0 ? 'CRASH' : 'RALLY'}!`,
                    data
                });
            }

            if (idx.symbol === 'CL=F' && Math.abs(changePct) > 4) {
                alerts.push({
                    type: 'OIL_SHOCK',
                    severity: Math.abs(changePct) > 7 ? 'CRITICAL' : 'HIGH',
                    message: `🛢️ Crude Oil ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% - ${changePct > 0 ? 'Oil price surge, India pe negative impact!' : 'Oil crash, India ke liye positive!'}`,
                    data
                });
            }

        } catch (err) {
            // Silently skip failed indices
        }

        await new Promise(r => setTimeout(r, 300)); // Rate limit
    }

    // Check multi-market crash (Black Swan detection)
    const majorCrashes = results.filter(r => r.changePct < -3 && ['US', 'India'].includes(r.region));
    if (majorCrashes.length >= 3) {
        alerts.unshift({
            type: 'BLACK_SWAN',
            severity: 'CRITICAL',
            message: `🚨🚨 MULTI-MARKET CRASH DETECTED! ${majorCrashes.length} major markets down >3% - BLACK SWAN EVENT! TRADING AVOID KARO!`,
            data: majorCrashes
        });
    }

    return {
        indices: results,
        alerts,
        overallStatus: alerts.some(a => a.severity === 'CRITICAL') ? 'DANGER' :
            alerts.some(a => a.severity === 'HIGH') ? 'CAUTION' : 'NORMAL',
        timestamp: new Date().toISOString()
    };
}

// ═══════════════════════════════════════════
// 🏛️ GOVT / RBI POLICY TRACKER
// ═══════════════════════════════════════════

async function checkGovtPolicyNews() {
    const queries = [
        'RBI+repo+rate+OR+monetary+policy+OR+interest+rate+india',
        'union+budget+india+OR+gst+change+OR+tax+reform+india',
        'sebi+regulation+OR+sebi+order+OR+sebi+ban',
        'india+election+OR+government+policy+stock+market'
    ];

    const allArticles = [];

    for (const query of queries) {
        try {
            const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });

            const $ = cheerio.load(response.data, { xmlMode: true });
            $('item').each((i, el) => {
                if (i >= 5) return false;
                const title = $(el).find('title').text().trim();
                const pubDate = $(el).find('pubDate').text().trim();
                const link = $(el).find('link').text().trim();

                if (title) {
                    const sentiment = analyzeSentiment(title);
                    allArticles.push({
                        title,
                        link,
                        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                        sentiment: sentiment.sentiment,
                        sentimentScore: sentiment.score,
                        category: query.includes('RBI') ? 'RBI/Monetary' :
                            query.includes('budget') ? 'Budget/Tax' :
                            query.includes('sebi') ? 'SEBI/Regulation' : 'Political'
                    });
                }
            });
        } catch (err) {
            // Skip
        }
        await new Promise(r => setTimeout(r, 300));
    }

    // Sort by date
    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Generate impact assessment
    const impacts = [];
    for (const article of allArticles) {
        if (article.sentimentScore <= -3) {
            impacts.push({
                type: 'NEGATIVE_POLICY',
                severity: 'HIGH',
                title: article.title,
                category: article.category,
                impact: `Market pe NEGATIVE impact expected - ${article.category} related news`
            });
        } else if (article.sentimentScore >= 3) {
            impacts.push({
                type: 'POSITIVE_POLICY',
                severity: 'POSITIVE',
                title: article.title,
                category: article.category,
                impact: `Market pe POSITIVE impact expected - ${article.category} related news`
            });
        }
    }

    return {
        articles: allArticles.slice(0, 20),
        impacts,
        lastChecked: new Date().toISOString()
    };
}

// ═══════════════════════════════════════════
// 📊 COMPREHENSIVE RISK ASSESSMENT
// ═══════════════════════════════════════════

function calculateOverallRisk(newsSentiment, globalMarkets, insiderDetection, pumpDumpDetection) {
    let riskScore = 0; // 0-100 (0=safe, 100=extreme danger)
    const riskFactors = [];

    // News Sentiment Risk
    if (newsSentiment) {
        if (newsSentiment.overallSentiment === 'EXTREME_DANGER') {
            riskScore += 30;
            riskFactors.push({ factor: 'News Sentiment', level: 'CRITICAL', detail: 'Black Swan level negative news detected' });
        } else if (newsSentiment.overallSentiment === 'BEARISH' || newsSentiment.overallSentiment === 'HIGH_RISK') {
            riskScore += 15;
            riskFactors.push({ factor: 'News Sentiment', level: 'HIGH', detail: 'Negative market news dominating' });
        } else if (newsSentiment.overallSentiment === 'MILDLY_BEARISH') {
            riskScore += 8;
            riskFactors.push({ factor: 'News Sentiment', level: 'MEDIUM', detail: 'Slightly negative news environment' });
        }

        if (newsSentiment.blackSwanAlerts?.length > 0) {
            riskScore += 25;
            riskFactors.push({ factor: 'Black Swan Alert', level: 'CRITICAL', detail: `${newsSentiment.blackSwanAlerts.length} potential black swan event(s) detected!` });
        }
    }

    // Global Market Risk
    if (globalMarkets) {
        if (globalMarkets.overallStatus === 'DANGER') {
            riskScore += 25;
            riskFactors.push({ factor: 'Global Markets', level: 'CRITICAL', detail: 'Multi-market crash / extreme volatility' });
        } else if (globalMarkets.overallStatus === 'CAUTION') {
            riskScore += 12;
            riskFactors.push({ factor: 'Global Markets', level: 'HIGH', detail: 'Global market stress detected' });
        }

        // VIX check
        const vix = globalMarkets.indices?.find(i => i.symbol === '^VIX');
        if (vix && vix.price > 30) {
            riskScore += 15;
            riskFactors.push({ factor: 'VIX Fear Index', level: vix.price > 40 ? 'CRITICAL' : 'HIGH', detail: `VIX at ${vix.price} - Extreme market fear` });
        }
    }

    // Insider Activity Risk (per stock)
    if (insiderDetection?.detected) {
        if (insiderDetection.riskLevel === 'CRITICAL') {
            riskScore += 20;
            riskFactors.push({ factor: 'Insider Activity', level: 'CRITICAL', detail: 'Suspicious trading patterns detected' });
        } else if (insiderDetection.riskLevel === 'HIGH') {
            riskScore += 10;
            riskFactors.push({ factor: 'Insider Activity', level: 'HIGH', detail: 'Unusual volume patterns' });
        }
    }

    // Pump & Dump Risk (per stock)
    if (pumpDumpDetection?.detected) {
        if (pumpDumpDetection.riskLevel === 'CRITICAL') {
            riskScore += 20;
            riskFactors.push({ factor: 'Pump & Dump', level: 'CRITICAL', detail: 'Pump & dump pattern detected!' });
        } else if (pumpDumpDetection.riskLevel === 'HIGH') {
            riskScore += 10;
            riskFactors.push({ factor: 'Market Manipulation', level: 'HIGH', detail: 'Operator activity suspected' });
        }
    }

    riskScore = Math.min(100, riskScore);

    let riskLevel = 'LOW';
    let tradingAdvice = '🟢 Trading safe hai - Normal analysis follow karo';

    if (riskScore >= 70) {
        riskLevel = 'EXTREME';
        tradingAdvice = '🚨 TRADING BAND KARO! Market mein extreme risk hai. Cash mein raho. Koi bhi new position mat lo!';
    } else if (riskScore >= 50) {
        riskLevel = 'VERY_HIGH';
        tradingAdvice = '🔴 BAHUT HIGH RISK! Sirf hedged positions rakho. Naye trades avoid karo. Stop loss tight karo!';
    } else if (riskScore >= 35) {
        riskLevel = 'HIGH';
        tradingAdvice = '🟠 HIGH RISK - Cautious raho. Position size kam karo. Strict stop loss lagao.';
    } else if (riskScore >= 20) {
        riskLevel = 'MODERATE';
        tradingAdvice = '🟡 Moderate risk - Normal trading but tight stop loss ke saath. News pe nazar rakho.';
    } else {
        riskLevel = 'LOW';
        tradingAdvice = '🟢 Low risk environment - Normal trading signals follow kar sakte ho.';
    }

    return {
        riskScore,
        riskLevel,
        tradingAdvice,
        riskFactors,
        timestamp: new Date().toISOString()
    };
}

// ═══════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════

module.exports = {
    fetchAllNews,
    fetchStockSpecificNews,
    analyzeAllNewsSentiment,
    analyzeSentiment,
    detectInsiderActivity,
    detectPumpAndDump,
    checkGlobalMarkets,
    checkGovtPolicyNews,
    calculateOverallRisk
};

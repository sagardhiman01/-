const axios = require('axios');
const {
    RSI, MACD, BollingerBands, SMA, EMA, Stochastic, ADX, ATR, OBV, VWAP, WilliamsR, CCI, MFI, IchimokuCloud
} = require('technicalindicators');

// ═══════════════════════════════════════════
// TOP NIFTY 50 + POPULAR INDIAN STOCKS
// ═══════════════════════════════════════════
const STOCK_UNIVERSE = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking' },
    { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
    { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banking' },
    { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Infrastructure' },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Banking' },
    { symbol: 'WIPRO.NS', name: 'Wipro', sector: 'IT' },
    { symbol: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'IT' },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Paints' },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Auto' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', sector: 'Pharma' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Auto' },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'Finance' },
    { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'Consumer' },
    { symbol: 'NESTLEIND.NS', name: 'Nestle India', sector: 'FMCG' },
    { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement' },
    { symbol: 'POWERGRID.NS', name: 'Power Grid Corp', sector: 'Power' },
    { symbol: 'NTPC.NS', name: 'NTPC Limited', sector: 'Power' },
    { symbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Metals' },
    { symbol: 'ONGC.NS', name: 'ONGC', sector: 'Energy' },
    { symbol: 'JSWSTEEL.NS', name: 'JSW Steel', sector: 'Metals' },
    { symbol: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'Auto' },
    { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'Conglomerate' },
    { symbol: 'TECHM.NS', name: 'Tech Mahindra', sector: 'IT' },
    { symbol: 'DRREDDY.NS', name: "Dr. Reddy's", sector: 'Pharma' },
    { symbol: 'COALINDIA.NS', name: 'Coal India', sector: 'Mining' },
    { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv', sector: 'Finance' },
    { symbol: 'DIVISLAB.NS', name: 'Divis Labs', sector: 'Pharma' },
    { symbol: 'CIPLA.NS', name: 'Cipla', sector: 'Pharma' },
    { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp', sector: 'Auto' },
    { symbol: 'EICHERMOT.NS', name: 'Eicher Motors', sector: 'Auto' },
    { symbol: 'BRITANNIA.NS', name: 'Britannia Industries', sector: 'FMCG' },
    { symbol: 'GRASIM.NS', name: 'Grasim Industries', sector: 'Cement' },
    { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals', sector: 'Healthcare' },
];

function getTopNiftyStocks() {
    return STOCK_UNIVERSE;
}

// ═══════════════════════════════════════════
// FETCH STOCK DATA FROM YAHOO FINANCE
// ═══════════════════════════════════════════
async function fetchStockData(symbol, period = '6mo', interval = '1d') {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${period}&interval=${interval}&includePrePost=false`;

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
    });

    const result = response.data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const data = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (quote.close[i] !== null && quote.open[i] !== null) {
            data.push({
                date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                timestamp: timestamps[i],
                open: parseFloat(quote.open[i]?.toFixed(2)),
                high: parseFloat(quote.high[i]?.toFixed(2)),
                low: parseFloat(quote.low[i]?.toFixed(2)),
                close: parseFloat(quote.close[i]?.toFixed(2)),
                volume: quote.volume[i] || 0
            });
        }
    }

    return {
        symbol: meta.symbol,
        currency: meta.currency,
        exchange: meta.exchangeName,
        regularMarketPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose || meta.chartPreviousClose,
        data
    };
}

// ═══════════════════════════════════════════
// DEEP TECHNICAL ANALYSIS ENGINE
// ═══════════════════════════════════════════
function computeIndicators(priceData) {
    const closes = priceData.map(d => d.close);
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);
    const volumes = priceData.map(d => d.volume);

    // RSI (14)
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const currentRSI = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;

    // MACD
    const macdValues = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const currentMACD = macdValues.length > 0 ? macdValues[macdValues.length - 1] : null;

    // Bollinger Bands (20, 2)
    const bbValues = BollingerBands.calculate({
        period: 20,
        values: closes,
        stdDev: 2
    });
    const currentBB = bbValues.length > 0 ? bbValues[bbValues.length - 1] : null;

    // Moving Averages
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma50 = SMA.calculate({ period: 50, values: closes });
    const sma200 = SMA.calculate({ period: 200, values: closes });
    const ema9 = EMA.calculate({ period: 9, values: closes });
    const ema21 = EMA.calculate({ period: 21, values: closes });

    // Stochastic Oscillator
    const stochValues = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14,
        signalPeriod: 3
    });
    const currentStoch = stochValues.length > 0 ? stochValues[stochValues.length - 1] : null;

    // ADX (Average Directional Index)
    let currentADX = null;
    try {
        const adxValues = ADX.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 14
        });
        currentADX = adxValues.length > 0 ? adxValues[adxValues.length - 1] : null;
    } catch (e) { }

    // ATR (Average True Range)
    let currentATR = null;
    try {
        const atrValues = ATR.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 14
        });
        currentATR = atrValues.length > 0 ? atrValues[atrValues.length - 1] : null;
    } catch (e) { }

    // OBV (On Balance Volume)
    const obvValues = OBV.calculate({ close: closes, volume: volumes });
    const currentOBV = obvValues.length > 0 ? obvValues[obvValues.length - 1] : null;

    // Williams %R
    let currentWilliamsR = null;
    try {
        const wrValues = WilliamsR.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 14
        });
        currentWilliamsR = wrValues.length > 0 ? wrValues[wrValues.length - 1] : null;
    } catch (e) { }

    // CCI (Commodity Channel Index)
    let currentCCI = null;
    try {
        const cciValues = CCI.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 20
        });
        currentCCI = cciValues.length > 0 ? cciValues[cciValues.length - 1] : null;
    } catch (e) { }

    return {
        rsi: currentRSI ? parseFloat(currentRSI.toFixed(2)) : null,
        macd: currentMACD ? {
            MACD: parseFloat(currentMACD.MACD?.toFixed(4) || 0),
            signal: parseFloat(currentMACD.signal?.toFixed(4) || 0),
            histogram: parseFloat(currentMACD.histogram?.toFixed(4) || 0)
        } : null,
        bollingerBands: currentBB ? {
            upper: parseFloat(currentBB.upper?.toFixed(2)),
            middle: parseFloat(currentBB.middle?.toFixed(2)),
            lower: parseFloat(currentBB.lower?.toFixed(2)),
            pb: closes.length > 0 ? parseFloat(((closes[closes.length - 1] - currentBB.lower) / (currentBB.upper - currentBB.lower)).toFixed(4)) : null
        } : null,
        movingAverages: {
            sma20: sma20.length > 0 ? parseFloat(sma20[sma20.length - 1].toFixed(2)) : null,
            sma50: sma50.length > 0 ? parseFloat(sma50[sma50.length - 1].toFixed(2)) : null,
            sma200: sma200.length > 0 ? parseFloat(sma200[sma200.length - 1].toFixed(2)) : null,
            ema9: ema9.length > 0 ? parseFloat(ema9[ema9.length - 1].toFixed(2)) : null,
            ema21: ema21.length > 0 ? parseFloat(ema21[ema21.length - 1].toFixed(2)) : null,
        },
        stochastic: currentStoch ? {
            k: parseFloat(currentStoch.k?.toFixed(2)),
            d: parseFloat(currentStoch.d?.toFixed(2))
        } : null,
        adx: currentADX ? parseFloat(currentADX.adx?.toFixed(2)) : null,
        atr: currentATR ? parseFloat(currentATR.toFixed(2)) : null,
        obv: currentOBV,
        williamsR: currentWilliamsR ? parseFloat(currentWilliamsR.toFixed(2)) : null,
        cci: currentCCI ? parseFloat(currentCCI.toFixed(2)) : null
    };
}

// ═══════════════════════════════════════════
// SUPPORT & RESISTANCE DETECTION
// ═══════════════════════════════════════════
function findSupportResistance(priceData) {
    if (priceData.length < 20) return { supports: [], resistances: [] };

    const pivotHighs = [];
    const pivotLows = [];

    for (let i = 2; i < priceData.length - 2; i++) {
        // Pivot High
        if (priceData[i].high > priceData[i - 1].high &&
            priceData[i].high > priceData[i - 2].high &&
            priceData[i].high > priceData[i + 1].high &&
            priceData[i].high > priceData[i + 2].high) {
            pivotHighs.push(priceData[i].high);
        }
        // Pivot Low
        if (priceData[i].low < priceData[i - 1].low &&
            priceData[i].low < priceData[i - 2].low &&
            priceData[i].low < priceData[i + 1].low &&
            priceData[i].low < priceData[i + 2].low) {
            pivotLows.push(priceData[i].low);
        }
    }

    // Cluster nearby levels
    const clusterLevels = (levels, threshold = 0.02) => {
        if (levels.length === 0) return [];
        levels.sort((a, b) => a - b);
        const clusters = [[levels[0]]];
        for (let i = 1; i < levels.length; i++) {
            const lastCluster = clusters[clusters.length - 1];
            const avgCluster = lastCluster.reduce((a, b) => a + b, 0) / lastCluster.length;
            if (Math.abs(levels[i] - avgCluster) / avgCluster < threshold) {
                lastCluster.push(levels[i]);
            } else {
                clusters.push([levels[i]]);
            }
        }
        return clusters
            .map(c => ({
                level: parseFloat((c.reduce((a, b) => a + b, 0) / c.length).toFixed(2)),
                strength: c.length
            }))
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 5);
    };

    return {
        supports: clusterLevels(pivotLows),
        resistances: clusterLevels(pivotHighs)
    };
}

// ═══════════════════════════════════════════
// CANDLESTICK PATTERN DETECTION
// ═══════════════════════════════════════════
function detectCandlePatterns(priceData) {
    if (priceData.length < 3) return [];
    const patterns = [];
    const last = priceData.length - 1;

    for (let i = Math.max(2, priceData.length - 5); i <= last; i++) {
        const curr = priceData[i];
        const prev = priceData[i - 1];
        const bodySize = Math.abs(curr.close - curr.open);
        const upperShadow = curr.high - Math.max(curr.open, curr.close);
        const lowerShadow = Math.min(curr.open, curr.close) - curr.low;
        const totalRange = curr.high - curr.low;

        // Doji
        if (totalRange > 0 && bodySize / totalRange < 0.1) {
            patterns.push({ name: 'Doji', type: 'neutral', date: curr.date, description: 'Indecision in market' });
        }

        // Hammer (bullish)
        if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5 && curr.close < prev.close) {
            patterns.push({ name: 'Hammer', type: 'bullish', date: curr.date, description: 'Potential reversal from downtrend' });
        }

        // Shooting Star (bearish)
        if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5 && curr.close > prev.close) {
            patterns.push({ name: 'Shooting Star', type: 'bearish', date: curr.date, description: 'Potential reversal from uptrend' });
        }

        // Bullish Engulfing
        if (i >= 1 && prev.close < prev.open && curr.close > curr.open &&
            curr.open <= prev.close && curr.close >= prev.open) {
            patterns.push({ name: 'Bullish Engulfing', type: 'bullish', date: curr.date, description: 'Strong bullish reversal signal' });
        }

        // Bearish Engulfing
        if (i >= 1 && prev.close > prev.open && curr.close < curr.open &&
            curr.open >= prev.close && curr.close <= prev.open) {
            patterns.push({ name: 'Bearish Engulfing', type: 'bearish', date: curr.date, description: 'Strong bearish reversal signal' });
        }

        // Morning Star (3 candle bullish)
        if (i >= 2) {
            const prev2 = priceData[i - 2];
            const smallBody = Math.abs(prev.close - prev.open) < (Math.abs(prev2.close - prev2.open) * 0.3);
            if (prev2.close < prev2.open && smallBody && curr.close > curr.open &&
                curr.close > (prev2.open + prev2.close) / 2) {
                patterns.push({ name: 'Morning Star', type: 'bullish', date: curr.date, description: 'Strong 3-candle bullish reversal' });
            }
        }

        // Evening Star (3 candle bearish)
        if (i >= 2) {
            const prev2 = priceData[i - 2];
            const smallBody = Math.abs(prev.close - prev.open) < (Math.abs(prev2.close - prev2.open) * 0.3);
            if (prev2.close > prev2.open && smallBody && curr.close < curr.open &&
                curr.close < (prev2.open + prev2.close) / 2) {
                patterns.push({ name: 'Evening Star', type: 'bearish', date: curr.date, description: 'Strong 3-candle bearish reversal' });
            }
        }
    }

    return patterns;
}

// ═══════════════════════════════════════════
// VOLUME ANALYSIS
// ═══════════════════════════════════════════
function analyzeVolume(priceData) {
    if (priceData.length < 20) return null;

    const recentVols = priceData.slice(-5).map(d => d.volume);
    const avgVol20 = priceData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
    const currentVol = recentVols[recentVols.length - 1];
    const volRatio = currentVol / avgVol20;

    let volumeSignal = 'NORMAL';
    if (volRatio > 2) volumeSignal = 'VERY_HIGH';
    else if (volRatio > 1.5) volumeSignal = 'HIGH';
    else if (volRatio < 0.5) volumeSignal = 'VERY_LOW';
    else if (volRatio < 0.7) volumeSignal = 'LOW';

    // Volume trend
    const vol5 = recentVols.reduce((a, b) => a + b, 0) / 5;
    const prevVol5 = priceData.slice(-10, -5).reduce((s, d) => s + d.volume, 0) / 5;
    const volTrend = vol5 > prevVol5 ? 'INCREASING' : 'DECREASING';

    return {
        currentVolume: currentVol,
        avgVolume20: Math.round(avgVol20),
        volumeRatio: parseFloat(volRatio.toFixed(2)),
        signal: volumeSignal,
        trend: volTrend
    };
}

// ═══════════════════════════════════════════
// TREND ANALYSIS
// ═══════════════════════════════════════════
function analyzeTrend(priceData, indicators) {
    const closes = priceData.map(d => d.close);
    const currentPrice = closes[closes.length - 1];
    let score = 0;
    const signals = [];

    // MA Trend
    const { sma20, sma50, sma200, ema9, ema21 } = indicators.movingAverages;

    if (sma20 && currentPrice > sma20) { score += 1; signals.push('Price > SMA20 ✅'); }
    else if (sma20) { score -= 1; signals.push('Price < SMA20 ❌'); }

    if (sma50 && currentPrice > sma50) { score += 1; signals.push('Price > SMA50 ✅'); }
    else if (sma50) { score -= 1; signals.push('Price < SMA50 ❌'); }

    if (sma200 && currentPrice > sma200) { score += 2; signals.push('Price > SMA200 ✅ (Long-term bullish)'); }
    else if (sma200) { score -= 2; signals.push('Price < SMA200 ❌ (Long-term bearish)'); }

    // Golden/Death Cross
    if (sma50 && sma200) {
        if (sma50 > sma200) { score += 2; signals.push('Golden Cross Active 🌟'); }
        else { score -= 2; signals.push('Death Cross Active 💀'); }
    }

    // EMA Crossover
    if (ema9 && ema21) {
        if (ema9 > ema21) { score += 1; signals.push('EMA9 > EMA21 (Bullish) ✅'); }
        else { score -= 1; signals.push('EMA9 < EMA21 (Bearish) ❌'); }
    }

    // RSI
    if (indicators.rsi !== null) {
        if (indicators.rsi < 30) { score += 2; signals.push(`RSI ${indicators.rsi} - Oversold 🟢`); }
        else if (indicators.rsi < 40) { score += 1; signals.push(`RSI ${indicators.rsi} - Near Oversold`); }
        else if (indicators.rsi > 70) { score -= 2; signals.push(`RSI ${indicators.rsi} - Overbought 🔴`); }
        else if (indicators.rsi > 60) { score -= 1; signals.push(`RSI ${indicators.rsi} - Near Overbought`); }
        else { signals.push(`RSI ${indicators.rsi} - Neutral`); }
    }

    // MACD
    if (indicators.macd) {
        if (indicators.macd.histogram > 0) { score += 1; signals.push('MACD Histogram Positive ✅'); }
        else { score -= 1; signals.push('MACD Histogram Negative ❌'); }

        if (indicators.macd.MACD > indicators.macd.signal) { score += 1; signals.push('MACD Bullish Crossover ✅'); }
        else { score -= 1; signals.push('MACD Bearish Crossover ❌'); }
    }

    // Stochastic
    if (indicators.stochastic) {
        if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
            score += 1; signals.push('Stochastic Oversold 🟢');
        } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
            score -= 1; signals.push('Stochastic Overbought 🔴');
        }
    }

    // Bollinger Bands
    if (indicators.bollingerBands) {
        if (indicators.bollingerBands.pb < 0) { score += 1; signals.push('Below Lower BB (Oversold) 🟢'); }
        else if (indicators.bollingerBands.pb > 1) { score -= 1; signals.push('Above Upper BB (Overbought) 🔴'); }
    }

    // ADX - Trend Strength
    if (indicators.adx) {
        if (indicators.adx > 25) signals.push(`ADX ${indicators.adx} - Strong Trend 💪`);
        else signals.push(`ADX ${indicators.adx} - Weak/No Trend`);
    }

    // Williams %R
    if (indicators.williamsR !== null) {
        if (indicators.williamsR < -80) { score += 1; signals.push(`Williams %R ${indicators.williamsR} - Oversold 🟢`); }
        else if (indicators.williamsR > -20) { score -= 1; signals.push(`Williams %R ${indicators.williamsR} - Overbought 🔴`); }
    }

    // CCI
    if (indicators.cci !== null) {
        if (indicators.cci < -100) { score += 1; signals.push(`CCI ${indicators.cci} - Oversold 🟢`); }
        else if (indicators.cci > 100) { score -= 1; signals.push(`CCI ${indicators.cci} - Overbought 🔴`); }
    }

    // Determine overall trend
    let trend = 'NEUTRAL';
    let strength = 'Moderate';
    if (score >= 6) { trend = 'STRONG_BUY'; strength = 'Very Strong'; }
    else if (score >= 3) { trend = 'BUY'; strength = 'Strong'; }
    else if (score >= 1) { trend = 'WEAK_BUY'; strength = 'Moderate'; }
    else if (score <= -6) { trend = 'STRONG_SELL'; strength = 'Very Strong'; }
    else if (score <= -3) { trend = 'SELL'; strength = 'Strong'; }
    else if (score <= -1) { trend = 'WEAK_SELL'; strength = 'Moderate'; }

    return { trend, score, strength, signals, maxScore: 14 };
}

// ═══════════════════════════════════════════
// PRICE PREDICTION (STATISTICAL)
// ═══════════════════════════════════════════
function predictPrice(priceData, indicators) {
    const closes = priceData.map(d => d.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate momentum
    const returns5 = (currentPrice - closes[closes.length - 6]) / closes[closes.length - 6];
    const returns10 = closes.length > 10 ? (currentPrice - closes[closes.length - 11]) / closes[closes.length - 11] : 0;
    const returns20 = closes.length > 20 ? (currentPrice - closes[closes.length - 21]) / closes[closes.length - 21] : 0;

    // Volatility
    const dailyReturns = [];
    for (let i = 1; i < Math.min(20, closes.length); i++) {
        dailyReturns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]);
    }
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance);

    // Estimated moves
    const prediction1d = currentPrice * (1 + avgReturn);
    const prediction1w = currentPrice * (1 + avgReturn * 5);
    const prediction1m = currentPrice * (1 + avgReturn * 22);

    // Risk range
    const risk1d = currentPrice * volatility;
    const risk1w = currentPrice * volatility * Math.sqrt(5);
    const risk1m = currentPrice * volatility * Math.sqrt(22);

    return {
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        momentum: {
            '5day': parseFloat((returns5 * 100).toFixed(2)),
            '10day': parseFloat((returns10 * 100).toFixed(2)),
            '20day': parseFloat((returns20 * 100).toFixed(2))
        },
        volatility: parseFloat((volatility * 100).toFixed(2)),
        estimates: {
            '1day': {
                target: parseFloat(prediction1d.toFixed(2)),
                range: {
                    low: parseFloat((prediction1d - risk1d * 2).toFixed(2)),
                    high: parseFloat((prediction1d + risk1d * 2).toFixed(2))
                }
            },
            '1week': {
                target: parseFloat(prediction1w.toFixed(2)),
                range: {
                    low: parseFloat((prediction1w - risk1w * 2).toFixed(2)),
                    high: parseFloat((prediction1w + risk1w * 2).toFixed(2))
                }
            },
            '1month': {
                target: parseFloat(prediction1m.toFixed(2)),
                range: {
                    low: parseFloat((prediction1m - risk1m * 2).toFixed(2)),
                    high: parseFloat((prediction1m + risk1m * 2).toFixed(2))
                }
            }
        }
    };
}

// ═══════════════════════════════════════════
// GENERATE TRADING RECOMMENDATION
// ═══════════════════════════════════════════
function generateRecommendation(trendAnalysis, indicators, volumeAnalysis, supportResistance, candlePatterns, prediction) {
    const { trend, score } = trendAnalysis;
    let action = 'HOLD';
    let confidence = 50;
    let reasoning = [];
    let targetPrice = prediction.currentPrice;
    let stopLoss = prediction.currentPrice;

    if (trend === 'STRONG_BUY' || trend === 'BUY') {
        action = 'BUY';
        confidence = trend === 'STRONG_BUY' ? 85 : 70;

        // Target = nearest resistance
        if (supportResistance.resistances.length > 0) {
            const nearestResistance = supportResistance.resistances
                .filter(r => r.level > prediction.currentPrice)
                .sort((a, b) => a.level - b.level)[0];
            targetPrice = nearestResistance ? nearestResistance.level : prediction.estimates['1week'].target;
        } else {
            targetPrice = prediction.estimates['1week'].target;
        }

        // Stop Loss = nearest support
        if (supportResistance.supports.length > 0) {
            const nearestSupport = supportResistance.supports
                .filter(s => s.level < prediction.currentPrice)
                .sort((a, b) => b.level - a.level)[0];
            stopLoss = nearestSupport ? nearestSupport.level : prediction.estimates['1week'].range.low;
        } else {
            stopLoss = prediction.estimates['1week'].range.low;
        }

        reasoning.push('Technical indicators are bullish');
        if (volumeAnalysis && (volumeAnalysis.signal === 'HIGH' || volumeAnalysis.signal === 'VERY_HIGH')) {
            confidence += 5;
            reasoning.push('High volume confirms the move');
        }
        if (candlePatterns.some(p => p.type === 'bullish')) {
            confidence += 5;
            reasoning.push('Bullish candlestick patterns detected');
        }
    } else if (trend === 'STRONG_SELL' || trend === 'SELL') {
        action = 'SELL';
        confidence = trend === 'STRONG_SELL' ? 85 : 70;

        if (supportResistance.supports.length > 0) {
            const nearestSupport = supportResistance.supports
                .filter(s => s.level < prediction.currentPrice)
                .sort((a, b) => b.level - a.level)[0];
            targetPrice = nearestSupport ? nearestSupport.level : prediction.estimates['1week'].range.low;
        } else {
            targetPrice = prediction.estimates['1week'].range.low;
        }

        stopLoss = prediction.estimates['1day'].range.high;

        reasoning.push('Technical indicators are bearish');
        if (candlePatterns.some(p => p.type === 'bearish')) {
            confidence += 5;
            reasoning.push('Bearish candlestick patterns detected');
        }
    } else if (trend === 'WEAK_BUY') {
        action = 'WEAK_BUY';
        confidence = 55;
        targetPrice = prediction.estimates['1week'].target;
        stopLoss = prediction.estimates['1day'].range.low;
        reasoning.push('Slightly bullish, wait for confirmation');
    } else if (trend === 'WEAK_SELL') {
        action = 'WEAK_SELL';
        confidence = 55;
        targetPrice = prediction.estimates['1week'].range.low;
        stopLoss = prediction.estimates['1day'].range.high;
        reasoning.push('Slightly bearish, wait for confirmation');
    } else {
        action = 'HOLD';
        confidence = 50;
        reasoning.push('No clear direction, wait for breakout');
    }

    confidence = Math.min(95, confidence);

    const riskReward = stopLoss !== prediction.currentPrice ?
        parseFloat(Math.abs((targetPrice - prediction.currentPrice) / (prediction.currentPrice - stopLoss)).toFixed(2)) : 0;

    return {
        action,
        confidence,
        targetPrice: parseFloat(targetPrice.toFixed(2)),
        stopLoss: parseFloat(stopLoss.toFixed(2)),
        riskRewardRatio: riskReward,
        reasoning,
        todayAction: generateTodayAction(action, confidence, prediction)
    };
}

function generateTodayAction(action, confidence, prediction) {
    if (action === 'BUY' || action === 'STRONG_BUY') {
        if (confidence >= 75) return '🟢 AAJ BUY KARO - Strong signals mil rahe hain';
        return '🟡 BUY consider karo - Signals theek hain';
    }
    if (action === 'SELL' || action === 'STRONG_SELL') {
        if (confidence >= 75) return '🔴 AAJ SELL KARO - Bearish signals strong hain';
        return '🟡 SELL consider karo - Caution needed';
    }
    if (action === 'WEAK_BUY') return '🟡 Wait karo - Thoda bullish hai, confirmation chahiye';
    if (action === 'WEAK_SELL') return '🟡 Wait karo - Thoda bearish hai, confirmation chahiye';
    return '⚪ HOLD - Abhi koi clear signal nahi hai';
}

// ═══════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════
async function analyzeStock(symbol, period = '6mo') {
    // Add .NS suffix if not present for NSE stocks
    let fullSymbol = symbol;
    if (!symbol.includes('.')) {
        fullSymbol = symbol + '.NS';
    }

    console.log(`📊 Analyzing ${fullSymbol}...`);

    const stockData = await fetchStockData(fullSymbol, period);
    if (!stockData.data || stockData.data.length < 20) {
        throw new Error(`Not enough data for ${fullSymbol}. Got ${stockData.data?.length || 0} data points.`);
    }

    const indicators = computeIndicators(stockData.data);
    const supportResistance = findSupportResistance(stockData.data);
    const candlePatterns = detectCandlePatterns(stockData.data);
    const volumeAnalysis = analyzeVolume(stockData.data);
    const trendAnalysis = analyzeTrend(stockData.data, indicators);
    const prediction = predictPrice(stockData.data, indicators);
    const recommendation = generateRecommendation(trendAnalysis, indicators, volumeAnalysis, supportResistance, candlePatterns, prediction);

    // Find stock info
    const stockInfo = STOCK_UNIVERSE.find(s => s.symbol === fullSymbol) || { name: fullSymbol, sector: 'Unknown' };

    // Price changes
    const latestData = stockData.data[stockData.data.length - 1];
    const prevData = stockData.data[stockData.data.length - 2];
    const dayChange = parseFloat((latestData.close - prevData.close).toFixed(2));
    const dayChangePct = parseFloat(((dayChange / prevData.close) * 100).toFixed(2));

    return {
        symbol: fullSymbol.replace('.NS', ''),
        fullSymbol,
        name: stockInfo.name,
        sector: stockInfo.sector,
        currentPrice: stockData.regularMarketPrice || latestData.close,
        previousClose: stockData.previousClose || prevData.close,
        dayChange,
        dayChangePct,
        exchange: stockData.exchange,
        currency: stockData.currency,
        lastUpdated: latestData.date,
        indicators,
        trendAnalysis,
        supportResistance,
        candlePatterns,
        volumeAnalysis,
        prediction,
        recommendation,
        priceHistory: stockData.data.slice(-60) // Last 60 days for chart
    };
}

// ═══════════════════════════════════════════
// DAILY REPORT GENERATOR
// ═══════════════════════════════════════════
async function generateDailyReport() {
    console.log('\n📋 ═══ Generating Daily Report ═══');

    const topStocks = STOCK_UNIVERSE.slice(0, 25); // Analyze top 25
    const results = [];

    for (const stock of topStocks) {
        try {
            const analysis = await analyzeStock(stock.symbol, '6mo');
            results.push(analysis);
            console.log(`  ✅ ${stock.symbol}: ${analysis.recommendation.action} (${analysis.recommendation.confidence}%)`);
        } catch (err) {
            console.log(`  ❌ ${stock.symbol}: ${err.message}`);
        }
        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
    }

    // Sort by confidence and action
    const buySignals = results
        .filter(r => r.recommendation.action === 'BUY' || r.recommendation.action === 'STRONG_BUY')
        .sort((a, b) => b.recommendation.confidence - a.recommendation.confidence);

    const sellSignals = results
        .filter(r => r.recommendation.action === 'SELL' || r.recommendation.action === 'STRONG_SELL')
        .sort((a, b) => b.recommendation.confidence - a.recommendation.confidence);

    const holdStocks = results
        .filter(r => r.recommendation.action === 'HOLD' || r.recommendation.action.startsWith('WEAK'))
        .sort((a, b) => b.recommendation.confidence - a.recommendation.confidence);

    // Top movers
    const topGainers = [...results].sort((a, b) => b.dayChangePct - a.dayChangePct).slice(0, 5);
    const topLosers = [...results].sort((a, b) => a.dayChangePct - b.dayChangePct).slice(0, 5);

    const report = {
        generatedAt: new Date().toISOString(),
        type: 'morning',
        marketDate: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        summary: {
            totalAnalyzed: results.length,
            buySignals: buySignals.length,
            sellSignals: sellSignals.length,
            holdStocks: holdStocks.length,
            marketSentiment: buySignals.length > sellSignals.length * 1.5 ? 'BULLISH' :
                sellSignals.length > buySignals.length * 1.5 ? 'BEARISH' : 'NEUTRAL'
        },
        recommendations: {
            strongBuys: buySignals.filter(s => s.recommendation.action === 'STRONG_BUY'),
            buys: buySignals.filter(s => s.recommendation.action === 'BUY'),
            sells: sellSignals.filter(s => s.recommendation.action === 'SELL'),
            strongSells: sellSignals.filter(s => s.recommendation.action === 'STRONG_SELL'),
            holds: holdStocks
        },
        topGainers,
        topLosers,
        allStocks: results
    };

    console.log(`\n📊 Report: ${buySignals.length} BUY | ${sellSignals.length} SELL | ${holdStocks.length} HOLD`);
    console.log(`🔥 Market Sentiment: ${report.summary.marketSentiment}\n`);

    return report;
}

module.exports = { analyzeStock, generateDailyReport, fetchStockData, getTopNiftyStocks };

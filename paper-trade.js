const { fetchStockData } = require('./analysis-engine');

let portfolio = {
    balance: 100000,
    invested: 0,
    positions: [], // { id, symbol, quantity, buyPrice, type: 'INTRADAY'|'DELIVERY', timestamp }
    history: []    // { id, symbol, quantity, buyPrice, sellPrice, type, realizedPnL, timestamp }
};

let tradeIdCounter = 1;

async function executeTrade(symbol, action, quantity, type, price) {
    if (!symbol || !quantity || quantity <= 0 || !price || price <= 0) {
        throw new Error("Invalid trade parameters");
    }

    const totalValue = quantity * price;

    if (action === 'BUY') {
        if (portfolio.balance < totalValue) {
            throw new Error(`Insufficient funds. Required: ₹${totalValue.toFixed(2)}, Available: ₹${portfolio.balance.toFixed(2)}`);
        }

        portfolio.balance -= totalValue;
        portfolio.invested += totalValue;

        portfolio.positions.push({
            id: tradeIdCounter++,
            symbol,
            quantity,
            buyPrice: price,
            type,
            timestamp: new Date().toISOString()
        });

        return { success: true, message: `Bought ${quantity} shares of ${symbol} for ₹${totalValue.toFixed(2)}` };

    } else if (action === 'SELL') {
        // Find existing position for simplicity (assuming FIFO if multiple, but here we just sell from the first available)
        let posIndex = portfolio.positions.findIndex(p => p.symbol === symbol && p.type === type);
        
        if (posIndex === -1) {
            throw new Error(`No open ${type} position found for ${symbol} to sell.`);
        }

        let pos = portfolio.positions[posIndex];
        
        if (quantity > pos.quantity) {
            throw new Error(`Cannot sell ${quantity} shares. You only own ${pos.quantity} in this position.`);
        }

        const realizedPnL = (price - pos.buyPrice) * quantity;
        const totalGotBack = (price * quantity);
        
        portfolio.balance += totalGotBack;
        portfolio.invested -= (pos.buyPrice * quantity);

        portfolio.history.push({
            id: pos.id,
            symbol,
            quantity,
            buyPrice: pos.buyPrice,
            sellPrice: price,
            type,
            realizedPnL,
            sellTimestamp: new Date().toISOString(),
            buyTimestamp: pos.timestamp
        });

        // Update or remove position
        if (quantity === pos.quantity) {
            portfolio.positions.splice(posIndex, 1);
        } else {
            pos.quantity -= quantity;
        }

        return { success: true, message: `Sold ${quantity} shares of ${symbol}. P&L: ₹${realizedPnL.toFixed(2)}` };
    } else {
        throw new Error("Invalid action. Must be BUY or SELL");
    }
}

async function getPortfolioState() {
    let currentInvestedValue = 0;
    
    // Fetch live prices for all open positions to calculate unrealized P&L
    const livePositions = await Promise.all(portfolio.positions.map(async (pos) => {
        try {
            const data = await fetchStockData(pos.symbol, '1d');
            const currentPrice = data.regularMarketPrice || data.data[data.data.length - 1].close;
            const currentTotalValue = currentPrice * pos.quantity;
            currentInvestedValue += currentTotalValue;
            
            return {
                ...pos,
                livePrice: currentPrice,
                currentValue: currentTotalValue,
                unrealizedPnL: currentTotalValue - (pos.buyPrice * pos.quantity),
                pnlPercent: ((currentPrice - pos.buyPrice) / pos.buyPrice) * 100
            };
        } catch (error) {
            console.error(`Failed to fetch live price for ${pos.symbol}:`, error);
            const fallbackValue = pos.buyPrice * pos.quantity;
            currentInvestedValue += fallbackValue;
            return {
                ...pos,
                livePrice: pos.buyPrice, // Fallback to buy price if API fails
                currentValue: fallbackValue,
                unrealizedPnL: 0,
                pnlPercent: 0
            };
        }
    }));

    const totalPortfolioValue = portfolio.balance + currentInvestedValue;
    const totalUnrealizedPnL = currentInvestedValue - portfolio.invested;

    return {
        balance: portfolio.balance,
        investedAmount: portfolio.invested,
        currentInvestedValue: currentInvestedValue,
        totalPortfolioValue: totalPortfolioValue,
        totalUnrealizedPnL: totalUnrealizedPnL,
        positions: livePositions,
        history: portfolio.history
    };
}

module.exports = { executeTrade, getPortfolioState };

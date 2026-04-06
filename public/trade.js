// ═══════════════════════════════════════════
// 💸 VIRTUAL PAPER TRADING LOGIC
// ═══════════════════════════════════════════
let currentTradeSymbol = null;
let currentTradePrice = 0;

async function loadPortfolio() {
    try {
        const res = await fetch('/api/portfolio');
        const d = await res.json();
        if(!d.success) return alert("Failed to load portfolio: " + d.message);
        
        const state = d.data;
        
        document.getElementById('port-balance').textContent = `₹${state.balance.toFixed(2)}`;
        document.getElementById('port-invested').textContent = `₹${state.currentInvestedValue.toFixed(2)}`;
        document.getElementById('port-current').textContent = `₹${state.totalPortfolioValue.toFixed(2)}`;
        
        const pnlEl = document.getElementById('port-pnl');
        pnlEl.textContent = `₹${state.totalUnrealizedPnL.toFixed(2)}`;
        pnlEl.className = 'stat-value ' + (state.totalUnrealizedPnL >= 0 ? 'positive' : 'negative');
        
        const posBody = document.getElementById('portfolio-positions');
        if(state.positions.length === 0) {
            posBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted)">No active positions</td></tr>`;
        } else {
            posBody.innerHTML = state.positions.map(p => `
                <tr>
                    <td><strong>${p.symbol}</strong></td>
                    <td><span class="section-badge" style="background:var(--bg-input)">${p.type}</span></td>
                    <td>${p.quantity}</td>
                    <td>₹${p.buyPrice.toFixed(2)}</td>
                    <td>₹${p.livePrice.toFixed(2)}</td>
                    <td class="${p.unrealizedPnL >= 0 ? 'positive' : 'negative'}">₹${p.unrealizedPnL.toFixed(2)} (${p.pnlPercent.toFixed(2)}%)</td>
                    <td><button class="btn-small action-primary" onclick="quickSell('${p.symbol}', ${p.quantity}, '${p.type}', ${p.livePrice})" style="background:var(--red)">Sell</button></td>
                </tr>
            `).join('');
        }
        
        const histBody = document.getElementById('portfolio-history');
        if(state.history.length === 0) {
            histBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">No trade history</td></tr>`;
        } else {
            // Reverse so newest is first
            const revHist = [...state.history].reverse();
            histBody.innerHTML = revHist.map(h => `
                <tr>
                    <td><strong>${h.symbol}</strong></td>
                    <td><span class="section-badge" style="background:var(--bg-input)">${h.type}</span></td>
                    <td>${h.quantity}</td>
                    <td>₹${h.buyPrice.toFixed(2)}</td>
                    <td>₹${h.sellPrice.toFixed(2)}</td>
                    <td class="${h.realizedPnL >= 0 ? 'positive' : 'negative'}"><strong>₹${h.realizedPnL.toFixed(2)}</strong></td>
                </tr>
            `).join('');
        }
        
    } catch(err) {
        console.error("loadPortfolio error", err);
    }
}

async function quickSell(symbol, quantity, type, price) {
    if(!confirm(`Are you sure you want to sell ${quantity} shares of ${symbol} at ₹${price.toFixed(2)}?`)) return;
    try {
        const res = await fetch('/api/trade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, action: 'SELL', quantity, type, price })
        });
        const d = await res.json();
        if(d.success) {
            showToast(d.message);
            loadPortfolio();
        } else {
            alert(d.message);
        }
    } catch(err) {
        alert("Trade execution failed.");
    }
}

function handleTradeAction(action) {
    if(!currentTradeSymbol || currentTradePrice <= 0) return alert("Analysis data is missing. Please re-analyze.");
    const qty = parseInt(document.getElementById('trade-qty').value);
    const type = document.getElementById('trade-type').value;
    if(isNaN(qty) || qty <= 0) return alert("Enter a valid quantity.");
    
    // confirmation
    const actWord = action === 'BUY' ? 'Buy' : 'Sell (Short)';
    if(!confirm(`Do you want to ${actWord} ${qty} shares of ${currentTradeSymbol} as ${type} at ₹${currentTradePrice.toFixed(2)}?`)) return;
    
    fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: currentTradeSymbol, action, quantity: qty, type, price: currentTradePrice })
    }).then(r=>r.json()).then(d => {
        const msgBox = document.getElementById('trade-msg');
        if(d.success) {
            msgBox.style.color = 'var(--green)';
            msgBox.textContent = `✅ Order Executed: ${d.message}`;
            showToast(d.message);
            // Optionally clear inputs
            document.getElementById('trade-qty').value = '';
            // Load portfolio in background
            loadPortfolio();
        } else {
            msgBox.style.color = 'var(--red)';
            msgBox.textContent = `❌ Order Failed: ${d.message}`;
            alert(d.message);
        }
    }).catch(e => {
        document.getElementById('trade-msg').textContent = "❌ Connection Error";
        document.getElementById('trade-msg').style.color = 'var(--red)';
    });
}

// app.js

class BithumbDashboard {
  constructor() {
    this.coinList = ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'AVAX', 'DOGE', 'MATIC', 'DOT', 'BCH', 'TRX', 'ETC', 'EOS', 'LTC', 'LINK', 'XLM', 'AAVE', 'ATOM', 'SAND', 'AXS'];
    this.apiUrl = 'https://api.bithumb.com/public/ticker/';
    this.interval = 30 * 60 * 1000; // 30분
    this.signalLog = [];
    this.start();
  }

  start() {
    this.fetchAndRenderAll();
    setInterval(() => this.fetchAndRenderAll(), this.interval);
  }

  async fetchAndRenderAll() {
    const marketData = await this.fetchMarketData();
    this.renderMarketData(marketData);
    this.renderSignalLog();
  }

  async fetchMarketData() {
    const results = [];
    for (const coin of this.coinList) {
      try {
        const res = await fetch(`${this.apiUrl}${coin}_KRW`);
        const json = await res.json();
        const data = json.data;

        const close = parseFloat(data.closing_price);
        const open = parseFloat(data.opening_price);
        const changeRate = ((close - open) / open * 100).toFixed(2);
        const volume = parseFloat(data.units_traded_24H);

        const rsi = this.mockIndicator();
        const macd = this.mockIndicator();
        const cci = this.mockIndicator();
        const onchain = this.mockOnchain();

        const priceHistory = this.generateMockHistory(close);
        const buyZone = this.calculateBuyZone(priceHistory);

        const isStrongBuy = rsi > 70 && macd > 70 && cci > 70 && parseFloat(changeRate) > 2;

        if (isStrongBuy) {
          this.signalLog.push({
            time: new Date().toLocaleTimeString(),
            coin,
            close,
            rsi,
            macd,
            cci,
            onchain,
            volume,
            buyZone
          });
        }

        results.push({ coin, close, changeRate, rsi, macd, cci, onchain, volume, buyZone, isStrongBuy });
      } catch (e) {
        console.error(`${coin} 데이터 오류:`, e);
      }
    }
    return results;
  }

  renderMarketData(data) {
    const tbody = document.getElementById('market-data-body');
    tbody.innerHTML = '';
    data.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.coin}</td>
        <td>${d.close.toLocaleString()}</td>
        <td>${d.changeRate}%</td>
        <td>${d.rsi}</td>
        <td>${d.macd}</td>
        <td>${d.cci}</td>
        <td>${d.onchain}</td>
        <td>${d.volume.toLocaleString()}</td>
        <td>${d.buyZone.toLocaleString()}</td>
        <td>${d.isStrongBuy ? '🔥 강력매수' : ''}</td>
        <td>${d.isStrongBuy ? '✅' : ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderSignalLog() {
    const tbody = document.getElementById('signal-log-body');
    tbody.innerHTML = '';
    this.signalLog.slice(-10).reverse().forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${log.time}</td>
        <td>${log.coin}</td>
        <td>${log.close.toLocaleString()}</td>
        <td>${log.rsi}</td>
        <td>${log.macd}</td>
        <td>${log.cci}</td>
        <td>${log.onchain}</td>
        <td>${log.volume.toLocaleString()}</td>
        <td>${log.buyZone.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  mockIndicator() {
    return Math.floor(Math.random() * 100);
  }

  mockOnchain() {
    return Math.floor(Math.random() * 1000);
  }

  generateMockHistory(latestPrice) {
    const history = [];
    for (let i = 0; i < 50; i++) {
      const delta = (Math.random() - 0.5) * 0.1 * latestPrice;
      history.push(latestPrice + delta);
    }
    return history;
  }

  calculateBuyZone(history) {
    const sorted = history.sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.2);
    return Math.floor(sorted[idx]);
  }
}

// 실행
new BithumbDashboard();

// ✅ 실시간 데이터 기반 강력매수 로직 + 거래량/김프/온체인 연동 + 시그널 로그/필터/정렬 기능 추가 + 시그널 리스트뷰 + 매수 적정가 표시 추가
class BithumDashboard {
  constructor() {
    this.apiBase = 'https://api.bithumb.com/public';
    this.marketData = new Map();
    this.selectedCoin = null;
    this.chart = null;
    this.socket = null;
    this.priceHistory = {}; 
    this.allowedCoins = new Set(); 
    this.onchainInflow = {}; 
    this.signalLog = []; 
    this.volumeData = {}; 
    this.premiumData = {}; 
    this.top20Coins = [];
    this.fetchTopCoinsAndOnchainData();
    this.connectWebSocket();
    this.setupUIEvents();
    setInterval(() => this.fetchTopCoinsAndOnchainData(), 1000 * 60 * 30); // 30분마다 재요청
  }

  calculateBuyZone(prices) {
    if (prices.length < 20) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.2)];
    return low; // 하위 20% 지점 기준
  }

  renderSignalLog() {
    const container = document.getElementById('signal-log-body');
    if (!container) return;
    container.innerHTML = '';
    this.signalLog.slice(-100).reverse().forEach(entry => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${entry.time}</td>
        <td>${entry.symbol}</td>
        <td>₩${Math.round(entry.price).toLocaleString()}</td>
        <td>${entry.rsi}</td>
        <td>${entry.macd}</td>
        <td>${entry.cci}</td>
        <td>₩${entry.inflow}</td>
        <td>${entry.volume}</td>
        <td>₩${entry.buyZone}</td>
      `;
      container.appendChild(row);
    });
  }

  async connectWebSocket() {
    while (!this.top20Coins.length) {
      await new Promise(r => setTimeout(r, 500));
    }

    this.socket = new WebSocket('wss://pubwss.bithumb.com/pub/ws');

    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({
        type: 'ticker',
        symbols: this.top20Coins.map(c => `${c}_KRW`),
        tickTypes: ['24H']
      }));
    });

    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data && data.content) {
        const coin = data.content.symbol.split('_')[0];
        const price = Number(data.content.closePrice);
        const change24h = Number(data.content.chgRate);
        const volume = Number(data.content.value);

        const timestamp = new Date();
        if (!this.priceHistory[coin]) this.priceHistory[coin] = [];
        this.priceHistory[coin].push({ time: timestamp, price });
        if (this.priceHistory[coin].length > 100) this.priceHistory[coin].shift();

        this.volumeData[coin] = volume;
        const prices = this.priceHistory[coin].map(p => p.price);
        if (prices.length < 30) return;

        const rsi = this.calculateRSI(prices);
        const macdResult = this.calculateMACD(prices);
        const cci = this.calculateCCI(this.priceHistory[coin]);
        const buyZone = this.calculateBuyZone(prices);

        const inflow = this.onchainInflow[coin] || 0;
        const inflowLimit = 500000000;

        const signal = (rsi < 30 && macdResult.macd > 0 && cci < -100 && inflow < inflowLimit)
          ? 'STRONG_BUY' : 'HOLD';

        if (signal === 'STRONG_BUY') {
          this.marketData.set(coin, {
            symbol: coin,
            price,
            change24h,
            rsi,
            macd: macdResult,
            cci,
            signal,
            inflow,
            volume,
            buyZone
          });
          this.allowedCoins.add(coin);

          const logEntry = {
            time: timestamp.toLocaleString(),
            symbol: coin,
            price,
            rsi: rsi.toFixed(1),
            macd: macdResult.macd.toFixed(3),
            cci: cci.toFixed(1),
            inflow: inflow.toLocaleString(),
            volume: volume.toLocaleString(),
            buyZone: buyZone ? Math.round(buyZone).toLocaleString() : '-'
          };
          this.signalLog.push(logEntry);
        } else {
          this.marketData.delete(coin);
          this.allowedCoins.delete(coin);
        }

        const processedData = Array.from(this.marketData.values())
          .sort((a, b) => b.volume - a.volume);

        this.renderMarketTable(processedData);

        if (this.selectedCoin === coin) {
          this.updateChart(coin);
        }
      }
    });
  }

  renderMarketTable(data) {
    const tbody = document.getElementById('market-data-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(coin => {
      const row = document.createElement('tr');
      row.dataset.symbol = coin.symbol;
      row.innerHTML = `
        <td class="fw-bold">${coin.symbol}</td>
        <td>₩${Math.round(coin.price).toLocaleString()}</td>
        <td class="${coin.change24h >= 0 ? 'change-positive' : 'change-negative'}">
          ${coin.change24h.toFixed(2)}%
        </td>
        <td>${coin.rsi.toFixed(1)}</td>
        <td>${coin.macd.macd.toFixed(3)}</td>
        <td>${coin.cci.toFixed(1)}</td>
        <td>₩${coin.inflow?.toLocaleString() || 'N/A'}</td>
        <td>${coin.volume.toLocaleString()}</td>
        <td>₩${coin.buyZone ? Math.round(coin.buyZone).toLocaleString() : '-'}</td>
        <td><span class="signal signal-strong-buy">강력 매수</span></td>
        <td><button class="btn btn--sm action-button btn--primary">매수</button></td>
      `;
      row.addEventListener('click', () => {
        this.selectedCoin = coin.symbol;
        this.updateChart(coin.symbol);
      });
      tbody.appendChild(row);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new BithumDashboard();
});

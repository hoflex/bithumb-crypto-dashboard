// ✅ 실시간 데이터 기반 강력매수 로직 + 거래량/김프/온체인 연동 + 시그널 로그/필터/정렬 기능 추가 + 시그널 리스트뷰
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
    this.fetchOnchainData();
    this.connectWebSocket();
    this.setupUIEvents();
  }

  async fetchOnchainData() {
    try {
      const supportedAssets = ['BTC', 'ETH', 'XRP', 'ADA', 'DOGE'];
      for (const asset of supportedAssets) {
        const res = await fetch(`https://api.glassnode.com/v1/metrics/transactions/transfers_volume_to_exchanges?api_key=demo&asset=${asset}&interval=1h`);
        const data = await res.json();
        const latest = data[data.length - 1];
        this.onchainInflow[asset] = latest.v;
      }
    } catch (e) {
      console.error('온체인 데이터 실패:', e);
    }
  }

  setupUIEvents() {
    const closeSettings = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');

    if (closeSettings && settingsModal) {
      closeSettings.onclick = () => {
        settingsModal.classList.add('hidden');
        settingsModal.style.display = 'none';
      };
    }

    window.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
        settingsModal.style.display = 'none';
      }
    });

    if (settingsBtn && settingsModal) {
      settingsBtn.onclick = () => {
        settingsModal.classList.remove('hidden');
        settingsModal.style.display = 'flex';
      };
    }

    const showLogBtn = document.getElementById('show-signal-log');
    const signalLogContainer = document.getElementById('signal-log');
    if (showLogBtn && signalLogContainer) {
      showLogBtn.onclick = () => {
        signalLogContainer.classList.toggle('hidden');
        this.renderSignalLog();
      };
    }
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
      `;
      container.appendChild(row);
    });
  }

  async connectWebSocket() {
    const response = await fetch(`${this.apiBase}/ticker/ALL_KRW`);
    const json = await response.json();
    const coins = Object.keys(json.data).filter(key => key !== 'date');

    this.socket = new WebSocket('wss://pubwss.bithumb.com/pub/ws');

    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({
        type: 'ticker',
        symbols: coins.map(c => `${c}_KRW`),
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
            volume: volume.toLocaleString()
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

  // ... 나머지 기존 함수 유지 (RSI, MACD, CCI, updateChart 등 동일)

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

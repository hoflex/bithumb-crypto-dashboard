// Bithumb Trading Signals Dashboard
class BithumDashboard {
  constructor() {
    this.apiBase = 'https://api.bithumb.com/public';
    this.refreshInterval = 5000;
    this.lastApiCall = 0;
    this.apiCallCount = 0;
    this.apiLimitPerMinute = 20;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    
    this.settings = {
      rsiOverbought: 70,
      rsiOversold: 30,
      cciOverbought: 100,
      cciOversold: -100,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      rsiPeriod: 14,
      cciPeriod: 20
    };

    this.selectedCoin = null;
    this.chart = null;
    this.refreshTimer = null;
    this.marketData = new Map();
    this.sortDirection = {};
    this.currentTheme = 'light';
    
    this.init();
  }

  async init() {
    this.loadSettings();
    this.setupEventListeners();
    this.setupTheme();
    await this.loadInitialData();
    this.startAutoRefresh();
  }

  setupEventListeners() {
    // Theme toggle - using arrow function to preserve 'this' context
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleTheme();
    });

    // Settings modal
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openSettings();
    });

    const closeSettings = document.getElementById('close-settings');
    closeSettings.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeSettings();
    });

    // Settings controls
    const rsiOverboughtSlider = document.getElementById('rsi-overbought');
    rsiOverboughtSlider.addEventListener('input', (e) => {
      document.getElementById('rsi-overbought-value').textContent = e.target.value;
    });

    const rsiOversoldSlider = document.getElementById('rsi-oversold');
    rsiOversoldSlider.addEventListener('input', (e) => {
      document.getElementById('rsi-oversold-value').textContent = e.target.value;
    });

    const cciOverboughtSlider = document.getElementById('cci-overbought');
    cciOverboughtSlider.addEventListener('input', (e) => {
      document.getElementById('cci-overbought-value').textContent = e.target.value;
    });

    const cciOversoldSlider = document.getElementById('cci-oversold');
    cciOversoldSlider.addEventListener('input', (e) => {
      document.getElementById('cci-oversold-value').textContent = e.target.value;
    });

    const saveSettings = document.getElementById('save-settings');
    saveSettings.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.saveSettings();
    });

    const resetSettings = document.getElementById('reset-settings');
    resetSettings.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.resetSettings();
    });

    // Filter controls
    const signalFilter = document.getElementById('signal-filter');
    signalFilter.addEventListener('change', (e) => {
      this.filterBySignal(e.target.value);
    });

    // Retry button
    const retryButton = document.getElementById('retry-button');
    retryButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.loadInitialData();
    });

    // Table sorting
    document.querySelectorAll('[data-sort]').forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        this.sortTable(header.dataset.sort);
      });
    });

    // Modal close on backdrop click
    const settingsModal = document.getElementById('settings-modal');
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        this.closeSettings();
      }
    });
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.currentTheme = savedTheme;
    this.applyTheme(savedTheme);
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    
    // Remove existing theme classes
    document.documentElement.removeAttribute('data-color-scheme');
    document.body.classList.remove('dark-theme', 'light-theme');
    
    // Apply new theme
    document.documentElement.setAttribute('data-color-scheme', theme);
    document.body.classList.add(`${theme}-theme`);
    
    // Update button text
    const themeButton = document.getElementById('theme-toggle');
    if (themeButton) {
      themeButton.textContent = theme === 'dark' ? '라이트 모드' : '다크 모드';
    }
    
    // Force repaint
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    console.log(`Theme applied: ${theme}`);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    console.log(`Theme toggled to: ${newTheme}`);
  }

  openSettings() {
    this.populateSettings();
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }

  populateSettings() {
    const elements = {
      'rsi-overbought': this.settings.rsiOverbought,
      'rsi-oversold': this.settings.rsiOversold,
      'cci-overbought': this.settings.cciOverbought,
      'cci-oversold': this.settings.cciOversold
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      const valueElement = document.getElementById(`${id}-value`);
      if (element && valueElement) {
        element.value = value;
        valueElement.textContent = value;
      }
    });
  }

  saveSettings() {
    this.settings.rsiOverbought = parseInt(document.getElementById('rsi-overbought').value);
    this.settings.rsiOversold = parseInt(document.getElementById('rsi-oversold').value);
    this.settings.cciOverbought = parseInt(document.getElementById('cci-overbought').value);
    this.settings.cciOversold = parseInt(document.getElementById('cci-oversold').value);
    
    localStorage.setItem('dashboardSettings', JSON.stringify(this.settings));
    this.closeSettings();
    this.updateSignals();
  }

  resetSettings() {
    this.settings = {
      rsiOverbought: 70,
      rsiOversold: 30,
      cciOverbought: 100,
      cciOversold: -100,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      rsiPeriod: 14,
      cciPeriod: 20
    };
    this.populateSettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('dashboardSettings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }

  async loadInitialData() {
    this.showLoading(true);
    this.hideError();
    
    try {
      await this.fetchMarketData();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showLoading(false);
      this.showError();
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  showError() {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.classList.remove('hidden');
    }
  }

  hideError() {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
  }

  async fetchMarketData() {
    // Generate realistic mock data for demonstration
    const mainCoins = ['BTC', 'ETH', 'XRP', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'EOS', 'TRX'];
    const processedData = [];

    for (const symbol of mainCoins) {
      const prices = this.generateMockPrices(symbol);
      const indicators = this.calculateIndicators(prices);
      const signal = this.generateSignal(indicators);

      const basePrice = this.getBasePriceForCoin(symbol);
      const change24h = (Math.random() - 0.5) * 20; // Random change between -10% and +10%

      const processedCoin = {
        symbol,
        price: basePrice + (basePrice * change24h / 100),
        change24h,
        volume: Math.random() * 1000000000,
        ...indicators,
        signal
      };

      this.marketData.set(symbol, processedCoin);
      processedData.push(processedCoin);
    }

    this.renderMarketTable(processedData);
    this.updateAlerts(processedData);
    this.updateLastUpdateTime();

    // Select first coin if none selected
    if (!this.selectedCoin && processedData.length > 0) {
      await this.selectCoin(processedData[0].symbol);
    }
  }

  getBasePriceForCoin(symbol) {
    const basePrices = {
      'BTC': 85000000,   // 85M KRW
      'ETH': 4500000,    // 4.5M KRW
      'XRP': 2500,       // 2.5K KRW
      'ADA': 1200,       // 1.2K KRW
      'DOT': 15000,      // 15K KRW
      'LINK': 25000,     // 25K KRW
      'LTC': 150000,     // 150K KRW
      'BCH': 600000,     // 600K KRW
      'EOS': 1800,       // 1.8K KRW
      'TRX': 350         // 350 KRW
    };
    return basePrices[symbol] || 10000;
  }

  generateMockPrices(symbol) {
    const basePrice = this.getBasePriceForCoin(symbol);
    const prices = [];
    
    for (let i = 0; i < 100; i++) {
      const volatility = 0.02 + Math.random() * 0.03; // 2-5% volatility
      const price = basePrice * (1 + (Math.random() - 0.5) * volatility);
      prices.push({
        close: price,
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        volume: Math.random() * 1000000
      });
    }
    
    return prices;
  }

  calculateIndicators(prices) {
    const closes = prices.map(p => p.close);
    const highs = prices.map(p => p.high);
    const lows = prices.map(p => p.low);
    const volumes = prices.map(p => p.volume);

    return {
      rsi: this.calculateRSI(closes),
      macd: this.calculateMACD(closes),
      cci: this.calculateCCI(highs, lows, closes),
      obv: this.calculateOBV(closes, volumes)
    };
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(prices) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([macdLine], 9);
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine
    };
  }

  calculateEMA(prices, period) {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < Math.min(prices.length, 50); i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateCCI(highs, lows, closes, period = 20) {
    if (highs.length < period) return 0;
    
    const typicalPrices = [];
    for (let i = 0; i < highs.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    
    const sma = typicalPrices.slice(-period).reduce((a, b) => a + b) / period;
    const meanDeviation = typicalPrices.slice(-period)
      .reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    
    const cci = (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);
    return isNaN(cci) ? 0 : cci;
  }

  calculateOBV(closes, volumes) {
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv += volumes[i];
      } else if (closes[i] < closes[i - 1]) {
        obv -= volumes[i];
      }
    }
    return obv;
  }

  generateSignal(indicators) {
    const { rsi, macd, cci } = indicators;
    const { rsiOverbought, rsiOversold, cciOverbought, cciOversold } = this.settings;

    // STRONG_BUY: RSI < 30 AND MACD > Signal AND CCI < -100
    if (rsi < rsiOversold && macd.macd > macd.signal && cci < cciOversold) {
      return 'STRONG_BUY';
    }
    
    // STRONG_SELL: RSI > 70 AND MACD < Signal AND CCI > 100
    if (rsi > rsiOverbought && macd.macd < macd.signal && cci > cciOverbought) {
      return 'STRONG_SELL';
    }
    
    // BUY: RSI < 50 AND (MACD > Signal OR CCI < -50)
    if (rsi < 50 && (macd.macd > macd.signal || cci < -50)) {
      return 'BUY';
    }
    
    // SELL: RSI > 50 AND (MACD < Signal OR CCI > 50)
    if (rsi > 50 && (macd.macd < macd.signal || cci > 50)) {
      return 'SELL';
    }
    
    return 'HOLD';
  }

  renderMarketTable(data) {
    const tbody = document.getElementById('market-data-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    data.forEach(coin => {
      const row = document.createElement('tr');
      row.dataset.symbol = coin.symbol;
      row.style.cursor = 'pointer';
      
      const changeClass = coin.change24h >= 0 ? 'change-positive' : 'change-negative';
      const changeSymbol = coin.change24h >= 0 ? '+' : '';

      row.innerHTML = `
        <td class="fw-bold">${coin.symbol}</td>
        <td>₩${Math.round(coin.price).toLocaleString()}</td>
        <td class="${changeClass}">${changeSymbol}${coin.change24h.toFixed(2)}%</td>
        <td>${coin.rsi.toFixed(1)}</td>
        <td>${coin.macd.macd.toFixed(3)}</td>
        <td>${coin.cci.toFixed(1)}</td>
        <td><span class="signal signal-${coin.signal.toLowerCase().replace('_', '-')}">${this.getSignalText(coin.signal)}</span></td>
        <td><button class="btn btn--sm action-button ${this.getActionButtonClass(coin.signal)}">${this.getActionText(coin.signal)}</button></td>
      `;

      // Add click event listener to each row
      row.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`Selecting coin: ${coin.symbol}`);
        this.selectCoin(coin.symbol);
      });

      tbody.appendChild(row);
    });
  }

  getSignalText(signal) {
    const texts = {
      'STRONG_BUY': '강력 매수',
      'BUY': '매수',
      'HOLD': '홀딩',
      'SELL': '매도',
      'STRONG_SELL': '강력 매도'
    };
    return texts[signal] || signal;
  }

  getActionButtonClass(signal) {
    if (signal === 'STRONG_BUY' || signal === 'BUY') return 'btn--primary';
    if (signal === 'STRONG_SELL' || signal === 'SELL') return 'btn--outline';
    return 'btn--secondary';
  }

  getActionText(signal) {
    if (signal === 'STRONG_BUY' || signal === 'BUY') return '매수';
    if (signal === 'STRONG_SELL' || signal === 'SELL') return '매도';
    return '대기';
  }

  updateAlerts(data) {
    const alertsContainer = document.getElementById('alerts-container');
    const noAlerts = document.getElementById('no-alerts');
    
    if (!alertsContainer || !noAlerts) return;
    
    const strongSignals = data.filter(coin => 
      coin.signal === 'STRONG_BUY' || coin.signal === 'STRONG_SELL'
    );

    // Clear existing alerts
    alertsContainer.querySelectorAll('.alert-item').forEach(alert => alert.remove());

    if (strongSignals.length === 0) {
      noAlerts.classList.remove('hidden');
    } else {
      noAlerts.classList.add('hidden');
      
      strongSignals.forEach(coin => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-item alert-${coin.signal.toLowerCase().replace('_', '-')}`;
        alertDiv.innerHTML = `
          <div>
            <strong>${coin.symbol}</strong> - ${this.getSignalText(coin.signal)}
            <div style="font-size: var(--font-size-sm); opacity: 0.8;">
              현재가: ₩${Math.round(coin.price).toLocaleString()} | RSI: ${coin.rsi.toFixed(1)} | CCI: ${coin.cci.toFixed(1)}
            </div>
          </div>
          <button class="btn btn--sm ${this.getActionButtonClass(coin.signal)}" data-symbol="${coin.symbol}">
            차트 보기
          </button>
        `;
        
        // Add click event to alert button
        const button = alertDiv.querySelector('button');
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`Alert button clicked for: ${coin.symbol}`);
          this.selectCoin(coin.symbol);
        });
        
        alertsContainer.appendChild(alertDiv);
      });
    }
  }

  async selectCoin(symbol) {
    console.log(`Selecting coin: ${symbol}`);
    this.selectedCoin = symbol;
    
    // Update table selection
    document.querySelectorAll('#market-data-body tr').forEach(row => {
      if (row.dataset && row.dataset.symbol) {
        row.classList.toggle('selected', row.dataset.symbol === symbol);
      }
    });

    const coinData = this.marketData.get(symbol);
    if (coinData) {
      this.updateChartTitle(symbol, coinData.signal);
      this.updateIndicatorValues(coinData);
      await this.updateChart(symbol);
    }
  }

  updateChartTitle(symbol, signal) {
    const title = document.getElementById('chart-title');
    if (title) {
      title.textContent = `${symbol} 차트`;
      title.className = '';
      if (signal === 'STRONG_BUY' || signal === 'STRONG_SELL') {
        title.classList.add(`signal-${signal.toLowerCase().replace('_', '-')}`);
      }
    }
  }

  updateIndicatorValues(coinData) {
    const indicators = {
      'rsi-value': coinData.rsi.toFixed(1),
      'macd-value': coinData.macd.macd.toFixed(3),
      'cci-value': coinData.cci.toFixed(1),
      'obv-value': this.formatLargeNumber(coinData.obv)
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  formatLargeNumber(num) {
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(0);
  }

  async updateChart(symbol) {
    const ctx = document.getElementById('price-chart');
    if (!ctx) return;
    
    const chartContext = ctx.getContext('2d');
    
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Generate chart data for the selected coin
    const labels = [];
    const data = [];
    const now = new Date();
    const coinData = this.marketData.get(symbol);
    const basePrice = coinData ? coinData.price : 50000;
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      
      const variation = (Math.random() - 0.5) * basePrice * 0.03;
      data.push(basePrice + variation);
    }

    try {
      this.chart = new Chart(chartContext, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: `${symbol} 가격`,
            data,
            borderColor: '#1FB8CD',
            backgroundColor: 'rgba(31, 184, 205, 0.1)',
            tension: 0.2,
            pointRadius: 2,
            pointHoverRadius: 4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: '시간'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: '가격 (KRW)'
              },
              beginAtZero: false,
              ticks: {
                callback: function(value) {
                  return '₩' + Math.round(value).toLocaleString();
                }
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${symbol}: ₩${Math.round(context.parsed.y).toLocaleString()}`;
                }
              }
            }
          }
        }
      });
      
      console.log(`Chart updated for ${symbol}`);
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }

  updateLastUpdateTime() {
    const element = document.getElementById('last-update-time');
    if (element) {
      const now = new Date();
      element.textContent = now.toLocaleTimeString('ko-KR');
    }
  }

  filterBySignal(signal) {
    const rows = document.querySelectorAll('#market-data-body tr');
    rows.forEach(row => {
      const signalCell = row.querySelector('.signal');
      const signalText = signalCell ? signalCell.textContent.trim() : '';
      
      if (signal === 'ALL' || signalText === this.getSignalText(signal)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  sortTable(column) {
    const tbody = document.getElementById('market-data-body');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAsc = !this.sortDirection[column];
    this.sortDirection[column] = isAsc;

    // Update header indicators
    document.querySelectorAll('[data-sort]').forEach(header => {
      header.classList.remove('asc', 'desc');
    });
    
    const header = document.querySelector(`[data-sort="${column}"]`);
    if (header) {
      header.classList.add(isAsc ? 'asc' : 'desc');
    }

    rows.sort((a, b) => {
      const aData = this.marketData.get(a.dataset.symbol);
      const bData = this.marketData.get(b.dataset.symbol);
      
      if (!aData || !bData) return 0;
      
      let aValue, bValue;
      
      switch(column) {
        case 'symbol':
          aValue = aData.symbol;
          bValue = bData.symbol;
          break;
        case 'price':
          aValue = aData.price;
          bValue = bData.price;
          break;
        case 'change24h':
          aValue = aData.change24h;
          bValue = bData.change24h;
          break;
        case 'rsi':
          aValue = aData.rsi;
          bValue = bData.rsi;
          break;
        case 'macd':
          aValue = aData.macd.macd;
          bValue = bData.macd.macd;
          break;
        case 'cci':
          aValue = aData.cci;
          bValue = bData.cci;
          break;
        case 'signal':
          const signalOrder = { 'STRONG_SELL': 0, 'SELL': 1, 'HOLD': 2, 'BUY': 3, 'STRONG_BUY': 4 };
          aValue = signalOrder[aData.signal];
          bValue = signalOrder[bData.signal];
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return isAsc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return isAsc ? aValue - bValue : bValue - aValue;
      }
    });

    // Reorder rows in DOM
    rows.forEach(row => tbody.appendChild(row));
  }

  updateSignals() {
    // Recalculate signals with new settings
    this.marketData.forEach((coinData, symbol) => {
      const newSignal = this.generateSignal({
        rsi: coinData.rsi,
        macd: coinData.macd,
        cci: coinData.cci
      });
      coinData.signal = newSignal;
    });
    
    const dataArray = Array.from(this.marketData.values());
    this.renderMarketTable(dataArray);
    this.updateAlerts(dataArray);
  }

  canMakeApiCall() {
    const now = Date.now();
    if (now - this.lastApiCall > 60000) {
      this.apiCallCount = 0;
      this.lastApiCall = now;
    }
    return this.apiCallCount < this.apiLimitPerMinute;
  }

  recordApiCall() {
    this.apiCallCount++;
  }

  startAutoRefresh() {
    this.refreshTimer = setInterval(() => {
      this.fetchMarketData().catch(console.error);
    }, this.refreshInterval);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new BithumDashboard();
});
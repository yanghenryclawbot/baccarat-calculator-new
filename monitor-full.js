// Baccarat 牌桌監控程式 - 完整版
// 使用方式：
// 1. 在 maxpd-888.com 登入
// 2. 按 F12 開啟開發者工具
// 3. 切換到 Console 頁籤
// 4. 貼貼此程式碼
// 5. 程式會在右上角顯示下注建議

(function() {
  'use strict';
  
  console.log('🎰 百家樂監控程式載入中...');
  
  // ========== 配置 ==========
  const CONFIG = {
    initialDeckCount: 32, // 8副牌 = 8*4=32張每個牌值
    checkInterval: 500, // 檢查間隔 (毫秒)
    capital: parseInt(localStorage.getItem('baccarat-capital')) || 10000000,
    commission: parseFloat(localStorage.getItem('baccarat-commission')) || 2.0
  };
  
  // ========== 牌值映射 ==========
  const CARD_VALUES = {
    'A': 1, '1': 1,
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, '0': 10,
    'J': 11, 'j': 11,
    'Q': 12, 'q': 12,
    'K': 13, 'k': 13
  };
  
  const CARD_LABELS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  
  // ========== 狀態 ==========
  let state = {
    deck: {},
    history: [],
    trackedElements: new Set(),
    isRunning: false,
    totalCards: 416 // 8副牌 = 8*52=416
  };
  
  // 初始化牌庫
  function initDeck() {
    state.deck = {};
    for (let i = 1; i <= 13; i++) {
      state.deck[i] = CONFIG.initialDeckCount;
    }
    state.totalCards = 416;
    state.history = [];
    console.log('🔄 牌庫已初始化');
  }
  
  // ========== EV 計算 ==========
  function calculateEV() {
    const remaining = {...state.deck};
    const total = Object.values(remaining).reduce((a,b) => a+b, 0);
    
    if (total === 0) return null;
    
    // 計算機率分佈
    const probs = {};
    for (let i = 1; i <= 13; i++) {
      probs[i] = remaining[i] / total;
    }
    
    // 百家樂點數計算
    function getBaccaratValue(rank) {
      if (rank >= 10) return 0;
      return rank;
    }
    
    // 模擬計算（簡化版）
    // 實際應該使用更精確的組合計算
    let bankerWinProb = 0;
    let playerWinProb = 0;
    let tieProb = 0;
    
    // 簡化的勝率估算（基於剩餘牌）
    let lowCards = 0; // 1-4
    let midCards = 0; // 5-8
    let highCards = 0; // 9-K
    
    for (let i = 1; i <= 13; i++) {
      const count = remaining[i];
      if (i <= 4) lowCards += count;
      else if (i <= 8) midCards += count;
      else highCards += count;
    }
    
    // 簡化估算：小牌多有利莊家，大牌多有利閒家
    const totalCards = lowCards + midCards + highCards;
    bankerWinProb = 0.446 + (lowCards/totalCards - highCards/totalCards) * 0.1;
    playerWinProb = 0.445 + (highCards/totalCards - lowCards/totalCards) * 0.1;
    tieProb = 1 - bankerWinProb - playerWinProb;
    
    // 計算 EV
    const commission = CONFIG.commission / 100;
    const bankerNetOdds = 0.95 - commission;
    
    const results = {
      banker: {
        label: '莊',
        probability: bankerWinProb,
        ev: (bankerWinProb * bankerNetOdds) - (1 - bankerWinProb),
        payout: bankerNetOdds
      },
      player: {
        label: '閒',
        probability: playerWinProb,
        ev: playerWinProb - (1 - playerWinProb),
        payout: 1.0
      },
      tie: {
        label: '和',
        probability: tieProb,
        ev: (tieProb * 8) - (1 - tieProb),
        payout: 8.0
      },
      bankerPair: {
        label: '莊對',
        probability: 0.074,
        ev: (0.074 * 11) - 0.926,
        payout: 11.0
      },
      playerPair: {
        label: '閒對',
        probability: 0.074,
        ev: (0.074 * 11) - 0.926,
        payout: 11.0
      },
      super6: {
        label: '超6',
        probability: 0.053,
        ev: (0.053 * 12) - 0.947,
        payout: 12.0
      }
    };
    
    return results;
  }
  
  // 計算建議下注金額
  function calculateBetAmount(ev, payout) {
    if (ev <= 0) return 0;
    return Math.floor(CONFIG.capital * ev / payout);
  }
  
  // ========== UI ==========
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'baccarat-monitor';
    panel.innerHTML = `
      <div id="baccarat-content" style="display:none;">
        <div style="font-size:18px;font-weight:bold;margin-bottom:10px;text-align:center;color:#22c55e;">
          🎯 下注建議
        </div>
        <div id="baccarat-bets"></div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:12px;color:#888;text-align:center;">
          剩餘: <span id="baccarat-remaining">416</span> 張
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
          <button onclick="window.baccaratMonitor.addCardPrompt()" style="background:#22c55e;border:none;border-radius:4px;padding:6px;color:#fff;font-size:11px;cursor:pointer;">+牌</button>
          <button onclick="window.baccaratMonitor.clear()" style="background:#ef4444;border:none;border-radius:4px;padding:6px;color:#fff;font-size:11px;cursor:pointer;">重置</button>
          <button onclick="window.baccaratMonitor.toggleSettings()" style="background:#3b82f6;border:none;border-radius:4px;padding:6px;color:#fff;font-size:11px;cursor:pointer;">設定</button>
        </div>
      </div>
      <button id="baccarat-toggle" style="position:absolute;top:0;right:0;background:#22c55e;border:none;border-radius:50%;width:40px;height:40px;color:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.5);z-index:100000;">🎰</button>
    `;
    
    panel.style.cssText = `
      position:fixed;
      top:10px;
      right:10px;
      z-index:99999;
      background:#0a0a0a;
      border:2px solid #333;
      border-radius:12px;
      padding:12px;
      width:180px;
      box-shadow:0 4px 20px rgba(0,0,0,0.8);
      font-family:Arial,sans-serif;
      color:#fff;
    `;
    
    document.body.appendChild(panel);
    
    // 切換按鈕事件
    document.getElementById('baccarat-toggle').onclick = function() {
      const content = document.getElementById('baccarat-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    };
    
    return panel;
  }
  
  function updateUI() {
    const results = calculateEV();
    if (!results) return;
    
    const bets = Object.entries(results).map(([key, bet]) => ({
      key,
      ...bet,
      amount: calculateBetAmount(bet.ev, bet.payout)
    })).sort((a, b) => b.amount - a.amount);
    
    const betsHtml = bets.map(bet => {
      const evColor = bet.ev > 0 ? '#22c55e' : '#888';
      const bgColor = bet.amount > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,100,0.1)';
      const borderColor = bet.amount > 0 ? '#22c55e' : '#444';
      
      return `
        <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:6px;padding:6px;margin-bottom:4px;text-align:center;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:bold;color:${evColor};">${bet.label}</span>
            <span style="font-size:12px;font-weight:700;color:${bet.amount > 0 ? '#22c55e' : '#666'};">
              ${bet.amount > 0 ? bet.amount.toLocaleString() : '-'}
            </span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;margin-top:2px;">
            <span>${(bet.probability * 100).toFixed(1)}%</span>
            <span style="color:${evColor};">EV:${bet.ev > 0 ? '+' : ''}${(bet.ev * 100).toFixed(2)}%</span>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('baccarat-bets').innerHTML = betsHtml;
    document.getElementById('baccarat-remaining').textContent = state.totalCards;
  }
  
  // ========== 監控邏輯 ==========
  function detectCards() {
    // 常見的牌面選擇器
    const selectors = [
      '.card-value', '.card', '.poker-card',
      '[class*="card"]', '[class*="poker"]',
      '.game-card', '.table-card',
      'img[src*="card"]', 'img[alt*="card"]'
    ];
    
    let foundNewCard = false;
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const cardId = el.getAttribute('data-card-id') || el.textContent?.trim() || el.getAttribute('alt') || '';
          
          if (!cardId || state.trackedElements.has(el)) return;
          
          // 解析牌值
          let cardValue = null;
          for (const [key, value] of Object.entries(CARD_VALUES)) {
            if (cardId.includes(key) || cardId === key) {
              cardValue = value;
              break;
            }
          }
          
          if (cardValue && state.deck[cardValue] > 0) {
            state.trackedElements.add(el);
            state.deck[cardValue]--;
            state.totalCards--;
            state.history.push({value: cardValue, time: Date.now()});
            foundNewCard = true;
            console.log(`🎴 檢測到: ${CARD_LABELS[cardValue-1]}, 剩餘 ${state.deck[cardValue]} 張`);
          }
        });
      } catch (e) {}
    });
    
    if (foundNewCard) {
      updateUI();
    }
  }
  
  // ========== 公開 API ==========
  window.baccaratMonitor = {
    init: function() {
      initDeck();
      createPanel();
      updateUI();
      console.log('✅ 百家樂監控已啟動');
      console.log('💡 點擊右上角 🎰 按鈕顯示/隱藏面板');
    },
    
    start: function() {
      if (state.isRunning) return;
      state.isRunning = true;
      this.init();
      this.interval = setInterval(detectCards, CONFIG.checkInterval);
      console.log('🔍 自動監控已開始');
    },
    
    stop: function() {
      state.isRunning = false;
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
      console.log('⏹️ 監控已停止');
    },
    
    clear: function() {
      initDeck();
      state.trackedElements.clear();
      updateUI();
      console.log('🔄 已重置');
    },
    
    addCard: function(cardValue) {
      const value = parseInt(cardValue);
      if (value >= 1 && value <= 13 && state.deck[value] > 0) {
        state.deck[value]--;
        state.totalCards--;
        state.history.push({value, time: Date.now()});
        console.log(`🎴 手動添加: ${CARD_LABELS[value-1]}`);
        updateUI();
      }
    },
    
    addCardPrompt: function() {
      const input = prompt('輸入牌值 (A,2-10,J,Q,K):');
      if (input) {
        const value = CARD_VALUES[input];
        if (value) this.addCard(value);
      }
    },
    
    toggleSettings: function() {
      const capital = prompt('設定本金 (萬):', CONFIG.capital / 10000);
      if (capital) {
        CONFIG.capital = parseInt(capital) * 10000;
        localStorage.setItem('baccarat-capital', CONFIG.capital);
      }
      
      const commission = prompt('設定退水 (%):', CONFIG.commission);
      if (commission) {
        CONFIG.commission = parseFloat(commission);
        localStorage.setItem('baccarat-commission', CONFIG.commission);
      }
      
      updateUI();
    },
    
    getStatus: function() {
      return {
        deck: {...state.deck},
        history: [...state.history],
        totalCards: state.totalCards,
        isRunning: state.isRunning
      };
    }
  };
  
  // 自動啟動
  window.baccaratMonitor.start();
  
})();
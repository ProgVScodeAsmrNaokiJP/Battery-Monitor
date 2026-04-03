const $ = id => document.getElementById(id);
const [fill, pct, status, bolt, src, time, log] = ['batteryFill', 'batteryPct', 'batteryStatus', 'bolt', 'metaSource', 'metaTime', 'logList'].map($);

// 充電開始時刻・残量を記録する変数
let chargeStartTime = null;
let chargeStartLevel = null;

const addLog = (msg, type = 'info') => {
    const now = new Date();
    const t = now.toTimeString().slice(0, 8);
    log.insertAdjacentHTML('afterbegin', `<div class="log-entry"><span class="log-time">${t}</span><span class="log-msg ${type}">${msg}</span></div>`);
    while(log.children.length > 15){
        log.lastChild.remove();
    }
};

const formatTime = s =>{
    if(!isFinite(s) || s <= 0) return '計算中...';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0 ? `${h}時間${m}分${sec}秒` : m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
};

const getColor = (p, c) =>{
    if(c) return '#10b981';
    if(p <= 15) return '#ef4444';
    if(p <= 30) return '#f59e0b';
    return '#3b82f6';
};

const updateUI = b =>{
    const p = Math.round(b.level * 100);
    const col = getColor(p, b.charging);
    fill.style.cssText = `width: calc(${p}% - 6px); background: ${col}`;
    fill.className = 'battery-fill' + (b.charging ? ' charging' : '');
    pct.innerHTML = `${p}<span>%</span>`;
    pct.style.color = status.style.color = col;
    status.textContent = p === 100 ? 'FULL' : b.charging ? 'CHARGING' : 'DISCHARGING';
    bolt.classList.toggle('active', b.charging);
    src.textContent = b.charging ? 'AC電源' : 'バッテリー';
    time.textContent = p === 100 ? '満充電' : formatTime(b.charging ? b.chargingTime : b.dischargingTime);
};

if ('getBattery' in navigator) {
    navigator.getBattery().then(b => {
    addLog(`起動 - ${Math.round(b.level * 100)}%`);
    addLog(b.charging ? '充電器: 接続中' : '充電器: 未接続', b.charging ? 'charge' : 'info');

    // 起動時すでに充電中の場合は開始情報を記録
    if (b.charging) {
        chargeStartTime = Date.now();
        chargeStartLevel = b.level;
    }
    updateUI(b);

    b.addEventListener('levelchange', () => {
        const p = Math.round(b.level * 100);
        if (p === 100) {
            addLog('バッテリーが満タンになりました 🔋', 'charge');
        } else if (p === 0) {
            addLog('バッテリーが残量0%になりました ⚠️', 'warn');
        } else {
            addLog(`残量変化: ${p}%`, p <= 15 ? 'warn' : 'info');
        }
        updateUI(b);
    });

    b.addEventListener('chargingchange', () => {
        if (b.charging) {
            // 充電開始：時刻と残量を記録
            chargeStartTime = Date.now();
            chargeStartLevel = b.level;
            addLog('充電器が接続されました', 'charge');
        } else {
            // 充電終了；接続時間と電力量を計算してログ
            if (chargeStartTime !== null) {
                const duration = Math.round((Date.now() - chargeStartTime) / 1000);
                const gained = Math.round((b.level - chargeStartLevel) * 100);
                addLog(`充電器が外されました(接続時間: ${formatTime(duration)} / +${gained}%)`, 'warn');
                chargeStartTime = null;
                chargeStartLevel = null;
            } else {
                addLog('充電器が外されました', 'warn');
            }
        }
        updateUI(b);
    });

    ['chargingtimechange', 'dischargingtimechange'].forEach(e =>{
        b.addEventListener(e, () => updateUI(b));
    });
});

}else{
    // Battery MonitorのAPIがサポートされていない時の警告
    pct.innerHTML = `<span style="font-size: 14px; color: #ef4444;">非対応</span>`;
    status.textContent = 'NOT SUPPORTED';
    status.style.color = '#ef4444';
    fill.style.cssText = 'width: calc(100% - 6px); background: #ef4444; opacity: 0.3';
    addLog('このブラウザはBattery Apiに対応していません', 'warn');
    addLog('原因: Firefox / Safari / デスクトップPCの可能性があります', 'warn');
}
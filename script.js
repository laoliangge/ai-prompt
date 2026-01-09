// 全局变量
let allData = [];
let autoScrollTimer = null;
let isPaused = false;

document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            allData = data; 
            initGallery(); // 渲染画廊
            startAutoScroll();
            setupInteraction();
            setupNavbarScroll(); // 启动导航栏变色监听
        })
        .catch(err => console.error('Error:', err));
});

function initGallery() {
    const container = document.getElementById('columns-container');
    if (!container) return; 

    container.innerHTML = ''; 
    const colCount = window.innerWidth <= 768 ? 2 : 4;
    
    const columns = [];
    for (let i = 0; i < colCount; i++) {
        const col = document.createElement('div');
        col.className = 'gallery-column';
        container.appendChild(col);
        columns.push(col);
    }

    allData.forEach((item, index) => {
        const colIndex = index % colCount;
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openModal(item);

        if (window.innerWidth <= 768) {
            card.innerHTML = `
                <img src="${item.imageUrl}" loading="lazy" alt="${item.title}">
                <div class="card-info"><div class="card-title">${item.title}</div></div>
            `;
        } else {
            card.innerHTML = `
                <img src="${item.imageUrl}" loading="lazy" alt="${item.title}">
                <div class="card-info">
                    <span class="card-category">${item.category}</span>
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.prompt}</div>
                </div>
            `;
        }
        columns[colIndex].appendChild(card);
    });
}

function startAutoScroll() {
    const scroller = document.getElementById('gallery-wrapper');
    const speed = 0.5; 

    function step() {
        if (!isPaused) {
            if ((scroller.scrollTop + scroller.clientHeight) < scroller.scrollHeight) {
                scroller.scrollBy(0, speed);
            }
        }
        autoScrollTimer = requestAnimationFrame(step);
    }
    step();
}

function setupInteraction() {
    let pauseTimeout;
    const scroller = document.getElementById('gallery-wrapper');

    window.addEventListener('mousemove', () => {
        isPaused = true;
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => { isPaused = false; }, 1000);
    });

    scroller.addEventListener('touchstart', () => {
        isPaused = true;
        clearTimeout(pauseTimeout);
    }, { passive: true });

    scroller.addEventListener('touchend', () => {
        pauseTimeout = setTimeout(() => { isPaused = false; }, 1000);
    });
}

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    const scroller = document.getElementById('gallery-wrapper');
    
    // 安全检查
    if (!navbar || !scroller) return;

    scroller.addEventListener('scroll', () => {
        // 1. 你的自定义参数：滚过 20px 就变色
        if (scroller.scrollTop > 20) { 
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // 2. 双重保险：滚动时也尝试触发播放
        tryAutoPlay();
    });

    // 3. 刚进页面“手滑动不响”的修复
    scroller.addEventListener('touchstart', tryAutoPlay, { passive: true });
}

function openModal(item) {
    const modal = document.getElementById('modal');
    document.getElementById('modalImage').src = item.imageUrl;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalCategory').innerText = item.category;
    document.getElementById('modalPrompt').innerText = item.prompt;
    document.getElementById('modalId').innerText = 'ID ' + item.id;
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
    isPaused = true; 
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('modalImage').src = '';
    }, 300);
    isPaused = false; 
}

function copyPrompt() {
    const text = document.getElementById('modalPrompt').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'COPIED';
        btn.style.borderColor = '#fff';
        btn.style.color = '#fff';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.borderColor = '#333';
            btn.style.color = '#888';
        }, 2000);
    });
}

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initGallery, 300);
});


/* --- 🎵 最终逻辑修正版：带记忆功能（记住播放/暂停状态） --- */

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 
var isManuallyPaused = false; 

// 1. 核心开关：控制播放/暂停
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        // --- 用户要播放 ---
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
            isMusicPlayed = true;
            isManuallyPaused = false; 
            // 📝 记在本子上：现在是“播放”状态
            sessionStorage.setItem('music_status', 'playing');
        }).catch(e => console.log("播放失败"));
    } else {
        // --- 用户要暂停 ---
        bgm.pause();
        musicBtn.classList.remove('playing');
        isManuallyPaused = true; 
        // 📝 记在本子上：现在是“暂停”状态
        sessionStorage.setItem('music_status', 'paused');
    }
}

// 2. 智能自动播放
function tryAutoPlay() {
    if (!bgm) return;
    
    // 🛑 关键：检查记忆！如果用户之前明确选了“暂停”，就坚决不播
    // (优先读取 sessionStorage，如果没有记录，则看 isManuallyPaused)
    var savedStatus = sessionStorage.getItem('music_status');
    if (savedStatus === 'paused' || isManuallyPaused) {
        return; // 用户不想听，闭嘴
    }

    // 如果已经在放了，就不折腾了
    if (!bgm.paused) return;

    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
        // 播放成功，更新记忆为“播放”
        sessionStorage.setItem('music_status', 'playing');
    }).catch(e => {
        // 浏览器还没准备好，等待下次交互
    });
}

// 3. 监听链接点击 (拦截“方案”刷新，只切歌/防刷新)
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.getAttribute('href') === 'index.html') {
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); 
        }
    }
});

// 4. 全局监听用户行为
document.addEventListener('touchstart', tryAutoPlay, { passive: true });
document.addEventListener('click', tryAutoPlay);

// 5. 【回魂记忆补丁】页面显示时触发（包括返回键）
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;
    
    // 读取记忆小纸条
    var savedStatus = sessionStorage.getItem('music_status');
    
    // 如果记忆里写着“paused”（暂停），那就保持安静
    if (savedStatus === 'paused') {
        musicBtn.classList.remove('playing');
        isManuallyPaused = true; // 锁住，不许自动播
    } 
    // 否则（记忆是播放，或者是第一次来没记忆），尝试播放
    else {
        isManuallyPaused = false; // 解锁
        tryAutoPlay(); // 只要用户手一滑，或者浏览器允许，立马播
    }
});

/* --- 全局变量 --- */
let allData = [];
let autoScrollTimer = null;
let isPaused = false;
// 音乐相关变量
const bgm = document.getElementById('bgm');
const musicBtn = document.getElementById('musicBtn');
let isMusicPlayed = false;

/* --- 初始化逻辑 --- */
document.addEventListener('DOMContentLoaded', () => {
    // 1. 获取数据并渲染
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            allData = data; 
            initGallery(); // 渲染画廊
            startAutoScroll(); // 启动自动缓慢滚动
            setupInteraction(); // 启动触摸暂停
            setupNavbarScroll(); // ✅ 启动顶栏变色 + 滚动播放监听
            addAutoPlayListeners(); // ✅ 启动触摸播放监听
        })
        .catch(err => console.error('Error:', err));
});

/* --- 画廊核心功能 (保持不动) --- */
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

/* --- 弹窗逻辑 (保持不动) --- */
function openModal(item) {
    const modal = document.getElementById('modal');
    document.getElementById('modalImage').src = item.imageUrl;
    document.getElementById('modalTitle').innerText = item.title;
    // 如果 HTML 里没有这些 ID 可能会报错，加个判断更稳，但为了不改你逻辑我保留原样
    if(document.getElementById('modalCategory')) document.getElementById('modalCategory').innerText = item.category;
    if(document.getElementById('modalPrompt')) document.getElementById('modalPrompt').innerText = item.prompt;
    if(document.getElementById('modalId')) document.getElementById('modalId').innerText = 'ID ' + item.id;
    
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

/* =========================================
   🚀 核心修复区：顶栏变色 + 音乐控制
   ========================================= */

// 1. ✅ 修复顶栏变色 (监听 gallery-wrapper 而不是 window)
function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    const scroller = document.getElementById('gallery-wrapper');
    
    if (!navbar || !scroller) return;

    scroller.addEventListener('scroll', () => {
        // --- 视觉：变黑 ---
        if (scroller.scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // --- 听觉：一滑就响 ---
        // 只要发生了滚动，且还没播放过，就尝试播放
        if (!isMusicPlayed) {
            attemptPlayMusic();
        }
    });
}

// 2. 尝试自动播放音乐
function attemptPlayMusic() {
    if (!bgm || isMusicPlayed) return;

    bgm.play().then(() => {
        // 播放成功
        if(musicBtn) musicBtn.classList.add('playing');
        isMusicPlayed = true;
        // 移除监听器省电
        removeAutoPlayListeners();
    }).catch(e => {
        // 失败（被拦截），不管它，下次交互再试
    });
}

// 3. 手动开关音乐
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        bgm.play().then(() => {
            if(musicBtn) musicBtn.classList.add('playing');
            isMusicPlayed = true;
        });
    } else {
        bgm.pause();
        if(musicBtn) musicBtn.classList.remove('playing');
        // 暂停后允许下次触摸自动播放
        isMusicPlayed = false; 
        addAutoPlayListeners();
    }
}

// 4. 添加触摸监听 (手指一碰就响)
function addAutoPlayListeners() {
    document.addEventListener('touchstart', attemptPlayMusic, { passive: true });
    document.addEventListener('click', attemptPlayMusic);
}

// 5. 移除监听
function removeAutoPlayListeners() {
    document.removeEventListener('touchstart', attemptPlayMusic);
    document.removeEventListener('click', attemptPlayMusic);
}

// 6. 拦截“方案”点击 (在首页时不刷新)
document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href') === 'index.html') {
        const path = window.location.pathname;
        if (path.endsWith('/') || path.endsWith('index.html')) {
            e.preventDefault(); // 拦截刷新
            // console.log("已在首页，不刷新");
        }
    }
});

// 7. 页面回魂检测 (按返回键回来时恢复状态)
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;
    if (bgm.paused) {
        if(musicBtn) musicBtn.classList.remove('playing');
        isMusicPlayed = false;
        addAutoPlayListeners(); // 重新挂载监听，确保还能滑响
    } else {
        if(musicBtn) musicBtn.classList.add('playing');
        isMusicPlayed = true;
    }
});

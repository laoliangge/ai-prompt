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


/* --- 🎵 完美修正版：区分“刷新”和“返回” --- */

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 
var isManuallyPaused = false; 

// 0. 【核心补丁】检测是“刷新”还是“返回”
// 如果是刷新页面，必须清除记忆，重新开始！
if (window.performance) {
    // 现代浏览器检测
    var navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'reload') {
        sessionStorage.removeItem('music_status'); // 🧹 刷新了，忘掉过去
    } 
    // 老旧浏览器检测
    else if (performance.navigation.type === 1) {
        sessionStorage.removeItem('music_status'); // 🧹 同上
    }
}

// 1. 核心开关：控制播放/暂停
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        // --- 用户要播放 ---
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
            isMusicPlayed = true;
            isManuallyPaused = false; 
            // 📝 记下来：现在是播放状态
            sessionStorage.setItem('music_status', 'playing');
        }).catch(e => console.log("播放失败"));
    } else {
        // --- 用户要暂停 ---
        bgm.pause();
        musicBtn.classList.remove('playing');
        isManuallyPaused = true; 
        // 📝 记下来：现在是暂停状态
        sessionStorage.setItem('music_status', 'paused');
    }
}

// 2. 智能自动播放
function tryAutoPlay() {
    if (!bgm) return;
    
    // 🛑 检查记忆：
    // 如果用户明确选择了暂停（且不是刷新进来的），那就闭嘴
    var savedStatus = sessionStorage.getItem('music_status');
    if (savedStatus === 'paused' || isManuallyPaused) {
        return; 
    }

    // 如果已经在放了，就不重复操作
    if (!bgm.paused) return;

    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
        sessionStorage.setItem('music_status', 'playing');
    }).catch(e => {
        // 等待下次交互
    });
}

// 3. 监听链接点击 (防刷新)
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.getAttribute('href') === 'index.html') {
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); 
        }
    }
});

// 4. 全局监听 (触摸、点击)
document.addEventListener('touchstart', tryAutoPlay, { passive: true });
document.addEventListener('click', tryAutoPlay);

// 5. 【回魂记忆】页面显示时触发
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;
    
    var savedStatus = sessionStorage.getItem('music_status');
    
    // 如果记忆是“暂停”，保持静音
    if (savedStatus === 'paused') {
        musicBtn.classList.remove('playing');
        isManuallyPaused = true;
    } 
    // 否则（刷新后记忆被清空了，或者记忆是播放），尝试播放
    else {
        isManuallyPaused = false;
        tryAutoPlay(); // 手指一碰就响
    }
});

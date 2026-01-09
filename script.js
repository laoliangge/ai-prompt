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
/* --- 放在第 92 行的大括号后面，作为第 93 行开始 --- */

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    const scroller = document.getElementById('gallery-wrapper');
    
    // 安全检查
    if (!navbar || !scroller) return;

    scroller.addEventListener('scroll', () => {
        // 你的自定义参数：滚过 20px 就变色
        if (scroller.scrollTop > 20) { 
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
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

/* --- 🎵 最终版：智能导航 + 缓存修复 --- */
/* --- 🎵 终极版：适配手机返回键 + 强力唤醒 --- */

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 

// 1. 核心开关：控制播放/暂停
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
            isMusicPlayed = true; // 标记为已播放
        }).catch(e => console.log("播放被拦截"));
    } else {
        bgm.pause();
        musicBtn.classList.remove('playing');
    }
}

// 2. 强力自动播放 (手指一碰屏幕就触发)
function tryAutoPlay() {
    if (!bgm || !bgm.paused) return; // 如果已经在放了，就不折腾

    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
        
        // 成功后，卸载监听，省点资源
        removeAutoPlayListeners();
    }).catch(e => {
        // 失败了没事，等着下次触摸
    });
}

// 辅助函数：添加监听
function addAutoPlayListeners() {
    // 【关键】touchstart 是手机上最灵的，手指一沾屏幕就算
    document.addEventListener('touchstart', tryAutoPlay, { passive: true });
    document.addEventListener('click', tryAutoPlay);
    // scroll 依然留着，万一某些浏览器支持呢
    document.addEventListener('scroll', tryAutoPlay); 
}

// 辅助函数：移除监听
function removeAutoPlayListeners() {
    document.removeEventListener('touchstart', tryAutoPlay);
    document.removeEventListener('click', tryAutoPlay);
    document.removeEventListener('scroll', tryAutoPlay);
}

// 3. 【新功能】监听链接点击 (拦截“方案”链接)
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    // 如果点的是“方案”链接且当前就在首页
    if (target && target.getAttribute('href') === 'index.html') {
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); // 别刷新
            console.log("拦截刷新，只切歌");
            // 这里也可以选择 toggleMusic()，看你喜好
        }
    }
});

// 4. 【起搏器】页面显示时（包括按返回键回来）触发
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;

    // 只要发现音乐停了（不管是刚进来，还是返回键回来的）
    if (bgm.paused) {
        musicBtn.classList.remove('playing'); // 停止转圈
        isMusicPlayed = false; // 重置状态
        
        // 【关键】重新把“触摸就响”的监听器装上！
        // 之前就是因为返回后没装这个，所以滑不动
        addAutoPlayListeners(); 
    } else {
        // 如果真还在响（极少见），让它接着转
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
    }
});

// 5. 首次加载启动
addAutoPlayListeners();

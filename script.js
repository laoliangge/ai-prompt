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

        // 2. 双重保险：滚动时也尝试触发播放（针对某些允许scroll触发的浏览器）
        tryAutoPlay();
    });

    // 3. 【关键修复】刚进页面“手滑动不响”的问题
    // 直接在画廊上监听触摸，保证手指一碰到画廊，立马请求播放
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


/* --- 🎵 最终逻辑修正版：解决“关不住”和“滑不响” --- */
/* --- 🎵 霸道地雷版：专治“滑动不响” --- */

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var userStopped = false; // 🚫 标记：是否是用户亲手关的

// 1. 核心开关：用户点按钮时触发
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        // --- 用户手动开启 ---
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
            userStopped = false; // 解除禁令
            removeInteractionListeners(); // 既然响了，就不需要监听手指了
        }).catch(e => console.log("播放失败"));
    } else {
        // --- 用户手动关闭 ---
        bgm.pause();
        musicBtn.classList.remove('playing');
        userStopped = true; // 🚫 贴上封条：用户嫌吵，以后别自动放了
    }
}

// 2. 尝试播放函数 (只做一件事：试着放歌)
function tryPlayMusic() {
    // 如果用户亲手关了，或者已经在放了，直接闭嘴
    if (userStopped || !bgm || !bgm.paused) return;

    // 尝试播放
    bgm.play().then(() => {
        // 🎉 成功响了！
        musicBtn.classList.add('playing');
        // 🎉 任务完成，拆除所有监听器，不再骚扰浏览器
        removeInteractionListeners();
    }).catch(error => {
        // 🔇 失败了（说明刚才那个动作浏览器觉得不算数）
        // 没事，监听器留着，等用户下一个动作继续试
    });
}

// 3. 埋设地雷 (监听所有可能的动作)
function addInteractionListeners() {
    // 捕获阶段 (true)，保证第一时间抓到事件
    document.addEventListener('click', tryPlayMusic, true);
    document.addEventListener('touchstart', tryPlayMusic, true);
    
    // 👇 关键！很多人滑屏不响是因为漏了这个“松手”检测
    document.addEventListener('touchend', tryPlayMusic, true);
    
    // 👇 备用：虽然scroll很难触发音频，但万一有的浏览器支持呢
    document.addEventListener('scroll', tryPlayMusic, true);
}

// 4. 拆除地雷 (省资源)
function removeInteractionListeners() {
    document.removeEventListener('click', tryPlayMusic, true);
    document.removeEventListener('touchstart', tryPlayMusic, true);
    document.removeEventListener('touchend', tryPlayMusic, true);
    document.removeEventListener('scroll', tryPlayMusic, true);
}

// 5. 监听链接点击 (拦截方案页刷新，防止音乐打断)
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.getAttribute('href') === 'index.html') {
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); 
        }
    }
});

// 6. 回魂补丁 (从别的页面返回，或者刚刷新进来)
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;
    
    // 如果音乐没在放，且用户没亲手关过 -> 重新埋雷
    if (bgm.paused && !userStopped) {
        musicBtn.classList.remove('playing');
        addInteractionListeners(); 
        tryPlayMusic(); // 刚进来先试一脚
    } 
    // 如果本来就在放（极少情况），确保图标转起来
    else if (!bgm.paused) {
        musicBtn.classList.add('playing');
    }
});

// 🚀 脚本加载完，立刻埋雷
addInteractionListeners();
// 顺便先试着播一下（万一浏览器心情好呢）
tryPlayMusic();

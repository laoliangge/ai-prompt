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
/* --- 🎵 智能记忆版：死磕自动播放 + 记住用户选择 --- */

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');

// 1. 初始化：一加载页面，先看看之前是不是“开着”的状态
// 默认是 'true' (开)，除非用户亲手关过
var shouldPlay = sessionStorage.getItem('music_status') !== 'false';

// 2. 核心开关：点击按钮时触发
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        // --- 用户要开 ---
        playAudio(true); // true 代表是用户手动点的，强制开
    } else {
        // --- 用户要关 ---
        bgm.pause();
        musicBtn.classList.remove('playing');
        sessionStorage.setItem('music_status', 'false'); // 📝 记在本子上：用户关了！
        shouldPlay = false;
    }
}

// 3. 统一播放函数 (带重试机制)
function playAudio(isUserAction) {
    if (!bgm) return;
    
    // 如果用户之前明确关掉了，且这次不是手动点按钮，那就别自作多情
    if (!shouldPlay && !isUserAction) return;

    var playPromise = bgm.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            // 🎉 播放成功
            musicBtn.classList.add('playing');
            sessionStorage.setItem('music_status', 'true'); // 📝 记在本子上：正在播放
            shouldPlay = true;
            
            // 既然响了，就没必要监听手指了，卸载监听器省电
            removeGlobalListeners();
        }).catch(error => {
            // 🔇 播放失败 (浏览器拦截)
            // 别急，保持图标不转，但悄悄把监听器装上，等用户一下手就响
            addGlobalListeners();
        });
    }
}

// 4. 全局撒网：捕捉任何交互瞬间
function autoPlayTrigger() {
    // 只要触发了一次，就尝试播放
    playAudio(false);
}

function addGlobalListeners() {
    // 既然浏览器不让自动响，那就等用户碰屏幕的那一瞬间响
    document.addEventListener('touchstart', autoPlayTrigger, { passive: true });
    document.addEventListener('click', autoPlayTrigger);
    document.addEventListener('scroll', autoPlayTrigger);
}

function removeGlobalListeners() {
    document.removeEventListener('touchstart', autoPlayTrigger);
    document.removeEventListener('click', autoPlayTrigger);
    document.removeEventListener('scroll', autoPlayTrigger);
}

// 5. 监听链接点击 (拦截方案页刷新)
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.getAttribute('href') === 'index.html') {
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); 
        }
    }
});

// 6. 回魂补丁 (页面显示时触发)
window.addEventListener('pageshow', function(e) {
    // 检查本子上的记录，如果之前是开着的，回来必须接着奏乐
    var status = sessionStorage.getItem('music_status');
    if (status !== 'false') {
        shouldPlay = true;
        playAudio(false); // 尝试自动续播
    } else {
        // 如果之前是关的，那就保持关
        musicBtn.classList.remove('playing');
        shouldPlay = false;
    }
});

// 7. 首次加载启动
// 只要没有明确记录“关闭”，就尝试播放
if (shouldPlay) {
    addGlobalListeners(); // 先撒网
    playAudio(false);     // 再尝试直接播
}


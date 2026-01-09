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

/* --- 🎵 终极修正版：急先锋唤醒 + 手动开关保护 --- */

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 
var isManuallyPaused = false; // 🛑 标记：是否是用户亲手关的

// 1. 核心开关：控制播放/暂停
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        // 用户主动点播放
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
            isMusicPlayed = true;
            isManuallyPaused = false; // ✅ 解锁，允许后续自动播放
        }).catch(e => console.log("播放失败"));
    } else {
        // 用户主动点暂停
        bgm.pause();
        musicBtn.classList.remove('playing');
        isManuallyPaused = true; // 🛑 锁住！用户嫌吵关了，之后滑屏也不许自动响
    }
}

// 2. 霸道唤醒逻辑 (专治“刚进页面不响”)
function forceAutoPlay() {
    // A. 如果用户亲手关过，绝对闭嘴，别烦人
    if (isManuallyPaused) return;

    // B. 如果已经在放了，或者是空变量，啥也别干
    if (!bgm || !bgm.paused) return;

    // C. 尝试播放！
    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
        // 🎉 成功了！卸载监听器，省电
        removeGlobalListeners();
    }).catch(error => {
        // 失败了（可能浏览器还是觉得权限不够），没事，下次触摸再试
        // console.log("唤醒失败，等待下一次交互");
    });
}

// 3. 全局撒网：只要手指一碰屏幕，立马尝试唤醒
function addGlobalListeners() {
    // useCapture: true (那个 true) 是关键！
    // 意思是：在这一指头点到任何东西之前，我先截获事件来放歌
    document.addEventListener('touchstart', forceAutoPlay, true); 
    document.addEventListener('click', forceAutoPlay, true);
    
    // 依然保留 scroll 作为备选，万一某些浏览器支持呢
    document.addEventListener('scroll', forceAutoPlay, true);
}

function removeGlobalListeners() {
    document.removeEventListener('touchstart', forceAutoPlay, true);
    document.removeEventListener('click', forceAutoPlay, true);
    document.removeEventListener('scroll', forceAutoPlay, true);
}

// 4. 监听链接点击 (防刷新)
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.getAttribute('href') === 'index.html') {
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); 
        }
    }
});

// 5. 回魂补丁 (按返回键回来)
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;
    
    // 如果音乐停了，说明需要重新唤醒
    if (bgm.paused) {
        musicBtn.classList.remove('playing');
        
        // 只有当用户之前没亲手关过，才尝试自动唤醒
        if (!isManuallyPaused) {
            isMusicPlayed = false;
            addGlobalListeners(); // 重新撒网
        }
    } else {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
    }
});

// 🚀 脚本加载完，立刻开始撒网监听
addGlobalListeners();

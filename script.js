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

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 
var isManuallyPaused = false; // 🚫 新增标记：记录用户是否亲手暂停了音乐

// 1. 核心开关：控制播放/暂停
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        // 用户想听：播放
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
            isMusicPlayed = true;
            isManuallyPaused = false; // ✅ 解除“免打扰”，允许后续自动逻辑
        }).catch(e => console.log("播放失败"));
    } else {
        // 用户想停：暂停
        bgm.pause();
        musicBtn.classList.remove('playing');
        isManuallyPaused = true; // 🚫 开启“免打扰”！这时候谁滑也没用
    }
}

// 2. 智能自动播放
function tryAutoPlay() {
    // 如果音乐文件不存在，或者已经在放了，直接退
    if (!bgm || !bgm.paused) return;
    
    // 🚫 关键判断：如果用户亲手暂停过（开启了免打扰），那就别自作多情自动放了
    if (isManuallyPaused) return;

    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
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
            // 这里不做音乐操作，只为了防刷新
        }
    }
});

// 4. 全局监听用户行为 (触摸、点击)
// 为了解决“刚进页面滑不响”，这里必须监听 touchstart
document.addEventListener('touchstart', tryAutoPlay, { passive: true });
document.addEventListener('click', tryAutoPlay);

// 5. 回魂补丁 (按返回键回来恢复状态)
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;
    
    if (bgm.paused) {
        musicBtn.classList.remove('playing');
        // 页面刚显示时，重置手动暂停状态，给自动播放一个机会
        // 如果你想让“返回”后保持静音，就把下面这行删掉。
        // 但通常逻辑是：新进页面（或返回）应该允许自动播放。
        isManuallyPaused = false; 
        tryAutoPlay(); // 尝试触发一次
    } else {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
        isManuallyPaused = false;
    }
});

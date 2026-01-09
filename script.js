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

        // 2. 【修复滑动不播放】在这里加了一句！
        // 只要这里感应到滑动了，就立刻尝试放歌
        tryAutoPlay();
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


/* --- 🎵 最终修复版：解决刷新和返回键不播放问题 --- */

var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 

// 1. 核心开关：控制播放/暂停
function toggleMusic() {
    if (!bgm) return;
    
    if (bgm.paused) {
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
            isMusicPlayed = true;
            removeAutoPlayListeners(); // 既然手动点了，就不用自动监听了
        }).catch(e => console.log("播放被拦截"));
    } else {
        bgm.pause();
        musicBtn.classList.remove('playing');
        isMusicPlayed = false; // 暂停后允许再次自动触发
        addAutoPlayListeners(); // 重新监听
    }
}

// 2. 智能自动播放 (滑动、点击、触摸都会触发这个)
function tryAutoPlay() {
    // 如果已经播过了，或者bgm不存在，直接退出，别浪费资源
    if (isMusicPlayed || !bgm) return; 

    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
        // 成功后，立刻卸载监听器，防止重复触发
        removeAutoPlayListeners();
    }).catch(e => {
        // 播放失败（浏览器限制），没事，下次动作再试
    });
}

// 3. 辅助函数：装监听器
function addAutoPlayListeners() {
    document.addEventListener('click', tryAutoPlay);
    document.addEventListener('touchstart', tryAutoPlay, { passive: true });
    // document scroll 监听保留备用，虽然主力是 setupNavbarScroll
    document.addEventListener('scroll', tryAutoPlay); 
}

// 4. 辅助函数：卸载监听器
function removeAutoPlayListeners() {
    document.removeEventListener('click', tryAutoPlay);
    document.removeEventListener('touchstart', tryAutoPlay);
    document.removeEventListener('scroll', tryAutoPlay);
}

// 5. 监听链接点击 (拦截刷新)
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.getAttribute('href') === 'index.html') {
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); 
            // 可以在这里决定点文字要不要切歌，目前保持不动
        }
    }
});

// 6. 【回魂补丁】修复按返回键回来不响的问题
window.addEventListener('pageshow', function(e) {
    if (!bgm) return;

    if (bgm.paused) {
        // 发现音乐停了（说明是返回键回来的，或者刚进来）
        musicBtn.classList.remove('playing');
        isMusicPlayed = false; 
        
        // 【关键】必须重新装上监听器！
        // 之前就是少了这一步，导致返回后滑动没反应
        addAutoPlayListeners(); 
    } else {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
    }
});

// 7. 首次加载启动
addAutoPlayListeners();

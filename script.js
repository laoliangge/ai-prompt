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
var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 

// 1. 核心开关：控制播放/暂停
function toggleMusic() {
    if (!bgm) return; // 防止页面没音乐报错
    
    if (bgm.paused) {
        bgm.play().then(() => {
            musicBtn.classList.add('playing');
        }).catch(e => console.log("播放被拦截"));
    } else {
        bgm.pause();
        musicBtn.classList.remove('playing');
    }
}

// 2. 智能自动播放
function tryAutoPlay() {
    if (isMusicPlayed || !bgm) return; 
    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        isMusicPlayed = true;
        // 成功后移除监听
        document.removeEventListener('click', tryAutoPlay);
        document.removeEventListener('touchstart', tryAutoPlay);
        document.removeEventListener('scroll', tryAutoPlay);
    }).catch(e => {});
}

// 3. 【新功能】监听所有链接点击
document.addEventListener('click', function(e) {
    // 找到被点击的链接
    var target = e.target.closest('a');
    
    // 如果点的是“方案”链接（href="index.html"）
    if (target && target.getAttribute('href') === 'index.html') {
        // 检查当前是不是已经在首页了
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            e.preventDefault(); // 阻止刷新！
            console.log("已在首页，拦截刷新，只切歌");
            // 你也可以在这里加一句 toggleMusic() 如果你想点文字也开关音乐
        }
    }
    
    // 剩下的情况（比如去 admin.html）浏览器会自动处理，不用管
});

// 4. 【新功能】回魂补丁 (修复按返回键图标空转)
window.addEventListener('pageshow', function(e) {
    // 每次页面显示（包括按返回键回来）都执行
    if (bgm) {
        if (bgm.paused) {
            // 如果声音停了，把转圈也停了，实事求是
            musicBtn.classList.remove('playing');
        } else {
            // 如果声音还在响（极少见），确保在转
            musicBtn.classList.add('playing');
        }
    }
});

// 启动监听
document.addEventListener('click', tryAutoPlay);
document.addEventListener('touchstart', tryAutoPlay);
document.addEventListener('scroll', tryAutoPlay);


/* --- 补全丢失的导航栏监听函数 --- */
function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    // 注意：你的滚动是在 gallery-wrapper 里，不是 window
    const scroller = document.getElementById('gallery-wrapper'); 
    
    if (!navbar || !scroller) return;

    scroller.addEventListener('scroll', () => {
        // ✅ 就是这个 IF 参数！
        // 我给你设成了 10 (你可以理解为 0)，只要有一点点滚动，立马变黑
        if (scroller.scrollTop > 25) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}


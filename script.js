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

/* --- 🎵 流氓土匪版：不响不罢休 + 强制清除记忆 --- */

// 1. 放在这里确保 HTML 加载完
document.addEventListener('DOMContentLoaded', function() {
    
    var bgm = document.getElementById('bgm');
    var musicBtn = document.getElementById('musicBtn');
    
    if (!bgm || !musicBtn) return;

    // 🧨 强制清除之前的“暂停”记忆！(测试专用)
    // 只要你刷新页面，我就忘了你关过音乐这回事，必须重新自动放！
    sessionStorage.removeItem('music_status'); 

    // 变量：是否正在播放
    var isPlaying = false;

    // --- A. 手动开关 (逻辑最简单) ---
    window.toggleMusic = function() {
        if (bgm.paused) {
            bgm.play();
            musicBtn.classList.add('playing');
            isPlaying = true;
        } else {
            bgm.pause();
            musicBtn.classList.remove('playing');
            isPlaying = false;
        }
    };

    // --- B. 霸王硬上弓 (自动播放核心) ---
    function forcePlay() {
        // 如果已经在放了，就别折腾了
        if (!bgm.paused) {
            musicBtn.classList.add('playing');
            return;
        }

        // 尝试播放
        var promise = bgm.play();

        if (promise !== undefined) {
            promise.then(() => {
                // 🎉 终于响了！
                musicBtn.classList.add('playing');
                isPlaying = true;
                
                // 响了之后，稍微讲点武德，把监听器拆了，省电
                removeTraps();
            }).catch(error => {
                // 🔇 还没响？(浏览器拦截了)
                // 没关系，我不报错，我也不拆监听器
                // 等你手指头下一次动弹，我接着试！
            });
        }
    }

    // --- C. 布下天罗地网 ---
    function setTraps() {
        // capture: true (true是精髓) -> 只要碰屏幕，我比所有按钮都先知道
        document.addEventListener('touchstart', forcePlay, true);
        document.addEventListener('click', forcePlay, true);
        
        // 👇 专治“滑动不响”：手指离开屏幕的那一瞬间，成功率最高！
        document.addEventListener('touchend', forcePlay, true); 
    }

    function removeTraps() {
        document.removeEventListener('touchstart', forcePlay, true);
        document.removeEventListener('click', forcePlay, true);
        document.removeEventListener('touchend', forcePlay, true);
    }

    // --- D. 执行顺序 ---
    
    // 1. 刚进页面，先布雷
    setTraps();
    
    // 2. 试着偷偷播一下 (万一运气好呢)
    bgm.play().then(() => {
        musicBtn.classList.add('playing');
        removeTraps(); // 运气真好，直接拆雷
    }).catch(() => {
        // 运气不好，保持地雷阵，等用户上手
    });

    // 3. 回魂补丁 (解决返回不响)
    // 每次页面重新显示（包括从发布页退回来），重新布雷！
    window.addEventListener('pageshow', function(e) {
        if (bgm.paused) {
            musicBtn.classList.remove('playing');
            setTraps(); // 兄弟们，抄家伙，准备干活
        } else {
            musicBtn.classList.add('playing');
        }
    });

    // 4. 拦截文字链接刷新
    document.addEventListener('click', function(e) {
        var target = e.target.closest('a');
        if (target && target.getAttribute('href') === 'index.html') {
             if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
                e.preventDefault(); 
            }
        }
    });

});

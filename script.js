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

/* --- 🎵 核弹级自动播放：全屏触控唤醒 + 记忆模式 --- */

// 1. 把它包起来，确保页面加载完了再执行，防止找不到元素
document.addEventListener('DOMContentLoaded', function() {
    
    var bgm = document.getElementById('bgm');
    var musicBtn = document.getElementById('musicBtn');
    
    // 安全检查：如果连音响都没有，就别折腾了
    if (!bgm || !musicBtn) return;

    // 2. 读取记忆：用户上次关了吗？
    // 默认是 'true' (要播放)，只有用户亲手关过才是 'false'
    var shouldPlay = sessionStorage.getItem('music_status') !== 'false';
    var hasInteracted = false; // 标记：是否已经成功唤醒过

    // --- 核心功能 A：开关按钮 ---
    window.toggleMusic = function() { // 挂在window上确保HTML能调用
        if (bgm.paused) {
            // 手动开
            bgm.play().then(() => {
                updateIcon(true);
                sessionStorage.setItem('music_status', 'true');
                shouldPlay = true;
            }).catch(e => console.log("播放失败:", e));
        } else {
            // 手动关
            bgm.pause();
            updateIcon(false);
            sessionStorage.setItem('music_status', 'false');
            shouldPlay = false;
        }
    };

    // --- 核心功能 B：全屏唤醒 (滑动/触摸/点击) ---
    function tryWakeUpMusic() {
        // 1. 如果用户明确只要静音，绝不打扰
        if (!shouldPlay) return;

        // 2. 如果已经在放了，赶紧拆除监听，别浪费性能
        if (!bgm.paused) {
            removeGlobalListeners();
            return;
        }

        // 3. 尝试播放 (这是关键！)
        // 只要用户碰了屏幕，立刻申请播放
        var playPromise = bgm.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // 🎉 响了！成功了！
                updateIcon(true);
                // 只要响了一次，就彻底移除所有监听，世界清静了
                removeGlobalListeners();
            }).catch(error => {
                // 🔇 失败了 (浏览器觉得刚才那一下滑动不算数)
                // 没关系，监听器留着，等用户下一次手指动作，继续试！
            });
        }
    }

    // --- 辅助：图标控制 ---
    function updateIcon(isPlaying) {
        if (isPlaying) {
            musicBtn.classList.add('playing');
        } else {
            musicBtn.classList.remove('playing');
        }
    }

    // --- 辅助：撒网监听 ---
    function addGlobalListeners() {
        // capture: true (捕获模式) -> 这就是“核弹”
        // 意思是：手指碰到屏幕的瞬间，在所有点击事件发生前，我先截获！
        document.addEventListener('touchstart', tryWakeUpMusic, true);
        document.addEventListener('touchend', tryWakeUpMusic, true); // 滑动结束松手时也试一下
        document.addEventListener('click', tryWakeUpMusic, true);
        document.addEventListener('scroll', tryWakeUpMusic, true); // 尽管scroll很难触发，但也加上
    }

    function removeGlobalListeners() {
        document.removeEventListener('touchstart', tryWakeUpMusic, true);
        document.removeEventListener('touchend', tryWakeUpMusic, true);
        document.removeEventListener('click', tryWakeUpMusic, true);
        document.removeEventListener('scroll', tryWakeUpMusic, true);
    }

    // --- 初始化逻辑 ---
    
    // 1. 刚进页面，先看记忆，如果该播，就立马撒网等待用户操作
    if (shouldPlay) {
        updateIcon(false); // 先别转，等响了再转
        addGlobalListeners(); // 埋好地雷
        // 顺便试着直接播一下 (万一浏览器心情好呢)
        bgm.play().then(() => { updateIcon(true); removeGlobalListeners(); }).catch(() => {});
    } else {
        updateIcon(false);
    }

    // 2. 回魂补丁 (解决从发布页返回不响)
    window.addEventListener('pageshow', function(e) {
        // 重新读取记忆
        shouldPlay = sessionStorage.getItem('music_status') !== 'false';
        
        if (shouldPlay && bgm.paused) {
            addGlobalListeners(); // 重新埋雷，等你手滑
        } else if (!bgm.paused) {
            updateIcon(true); // 如果还在响，确保图标在转
        }
    });

    // 3. 拦截链接点击 (防刷新)
    document.addEventListener('click', function(e) {
        var target = e.target.closest('a');
        if (target && target.getAttribute('href') === 'index.html') {
             if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
                e.preventDefault(); 
            }
        }
    });

});

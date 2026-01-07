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
            
            // 【改动1】删掉了判断屏幕宽度的代码
            // 现在不管手机还是电脑，直接启动自动滚动！
            startAutoScroll();
            setupInteraction();
        })
        .catch(err => console.error('Error:', err));
});

function initGallery() {
    // 必须是 columns-container，只操作图片区，标题才安全
    const container = document.getElementById('columns-container');
    if (!container) return; 

    container.innerHTML = ''; 
    
    // 手机2列，电脑4列
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
            // 手机版结构
            card.innerHTML = `
                <img src="${item.imageUrl}" loading="lazy" alt="${item.title}">
                <div class="card-info"><div class="card-title">${item.title}</div></div>
            `;
        } else {
            // 电脑版结构
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

// 自动滚屏逻辑
function startAutoScroll() {
    const scroller = document.getElementById('gallery-wrapper');
    const speed = 0.5; // 滚动速度，嫌快就改小点（比如 0.3）

    function step() {
        // 只有没暂停的时候才滚
        if (!isPaused) {
            // 如果还没滚到底，就继续滚
            if ((scroller.scrollTop + scroller.clientHeight) < scroller.scrollHeight) {
                scroller.scrollBy(0, speed);
            }
        }
        autoScrollTimer = requestAnimationFrame(step);
    }
    step();
}

// 【改动2】交互刹车系统（专门加强了手机端）
function setupInteraction() {
    let pauseTimeout;
    const scroller = document.getElementById('gallery-wrapper');

    // --- 电脑端鼠标交互 ---
    window.addEventListener('mousemove', () => {
        isPaused = true;
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => { isPaused = false; }, 1000);
    });

    // --- 手机端手指交互 (新增) ---
    // 手指一按屏幕，立马停车
    scroller.addEventListener('touchstart', () => {
        isPaused = true;
        clearTimeout(pauseTimeout);
    }, { passive: true });

    // 手指离开屏幕，等1秒后再启动
    scroller.addEventListener('touchend', () => {
        pauseTimeout = setTimeout(() => { isPaused = false; }, 1000);
    });
}

// 弹窗逻辑
function openModal(item) {
    const modal = document.getElementById('modal');
    document.getElementById('modalImage').src = item.imageUrl;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalCategory').innerText = item.category;
    document.getElementById('modalPrompt').innerText = item.prompt;
    document.getElementById('modalId').innerText = 'ID ' + item.id;
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
    isPaused = true; // 打开弹窗时必须暂停
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('modalImage').src = '';
    }, 300);
    // 关掉弹窗后，自动恢复滚动（由 setupInteraction 接管）
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

/* --- 修正版 JS：放在 script.js 最后面 --- */

// 1. 找到那个真正负责滚动的容器 (就是 main 标签)
const scrollContainer = document.getElementById('gallery-wrapper');
// 2. 找到导航栏
const navbar = document.querySelector('.navbar');

// 3. 监听容器的滚动 (注意：这里不再是 window 了)
scrollContainer.addEventListener('scroll', () => {
    // 检查容器滚了多少距离 (scrollTop)
    if (scrollContainer.scrollTop > 10) {
        navbar.classList.add('scrolled'); // 滚了：变黑
    } else {
        navbar.classList.remove('scrolled'); // 回顶：变透明
    }
});



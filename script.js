// 全局变量
let allData = [];
let autoScrollTimer = null;
let isPaused = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 加载数据
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            // 按 ID 倒序（最新在最前）
            allData = data.sort((a, b) => b.id - a.id);
            initGallery();
            
            // 2. 只有在电脑端开启自动滚动 (屏幕宽度 > 768)
            if (window.innerWidth > 768) {
                startAutoScroll();
                // 监听交互，实现“悬停刹车”
                setupInteraction();
            }
        })
        .catch(err => console.error('数据挂了:', err));
});

// 初始化画廊 (智能分列)
function initGallery() {
    const wrapper = document.getElementById('gallery-wrapper');
    wrapper.innerHTML = ''; // 清空

    // 决定列数：手机2列，电脑4列
    const colCount = window.innerWidth <= 768 ? 2 : 4;
    
    // 创建列容器
    const columns = [];
    for (let i = 0; i < colCount; i++) {
        const col = document.createElement('div');
        col.className = 'gallery-column';
        wrapper.appendChild(col);
        columns.push(col);
    }

    // 循环发牌 (横向顺序：左->右->左->右)
    allData.forEach((item, index) => {
        // 算出该给哪一列 (0, 1, 2, 3...)
        const colIndex = index % colCount;
        
        // 生成卡片 HTML
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openModal(item);

        // 根据设备生成不同的内部结构 (保留你的手机标题样式)
        if (window.innerWidth <= 768) {
            // 手机版结构：极简
            card.innerHTML = `
                <img src="${item.imageUrl}" loading="lazy" alt="${item.title}">
                <div class="card-info">
                    <div class="card-title">${item.title}</div>
                </div>
            `;
        } else {
            // 电脑版结构：信息全
            card.innerHTML = `
                <img src="${item.imageUrl}" loading="lazy" alt="${item.title}">
                <div class="card-info">
                    <span class="card-category">${item.category}</span>
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.prompt}</div>
                </div>
            `;
        }
        
        // 放入对应的列
        columns[colIndex].appendChild(card);
    });
}

// --- 自动滚屏逻辑 ---
function startAutoScroll() {
    // 使用 requestAnimationFrame 保证流畅
    function step() {
        if (!isPaused) {
            // 每次滚动 0.5 像素 (数值越小越慢)
            window.scrollBy(0, 0.5);
            // 如果滚到底了，这就得看你想不想循环了，目前先停下
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
                // 到底了
            }
        }
        autoScrollTimer = requestAnimationFrame(step);
    }
    step();
}

function setupInteraction() {
    // 鼠标动一下，暂停 2 秒，然后继续
    let pauseTimeout;
    
    window.addEventListener('mousemove', () => {
        isPaused = true;
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => {
            isPaused = false;
        }, 1000); // 停顿1秒后继续
    });

    // 鼠标彻底悬停在卡片上时，绝对静止
    document.getElementById('gallery-wrapper').addEventListener('mouseenter', () => isPaused = true);
    // 移出画廊区域，继续滚
    // document.getElementById('gallery-wrapper').addEventListener('mouseleave', () => isPaused = false);
}

// --- 弹窗逻辑 ---
function openModal(item) {
    const modal = document.getElementById('modal');
    
    // 填充数据
    document.getElementById('modalImage').src = item.imageUrl;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalCategory').innerText = item.category;
    document.getElementById('modalPrompt').innerText = item.prompt;
    document.getElementById('modalId').innerText = 'ID ' + item.id;

    modal.style.display = 'flex';
    // 强制重绘触发渐变动画
    requestAnimationFrame(() => modal.classList.add('show'));
    
    // 刹车：打开弹窗时，背景绝对不能滚
    isPaused = true; 
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('modalImage').src = '';
    }, 300);
    
    // 恢复背景滚动
    isPaused = false;
    document.body.style.overflow = 'auto';
}

// 复制功能
function copyPrompt() {
    const text = document.getElementById('modalPrompt').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ 已复制';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    });
}

// 监听窗口大小变化（旋转屏幕时重新排版）
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initGallery, 300);
});

// 全局变量
let allData = [];
let autoScrollTimer = null;
let isPaused = false;

document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            // 听你的：不排序，原样保留文件顺序
            allData = data; 
            
            initGallery();
            
            // 只有电脑端开启自动滚屏
            if (window.innerWidth > 768) {
                startAutoScroll();
                setupInteraction();
            }
        })
        .catch(err => console.error('Error:', err));
});

function initGallery() {
    const wrapper = document.getElementById('gallery-wrapper');
    // 注意：wrapper 内部需要先清空，但因为我们是追加列，所以这里清空 wrapper 的内容
    wrapper.innerHTML = ''; 
    
    // 如果想要 Hero 标题也显示在滚动区域内，得把它加回来，或者在 HTML 里调整
    // 这里我们只处理图片列
    
    // 手机2列，电脑4列
    const colCount = window.innerWidth <= 768 ? 2 : 4;
    
    const columns = [];
    for (let i = 0; i < colCount; i++) {
        const col = document.createElement('div');
        col.className = 'gallery-column';
        wrapper.appendChild(col);
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

// --- 自动滚屏逻辑 (修改版：滚容器，不滚窗口) ---
function startAutoScroll() {
    // 目标元素：我们那个可滚动的笼子
    const scroller = document.getElementById('gallery-wrapper');
    const speed = 0.5;

    function step() {
        if (!isPaused) {
            // 如果没到底
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
    
    // 鼠标动一下，暂停
    window.addEventListener('mousemove', () => {
        isPaused = true;
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => { isPaused = false; }, 1000);
    });
    
    // 鼠标放上去，暂停
    scroller.addEventListener('mouseenter', () => isPaused = true);
}

// --- 弹窗逻辑 ---
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
        btn.innerHTML = '✅ 已复制';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    });
}

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initGallery, 300);
});

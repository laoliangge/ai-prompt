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


/* --- 修正版 JS：放在 script.js 最后面 --- */

// 1. 找到那个真正负责滚动的容器 (就是 main 标签)
const scrollContainer = document.getElementById('gallery-wrapper');
// 2. 找到导航栏
const navbar = document.querySelector('.navbar');

// 3. 监听容器的滚动 (注意：这里不再是 window 了)
scrollContainer.addEventListener('scroll', () => {
    // 检查容器滚了多少距离 (scrollTop)
    if (scrollContainer.scrollTop > 20) {
        navbar.classList.add('scrolled'); // 滚了：变黑
    } else {
        navbar.classList.remove('scrolled'); // 回顶：变透明
    }
});


/* --- 🎵 放在 script.js 最后面：音乐控制逻辑 --- */

// 1. 获取元素
var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('musicBtn');
var isMusicPlayed = false; 

// 2. 按钮点击功能：开关音乐
function toggleMusic() {
    if (bgm.paused) {
        bgm.play();
        musicBtn.classList.add('playing');
    } else {
        bgm.pause();
        musicBtn.classList.remove('playing');
    }
}

// 3. 智能自动播放 (用户第一次交互时触发)
function autoPlayMusic() {
    // 如果还没播放过，就尝试播放
    if (!isMusicPlayed) {
        bgm.volume = 0.5; // 音量 50%，别太吵
        
        // 尝试播放
        var playPromise = bgm.play();
        
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // 播放成功！
                musicBtn.classList.add('playing');
                isMusicPlayed = true;
                // 成功后，移除监听，以后就不打扰了
                document.removeEventListener('click', autoPlayMusic);
                document.removeEventListener('touchstart', autoPlayMusic);
                document.removeEventListener('scroll', autoPlayMusic);
            }).catch(error => {
                // 浏览器阻止了，没事，等待下一次点击
                console.log("等待用户交互来播放音乐");
            });
        }
    }
}

// 监听用户的点击、触摸、滚动，一旦发生就尝试播放
document.addEventListener('click', autoPlayMusic);
document.addEventListener('touchstart', autoPlayMusic);
document.addEventListener('scroll', autoPlayMusic);






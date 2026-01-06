document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.getElementById('gallery');
    const modal = document.getElementById('modal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const closeBtn = document.getElementById('closeBtn');
    
    // 弹窗元素
    const modalImage = document.getElementById('modalImage');
    const modalBlurBg = document.getElementById('modalBlurBg');
    const modalTitle = document.getElementById('modalTitle');
    const modalCategory = document.getElementById('modalCategory');
    const modalPrompt = document.getElementById('modalPrompt');
    const modalId = document.getElementById('modalId');
    const copyBtn = document.getElementById('copyBtn');
    const copyText = document.getElementById('copyText');

    // 1. 读取数据
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            renderGallery(data);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            galleryContainer.innerHTML = '<p style="text-align:center; color:red;">数据加载失败，请检查 data.json</p>';
        });

    // 2. 渲染画廊
    function renderGallery(items) {
        galleryContainer.innerHTML = ''; // 清空加载状态
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${item.imageUrl}" alt="${item.title}" class="card-img" loading="lazy">
                </div>
                <div class="card-content">
                    <span class="card-tag">${item.category}</span>
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-prompt-preview">${item.prompt}</p>
                </div>
            `;
            
            // 点击卡片打开弹窗
            card.addEventListener('click', () => openModal(item));
            galleryContainer.appendChild(card);
        });
    }

    // 3. 弹窗逻辑
    function openModal(item) {
        modalImage.src = item.imageUrl;
        modalBlurBg.style.backgroundImage = `url(${item.imageUrl})`;
        modalTitle.textContent = item.title;
        modalCategory.textContent = item.category;
        modalPrompt.textContent = item.prompt;
        modalId.textContent = `ID: ${item.id}`;
        
        // 重置复制按钮状态
        resetCopyButton();

        modal.classList.remove('hidden');
        // 强制重绘以触发 transition
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }

    function closeModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
            modalImage.src = ''; // 清理图片引用
        }, 300); // 这里的 300ms 对应 CSS 中的 transition 时间
        document.body.style.overflow = '';
    }

    // 关闭事件绑定
    closeBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // 4. 复制功能
    copyBtn.addEventListener('click', () => {
        const textToCopy = modalPrompt.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.classList.add('copied');
            copyText.textContent = '已复制!';
            setTimeout(resetCopyButton, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
    });

    function resetCopyButton() {
        copyBtn.classList.remove('copied');
        copyText.textContent = '一键复制';
    }
});
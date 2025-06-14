document.addEventListener('DOMContentLoaded', () => {
    // --- CẤU HÌNH & DOM ELEMENTS ---
    const API_URL = 'https://prod.api.market/api/v1/magicapi/image-upload/upload';
    const LOCAL_STORAGE_KEY = 'imageUploaderApiKey';

    const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiButton = document.getElementById('saveApiButton');
    const toggleApiVisibility = document.getElementById('toggleApiVisibility');
    const imageInput = document.getElementById('imageInput');
    const fileChosenText = document.getElementById('file-chosen');
    const uploadButton = document.getElementById('uploadButton');
    const resultBody = document.getElementById('resultBody');
    const copyAllButton = document.getElementById('copyAllButton');
    const dropZone = document.getElementById('dropZone');
    
    let selectedFiles = [];

    // --- UI & UX FUNCTIONS ---

    const showToast = (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    };
    
    const updateUploadButtonState = () => {
        uploadButton.disabled = selectedFiles.length === 0 || apiKeyInput.value.trim() === '';
    };

    const updateFileChosenText = () => {
        if (selectedFiles.length > 0) {
            fileChosenText.textContent = selectedFiles.length === 1
                ? selectedFiles[0].name
                : `${selectedFiles.length} tệp đã được chọn`;
        } else {
            fileChosenText.textContent = 'Chưa có ảnh nào được chọn';
        }
    };
    
    const showInitialPlaceholder = () => {
        resultBody.innerHTML = `<tr class="no-results"><td colspan="4">Chưa có kết quả nào.</td></tr>`;
        copyAllButton.style.display = 'none';
    };

    // --- API KEY MANAGEMENT ---
    
    const loadApiKey = () => {
        apiKeyInput.value = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
        toggleApiVisibility.innerHTML = eyeIcon;
        updateUploadButtonState();
    };

    saveApiButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
            showToast('Đã lưu API Key!', 'success');
            updateUploadButtonState();
        } else {
            showToast('API Key không được để trống.', 'error');
        }
    });

    toggleApiVisibility.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleApiVisibility.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
    });

    apiKeyInput.addEventListener('input', updateUploadButtonState);

    // --- DRAG & DROP AND FILE HANDLING ---

    const handleFiles = (files) => {
        selectedFiles = Array.from(files);
        updateFileChosenText();
        updateUploadButtonState();
    };

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    imageInput.addEventListener('change', () => handleFiles(imageInput.files));

    // --- UPLOAD LOGIC ---
    
    uploadButton.addEventListener('click', async () => {
        resultBody.innerHTML = '';
        copyAllButton.style.display = 'none';
        uploadButton.disabled = true;
        uploadButton.textContent = 'Đang tải lên...';

        const currentApiKey = apiKeyInput.value.trim();
        const uploadPromises = selectedFiles.map(file => uploadFile(file, currentApiKey));
        await Promise.all(uploadPromises);

        uploadButton.disabled = false;
        uploadButton.textContent = 'Tải lên';
        updateUploadButtonState();

        const successCount = document.querySelectorAll('.status-success').length;
        if (successCount > 0) {
            copyAllButton.style.display = 'inline-block';
        }
    });

    async function uploadFile(file, apiKey) {
        const rowId = `row-${Date.now()}-${Math.random()}`;
        const previewUrl = URL.createObjectURL(file);
        const row = document.createElement('tr');
        row.id = rowId;
        row.innerHTML = `
            <td><img src="${previewUrl}" alt="Preview" class="preview-img"></td>
            <td class="filename-cell" title="${file.name}">${file.name}</td>
            <td class="status status-uploading">Đang tải...</td>
            <td>...</td>
        `;
        resultBody.appendChild(row);

        const formData = new FormData();
        formData.append('filename', file);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'x-magicapi-key': apiKey },
                body: formData
            });
            const statusCell = row.cells[2];
            const linkCell = row.cells[3];

            if (response.ok) {
                const data = await response.json();
                statusCell.textContent = 'Thành công';
                statusCell.className = 'status status-success';
                linkCell.innerHTML = `<button class="copy-btn" data-url="${data.url}">Copy Link Image</button>`;
            } else {
                const errorText = await response.text();
                statusCell.textContent = `Lỗi ${response.status}`;
                statusCell.className = 'status status-error';
                linkCell.textContent = errorText.length < 50 ? errorText : 'Lỗi từ server';
            }
        } catch (error) {
            row.cells[2].textContent = 'Lỗi Mạng';
            row.cells[2].className = 'status status-error';
            row.cells[3].textContent = 'Kiểm tra kết nối';
        } finally {
            URL.revokeObjectURL(previewUrl);
        }
    }

    // --- COPY ACTIONS ---

    resultBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) {
            const button = e.target;
            navigator.clipboard.writeText(button.dataset.url)
                .then(() => showToast('Đã sao chép liên kết!', 'success'))
                .catch(() => showToast('Sao chép thất bại!', 'error'));
        }
    });
    
    copyAllButton.addEventListener('click', () => {
        const links = Array.from(resultBody.querySelectorAll('.status-success'))
            .map(statusCell => statusCell.nextElementSibling.querySelector('button')?.dataset.url)
            .filter(url => url)
            .join('\n');

        if (links) {
            navigator.clipboard.writeText(links)
                .then(() => showToast(`Đã sao chép ${links.split('\n').length} liên kết!`, 'success'))
                .catch(() => showToast('Sao chép thất bại!', 'error'));
        } else {
            showToast('Không có liên kết thành công để sao chép.', 'warning');
        }
    });

    // --- INITIALIZE ---
    loadApiKey();
    showInitialPlaceholder();
});

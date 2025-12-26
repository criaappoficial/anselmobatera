import SaaS from '../../js/saas-engine.js';

// Admin Dashboard Logic

// 1. Auth & Init (Handled via Event now)
window.addEventListener('saasUserUpdated', (e) => {
    const user = e.detail;
    
    // Update Sidebar/Header Info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userPhoto').src = user.photo || "../assets/logo.png";
    
    // Check Status (isLogin / isPaid)
    const statusEl = document.getElementById('dashSubStatus');
    const userStatusEl = document.getElementById('userStatus');
    
    // Logic: user.isLogin must be true for ACTIVE status
    // user.subscriptionStatus is also tracked
    if (user.isLogin === true) {
        statusEl.textContent = "ATIVA";
        statusEl.className = "status-badge status-active";
        userStatusEl.textContent = "Conta Verificada";
        userStatusEl.className = "status-active";
        enableEditing(true);
    } else {
        statusEl.textContent = "PENDENTE";
        statusEl.className = "status-badge status-pending";
        userStatusEl.textContent = "Aguardando Aprovação";
        userStatusEl.className = "status-pending";
        
        // Show warning and Disable Editing
        // alert("Sua conta aguarda aprovação do administrador (Pagamento via Pix). As edições estão desabilitadas."); // Removed alert to be less intrusive on reload, UI already shows status
        enableEditing(false);
        switchTab('subscription'); // Send to payment page
    }

    // Date formatting (Mock or Real)
    if (user.createdAt) {
         const created = new Date(user.createdAt);
         document.getElementById('dashNextBilling').textContent = created.toLocaleDateString('pt-BR');
    }
});

// Disable/Enable Editing
function enableEditing(enabled) {
    // Select all inputs, textareas, and buttons (except those in the subscription tab if we want to allow copying, but generally disabling save buttons is key)
    // We want to disable form submissions and edits.
    const inputs = document.querySelectorAll('input, textarea, select');
    const buttons = document.querySelectorAll('button.btn-primary');
    
    inputs.forEach(input => {
        input.disabled = !enabled;
    });

    buttons.forEach(btn => {
        // Don't disable buttons in the payment area if we had any (we removed the simulation button)
        // We mainly want to disable "Save" buttons.
        btn.disabled = !enabled;
        if (!enabled) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = "Aguardando aprovação do pagamento";
        } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = "";
        }
    });
}

// 3. Populate Forms (Listen for Config Update)
window.addEventListener('saasConfigUpdated', (e) => {
    const config = e.detail;
    if(!config) return;

    // Hero
    if(document.getElementById('heroTitle')) document.getElementById('heroTitle').value = config.hero?.title || "";
    if(document.getElementById('heroSubtitle')) document.getElementById('heroSubtitle').value = config.hero?.subtitle || "";
    if(document.getElementById('heroImage')) document.getElementById('heroImage').value = config.hero?.image || "";
    
    updateImagePreview('heroImagePreview', config.hero?.image);

    // About
    if(document.getElementById('aboutTitle')) document.getElementById('aboutTitle').value = config.about?.title || "";
    if(document.getElementById('aboutText')) document.getElementById('aboutText').value = config.about?.text || "";
    if(document.getElementById('aboutImage')) document.getElementById('aboutImage').value = config.about?.image || "";
    
    updateImagePreview('aboutImagePreview', config.about?.image);

    // Brands
    renderBrands();

    // Gallery
    if (config.gallery) {
        for(let i=1; i<=4; i++) {
            const val = config.gallery[`img${i}`] || "";
            if(document.getElementById(`gallery${i}`)) document.getElementById(`gallery${i}`).value = val;
            updateImagePreview(`gallery${i}Preview`, val);
        }
    }

    // Style
    if (config.style) {
        if(document.getElementById('videoBg')) document.getElementById('videoBg').value = config.style.videoBg || "";
        updateImagePreview('videoBgPreview', config.style.videoBg);
    }


    // Contact
    if(document.getElementById('contactWhatsapp')) document.getElementById('contactWhatsapp').value = config.contact?.whatsapp || "";
    if(document.getElementById('contactEmail')) document.getElementById('contactEmail').value = config.contact?.email || "";
    if(document.getElementById('contactInstagram')) document.getElementById('contactInstagram').value = config.contact?.instagram || "";
    
    // Refresh Lists
    renderVideos();
    renderPricing();
});

// Helper: Update Image Preview
function updateImagePreview(previewId, imageSrc) {
    const previewEl = document.getElementById(previewId);
    if (!previewEl) return;

    // Check if imageSrc is valid (not empty, not null)
    if (imageSrc && imageSrc.length > 0) {
        previewEl.src = imageSrc;
        previewEl.style.display = 'block';
        // Remove emoji placeholder if it was added via JS (simplest is just to show image)
    } else {
        // Show placeholder or hide
        // User requested emoji if no image
        // However, the IMG tag cannot simply render text.
        // We'll set src to a placeholder image or hide it.
        // Let's hide it to avoid broken image icon, and maybe show a span next to it?
        // Or simpler: set src to empty and hide.
        previewEl.style.display = 'none';
        
        // Let's create a placeholder span if not exists
        let placeholder = document.getElementById(previewId + '-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = previewId + '-placeholder';
            placeholder.style.fontSize = '2rem';
            placeholder.style.marginTop = '10px';
            placeholder.textContent = '📷 Sem imagem selecionada';
            previewEl.parentNode.appendChild(placeholder);
        }
        placeholder.style.display = 'block';
        
        // If we have an image, we should hide the placeholder
        if (imageSrc && imageSrc.length > 0) {
             placeholder.style.display = 'none';
        }
    }
    
    // Logic fix: if imageSrc is valid, hide placeholder
    if (imageSrc && imageSrc.length > 0) {
        const placeholder = document.getElementById(previewId + '-placeholder');
        if (placeholder) placeholder.style.display = 'none';
    }
}

// Convert Image to Base64 (String)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Helper: Handle File Inputs
const fileInputs = ['heroImage', 'aboutImage']; // Add IDs of file inputs if they exist
// Currently we don't have file inputs in the HTML, let's assume we might need to add them or handle the string paths.
// The user asked to "convert to string" when uploading. 
// We need to listen to change events on file inputs if they exist.

document.body.addEventListener('change', async (e) => {
    if (e.target.type === 'file') {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64String = await fileToBase64(file);
                // Find the hidden input or text input that stores the image path/string
                // Assuming the input ID is related to the file input ID
                // e.g., heroImageFile -> heroImage (text)
                const targetId = e.target.getAttribute('data-target'); 
                if (targetId) {
                    const targetInput = document.getElementById(targetId);
                    if (targetInput) {
                        targetInput.value = base64String;
                        // Optionally preview it
                        const previewId = e.target.getAttribute('data-preview');
                        if (previewId) {
                            const previewEl = document.getElementById(previewId);
                            if (previewEl) previewEl.src = base64String;
                        }
                    }
                }
            } catch (err) {
                console.error("Error converting file:", err);
                alert("Erro ao processar imagem.");
            }
        }
    }
});

// 2. Tab Switching
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    // Show selected
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add('active');
    
    // Update Page Title
    const titles = {
        'dashboard': 'Visão Geral',
        'content': 'Gerenciar Conteúdo',
        'media': 'Mídia e Vídeos',
        'services': 'Preços e Serviços',
        'contact': 'Informações de Contato',
        'subscription': 'Minha Assinatura'
    };
    document.getElementById('page-title').textContent = titles[tabId];
}

// Add event listeners to sidebar
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
        switchTab(item.getAttribute('data-tab'));
    });
});

// 3. Populate Forms (Handled by saasConfigUpdated event above)
// const config = SaaS.getConfig(); ... REMOVED

// 4. Form Handlers
document.getElementById('heroForm').addEventListener('submit', (e) => {
    e.preventDefault();
    SaaS.updateSection('hero', {
        title: document.getElementById('heroTitle').value,
        subtitle: document.getElementById('heroSubtitle').value,
        image: document.getElementById('heroImage').value
    });
    alert('Seção Hero atualizada com sucesso!');
});

document.getElementById('aboutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    SaaS.updateSection('about', {
        title: document.getElementById('aboutTitle').value,
        text: document.getElementById('aboutText').value,
        image: document.getElementById('aboutImage').value
    });
    alert('Sobre Mim atualizado com sucesso!');
});

// Brands Logic
function renderBrands() {
    const list = document.getElementById('brandList');
    if (!list) return;
    
    list.innerHTML = '';
    const brands = SaaS.getConfig().brands || [];
    
    if (brands.length === 0) {
        list.innerHTML = '<p class="text-muted" style="text-align:center; padding: 20px;">Nenhuma marca cadastrada.</p>';
        return;
    }
    
    brands.forEach((brand, index) => {
        const div = document.createElement('div');
        div.className = 'form-group card';
        div.style.padding = '15px';
        div.style.background = 'var(--bg-darker)';
        div.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <strong>Marca ${index + 1}</strong>
                <button type="button" class="btn-primary" style="background: var(--danger); padding: 5px 10px; font-size: 0.8rem;" onclick="removeBrand(${index})">Remover</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label class="form-label">Nome da Marca</label>
                    <input type="text" class="form-control" value="${brand.name || ''}" id="brand-name-${index}" placeholder="Ex: Zeus Cymbals">
                </div>
                <div>
                    <label class="form-label">Logo da Marca (Imagem)</label>
                    <input type="file" class="form-control" accept="image/*" onchange="handleBrandLogoUpload(this, ${index})">
                    <input type="hidden" id="brand-logo-${index}" value="${brand.logo || ''}">
                    <div style="margin-top: 10px; background: #333; padding: 5px; border-radius: 5px; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center;">
                        ${brand.logo ? `<img src="${brand.logo}" id="brand-preview-${index}" style="max-height: 40px; max-width: 100%;">` : `<span id="brand-preview-text-${index}" style="font-size: 0.8rem; color: #aaa;">Sem logo</span><img id="brand-preview-${index}" style="display:none; max-height: 40px; max-width: 100%;">`}
                    </div>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

function handleBrandLogoUpload(input, index) {
    if (input.files && input.files[0]) {
        fileToBase64(input.files[0]).then(base64 => {
            document.getElementById(`brand-logo-${index}`).value = base64;
            const preview = document.getElementById(`brand-preview-${index}`);
            preview.src = base64;
            preview.style.display = 'block';
            
            const text = document.getElementById(`brand-preview-text-${index}`);
            if(text) text.style.display = 'none';
        });
    }
}

function addBrandField() {
    const config = SaaS.getConfig();
    if (!config.brands) config.brands = [];
    config.brands.push({ name: "", logo: "" });
    SaaS.saveConfig(config);
    renderBrands();
}

function removeBrand(index) {
    if(confirm('Tem certeza?')) {
        const config = SaaS.getConfig();
        config.brands.splice(index, 1);
        SaaS.saveConfig(config);
        renderBrands();
    }
}

function saveBrands() {
    const config = SaaS.getConfig();
    const newBrands = [];
    const count = config.brands ? config.brands.length : 0;
    
    for(let i=0; i<count; i++) {
        const nameEl = document.getElementById(`brand-name-${i}`);
        const logoEl = document.getElementById(`brand-logo-${i}`);
        if (nameEl && logoEl) {
             newBrands.push({
                name: nameEl.value,
                logo: logoEl.value
            });
        }
    }
    
    const fullConfig = SaaS.getConfig();
    fullConfig.brands = newBrands;
    SaaS.saveConfig(fullConfig);
    
    alert('Marcas salvas!');
}

// Make functions global for onclick
window.addBrandField = addBrandField;
window.removeBrand = removeBrand;
window.saveBrands = saveBrands;
window.handleBrandLogoUpload = handleBrandLogoUpload;


document.getElementById('galleryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    SaaS.updateSection('gallery', {
        img1: document.getElementById('gallery1').value,
        img2: document.getElementById('gallery2').value,
        img3: document.getElementById('gallery3').value,
        img4: document.getElementById('gallery4').value
    });
    alert('Galeria atualizada!');
});

document.getElementById('styleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    SaaS.updateSection('style', {
        videoBg: document.getElementById('videoBg').value
    });
    alert('Estilo atualizado!');
});

document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    SaaS.updateSection('contact', {
        whatsapp: document.getElementById('contactWhatsapp').value,
        email: document.getElementById('contactEmail').value,
        instagram: document.getElementById('contactInstagram').value
    });
    alert('Contatos atualizados com sucesso!');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    SaaS.logout();
});

// Initial Tab
switchTab('dashboard');

// --- Media & Pricing Logic ---

// Videos
function renderVideos() {
    const list = document.getElementById('videoList');
    list.innerHTML = '';
    const videos = SaaS.getConfig().videos || [];
    
    videos.forEach((video, index) => {
        const div = document.createElement('div');
        div.className = 'form-group card';
        div.style.padding = '15px';
        div.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <strong>Vídeo ${index + 1}</strong>
                <button type="button" class="btn-primary" style="background: var(--danger); padding: 5px 10px; font-size: 0.8rem;" onclick="removeVideo(${index})">Remover</button>
            </div>
            <label class="form-label">Título</label>
            <input type="text" class="form-control mb-2" value="${video.title}" id="vid-title-${index}">
            <label class="form-label" style="margin-top: 10px;">URL / ID (YouTube ou Local)</label>
            <input type="text" class="form-control" value="${video.url || video.id}" id="vid-url-${index}">
        `;
        list.appendChild(div);
    });
}

function addVideoField() {
    const config = SaaS.getConfig();
    config.videos.push({ title: "Novo Vídeo", url: "", type: "youtube" });
    SaaS.saveConfig(config);
    renderVideos();
}

function removeVideo(index) {
    if(confirm('Tem certeza?')) {
        const config = SaaS.getConfig();
        config.videos.splice(index, 1);
        SaaS.saveConfig(config);
        renderVideos();
    }
}

function saveVideos() {
    const config = SaaS.getConfig();
    const newVideos = [];
    const count = config.videos.length;
    
    for(let i=0; i<count; i++) {
        newVideos.push({
            title: document.getElementById(`vid-title-${i}`).value,
            url: document.getElementById(`vid-url-${i}`).value,
            id: document.getElementById(`vid-url-${i}`).value, // simplifying for demo
            type: "youtube" // default
        });
    }
    
    SaaS.updateSection('videos', newVideos); // This structure matches config.videos array directly? No, updateSection expects object merge.
    // updateSection merges keys. So if I pass array it might fail if implementation assumes object.
    // Let's check saas-engine.js: config[section] = { ...config[section], ...data }; 
    // If section is 'videos', config.videos is an array. Merging array with object is bad.
    
    // Correction: I should directly modify the config object for arrays
    const fullConfig = SaaS.getConfig();
    fullConfig.videos = newVideos;
    SaaS.saveConfig(fullConfig);
    
    alert('Vídeos salvos!');
}

// Pricing
function renderPricing() {
    const list = document.getElementById('pricingList');
    list.innerHTML = '';
    const pricing = SaaS.getConfig().pricing || [];
    
    pricing.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'form-group card';
        div.style.padding = '15px';
        div.innerHTML = `
             <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <strong>Serviço ${index + 1}</strong>
                <button type="button" class="btn-primary" style="background: var(--danger); padding: 5px 10px; font-size: 0.8rem;" onclick="removePrice(${index})">Remover</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <label class="form-label">Nome do Serviço</label>
                    <input type="text" class="form-control" value="${item.title}" id="price-title-${index}">
                </div>
                <div>
                    <label class="form-label">Valor</label>
                    <input type="text" class="form-control" value="${item.price}" id="price-val-${index}">
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

function savePricing() {
    const config = SaaS.getConfig();
    const count = config.pricing.length;
    const newPricing = [];
    
    for(let i=0; i<count; i++) {
        newPricing.push({
            id: i,
            title: document.getElementById(`price-title-${i}`).value,
            price: document.getElementById(`price-val-${i}`).value,
            features: config.pricing[i].features // preserve features for now
        });
    }
    
    const fullConfig = SaaS.getConfig();
    fullConfig.pricing = newPricing;
    SaaS.saveConfig(fullConfig);
    alert('Preços salvos!');
}

function removePrice(index) {
     if(confirm('Tem certeza?')) {
        const config = SaaS.getConfig();
        config.pricing.splice(index, 1);
        SaaS.saveConfig(config);
        renderPricing();
    }
}

// Initial Renders
renderVideos();
renderPricing();

// Expose functions to global scope for HTML onclick attributes
window.addVideoField = addVideoField;
window.removeVideo = removeVideo;
window.saveVideos = saveVideos;
window.savePricing = savePricing;
window.removePrice = removePrice;
window.switchTab = switchTab;


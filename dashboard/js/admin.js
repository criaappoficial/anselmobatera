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
    if(document.getElementById('aboutSubtitle')) document.getElementById('aboutSubtitle').value = config.about?.subtitle || "";
    if(document.getElementById('aboutTitle')) document.getElementById('aboutTitle').value = config.about?.title || "";
    if(document.getElementById('aboutText')) document.getElementById('aboutText').value = config.about?.text || "";
    if(document.getElementById('aboutImage')) document.getElementById('aboutImage').value = config.about?.image || "";
    
    updateImagePreview('aboutImagePreview', config.about?.image);

    // Brands
    renderBrands();
    renderStats();

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

    let displaySrc = imageSrc;
    // Fix relative paths for Admin Dashboard (assets/ -> ../assets/)
    if (displaySrc && typeof displaySrc === 'string' && displaySrc.startsWith('assets/')) {
        displaySrc = '../' + displaySrc;
    }

    // Check if imageSrc is valid (not empty, not null)
    if (displaySrc && displaySrc.length > 0) {
        previewEl.src = displaySrc;
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

// Loader Helpers
function showLoader(text = 'Carregando...') {
    let loader = document.getElementById('admin-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'admin-loader';
        loader.style.position = 'fixed';
        loader.style.top = '0';
        loader.style.left = '0';
        loader.style.width = '100%';
        loader.style.height = '100%';
        loader.style.background = 'rgba(0,0,0,0.7)';
        loader.style.display = 'flex';
        loader.style.justifyContent = 'center';
        loader.style.alignItems = 'center';
        loader.style.zIndex = '9999';
        document.body.appendChild(loader);
    }
    loader.innerHTML = `<div style="color: white; font-size: 2rem;"><i class="fas fa-spinner fa-spin"></i> ${text}</div>`;
    loader.style.display = 'flex';
}

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

// Helper: Handle File Inputs
const fileInputs = ['heroImage', 'aboutImage']; 

document.body.addEventListener('change', async (e) => {
    if (e.target.type === 'file') {
        const file = e.target.files[0];
        if (file) {
            // Validate File Size (Max 800KB to be safe for Firestore 1MB limit with Base64 overhead)
            const maxSize = 800 * 1024; // 800KB
            if (file.size > maxSize) {
                alert(`A imagem é muito grande (${(file.size / 1024).toFixed(0)}KB). O limite é 800KB. Por favor, comprima a imagem antes de enviar.`);
                e.target.value = ''; // Clear input
                return;
            }

            showLoader('Processando Imagem...');
            try {
                const base64String = await fileToBase64(file);
                const targetId = e.target.getAttribute('data-target'); 
                if (targetId) {
                    const targetInput = document.getElementById(targetId);
                    if (targetInput) {
                        targetInput.value = base64String;
                        // Preview
                        const previewId = e.target.getAttribute('data-preview');
                        const previewEl = document.getElementById(previewId);
                        if (previewId && previewEl) {
                            previewEl.src = base64String;
                            previewEl.style.display = 'block';
                        }
                    }
                }
            } catch (err) {
                console.error("Error converting file:", err);
                alert("Erro ao processar imagem.");
            } finally {
                hideLoader();
            }
        }
    }
});

function hideLoader() {
    const loader = document.getElementById('admin-loader');
    if (loader) loader.style.display = 'none';
}

// 4. Form Handlers
document.getElementById('heroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await SaaS.updateSection('hero', {
            title: document.getElementById('heroTitle').value,
            subtitle: document.getElementById('heroSubtitle').value,
            image: document.getElementById('heroImage').value
        });
        alert('Seção Hero atualizada com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar Hero.');
    } finally {
        hideLoader();
    }
});

document.getElementById('aboutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await SaaS.updateSection('about', {
            subtitle: document.getElementById('aboutSubtitle').value,
            title: document.getElementById('aboutTitle').value,
            text: document.getElementById('aboutText').value,
            image: document.getElementById('aboutImage').value
        });
        alert('Sobre Mim atualizado com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar Sobre Mim.');
    } finally {
        hideLoader();
    }
});

// Brands Logic
window.removeBrand = async function(index) {
    if(!confirm('Tem certeza que deseja remover esta marca?')) return;
    
    showLoader();
    try {
        const brands = SaaS.getConfig().brands || [];
        brands.splice(index, 1);
        await SaaS.updateSection('brands', brands);
        renderBrands(); // Re-render triggers from config update, but we call it just in case or wait for event
    } catch (err) {
        console.error(err);
        alert('Erro ao remover marca.');
    } finally {
        hideLoader();
    }
};

window.saveBrand = async function(index) {
    showLoader();
    try {
        const brands = SaaS.getConfig().brands || [];
        if (brands[index]) {
            brands[index].name = document.getElementById(`brand-name-${index}`).value;
            // Handle image from file input if present, or hidden input
            // The render loop below sets up inputs.
            // Let's assume we read from the inputs rendered.
            // Note: If user changed image, it should be in the hidden input if we use the file handler logic.
            // But let's verify how renderBrands sets up inputs.
            // It seems we rely on "Salvar Marcas" (saveBrands) for bulk update usually?
            // The user wants "Botão para cada elemento". So individual save.
            
            // We need to grab the potentially updated image value.
            // The renderBrands below (in old code) created inputs with IDs.
            
            // Wait, we need to handle the image update correctly.
            // The file handler updates the target input.
            // Let's ensure the input IDs are consistent.
            const logoInput = document.getElementById(`brand-logo-${index}`);
            if (logoInput) brands[index].logo = logoInput.value;
            
            await SaaS.updateSection('brands', brands);
            alert('Marca salva com sucesso!');
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar marca.');
    } finally {
        hideLoader();
    }
};

window.editBrand = function(index) {
    // Switch to edit mode for this item
    renderBrands(index); // Re-render with this index in edit mode
};

// We need a state to track which item is being edited if we want to toggle UI.
// Or we can just render all as View and toggle one.
let editingBrandIndex = -1;

function renderBrands(editIndex = -1) {
    const list = document.getElementById('brandList');
    if (!list) return;
    
    list.innerHTML = '';
    const brands = SaaS.getConfig().brands || [];
    
    if (brands.length === 0) {
        list.innerHTML = '<p class="text-muted" style="text-align:center; padding: 20px;">Nenhuma marca cadastrada.</p>';
        return;
    }
    
    brands.forEach((brand, index) => {
        let logoSrc = brand.logo;
        if (logoSrc && typeof logoSrc === 'string' && logoSrc.startsWith('assets/')) {
            logoSrc = '../' + logoSrc;
        }

        const div = document.createElement('div');
        div.className = 'form-group card';
        div.style.padding = '15px';
        div.style.background = 'var(--bg-darker)';
        div.style.marginBottom = '15px';
        
        const isEditing = (index === editIndex);
        
        if (isEditing) {
            // Edit Mode
            div.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; justify-content: space-between;">
                    <strong>Editando Marca ${index + 1}</strong>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                    <div>
                        <label class="form-label">Nome</label>
                        <input type="text" class="form-control" value="${brand.name || ''}" id="brand-name-${index}">
                    </div>
                    <div>
                        <label class="form-label">Logo (URL ou Upload)</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" class="form-control" value="${brand.logo || ''}" id="brand-logo-${index}" readonly style="background: #333; color: #777;">
                            <label class="btn-primary" style="cursor: pointer; margin: 0; white-space: nowrap;">
                                <i class="fas fa-upload"></i> Upload
                                <input type="file" style="display: none;" data-target="brand-logo-${index}" data-preview="brand-preview-${index}">
                            </label>
                        </div>
                        <img id="brand-preview-${index}" src="${logoSrc || ''}" style="max-height: 50px; margin-top: 10px; display: ${logoSrc ? 'block' : 'none'}; border-radius: 4px;">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button type="button" class="btn-primary" onclick="saveBrand(${index})">Salvar</button>
                        <button type="button" class="btn-outline" onclick="renderBrands(-1)">Cancelar</button>
                    </div>
                </div>
            `;
        } else {
            // View Mode
            div.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${logoSrc || ''}" style="width: 40px; height: 40px; object-fit: contain; background: white; border-radius: 4px; padding: 2px; display: ${logoSrc ? 'block' : 'none'};">
                        <div>
                            <div style="font-weight: bold; font-size: 1.1rem;">${brand.name || 'Sem Nome'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="button" class="btn-outline" style="padding: 5px 10px;" onclick="renderBrands(${index})"><i class="fas fa-edit"></i> Editar</button>
                        <button type="button" class="btn-primary" style="background: var(--danger); padding: 5px 10px;" onclick="removeBrand(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
        list.appendChild(div);
    });
}
window.addBrandField = async function() {
    showLoader();
    try {
        const brands = SaaS.getConfig().brands || [];
        brands.push({ name: "", logo: "" });
        await SaaS.updateSection('brands', brands);
        renderBrands(brands.length - 1);
    } catch (err) {
        console.error(err);
        alert('Erro ao adicionar marca.');
    } finally {
        hideLoader();
    }
};

// Stats Logic
window.renderStats = function(editIndex = -1) {
    const list = document.getElementById('statsList');
    if (!list) return;
    
    list.innerHTML = '';
    const stats = SaaS.getConfig().stats || [];
    
    if (stats.length === 0) {
        list.innerHTML = '<p class="text-muted" style="text-align:center; padding: 20px;">Nenhuma estatística cadastrada.</p>';
        return;
    }
    
    stats.forEach((stat, index) => {
        const div = document.createElement('div');
        div.className = 'form-group card';
        div.style.padding = '15px';
        div.style.background = 'var(--bg-darker)';
        div.style.marginBottom = '15px';
        
        const isEditing = (index === editIndex);
        
        if (isEditing) {
            // Edit Mode
            div.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; justify-content: space-between;">
                    <strong>Editando Estatística ${index + 1}</strong>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label class="form-label">Número (ex: 25+)</label>
                        <input type="text" class="form-control" value="${stat.number || ''}" id="stat-number-${index}">
                    </div>
                    <div>
                        <label class="form-label">Rótulo (ex: Anos)</label>
                        <input type="text" class="form-control" value="${stat.label || ''}" id="stat-label-${index}">
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button type="button" class="btn-primary" onclick="saveStat(${index})">Salvar</button>
                    <button type="button" class="btn-outline" onclick="renderStats(-1)">Cancelar</button>
                </div>
            `;
        } else {
            // View Mode
            div.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="background: var(--primary); color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold;">
                            ${stat.number || '0'}
                        </div>
                        <div>
                            <div style="font-weight: bold; font-size: 1.1rem;">${stat.label || 'Rótulo'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="button" class="btn-outline" style="padding: 5px 10px;" onclick="renderStats(${index})"><i class="fas fa-edit"></i> Editar</button>
                        <button type="button" class="btn-primary" style="background: var(--danger); padding: 5px 10px;" onclick="removeStat(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
        list.appendChild(div);
    });
};

window.addStatField = async function() {
    showLoader();
    try {
        const stats = SaaS.getConfig().stats || [];
        stats.push({ number: "0", label: "Novo Item" });
        await SaaS.updateSection('stats', stats);
        renderStats(stats.length - 1);
    } catch (err) {
        console.error(err);
        alert('Erro ao adicionar estatística.');
    } finally {
        hideLoader();
    }
};

window.removeStat = async function(index) {
    if(!confirm('Tem certeza que deseja remover esta estatística?')) return;
    showLoader();
    try {
        const stats = SaaS.getConfig().stats || [];
        stats.splice(index, 1);
        await SaaS.updateSection('stats', stats);
        renderStats();
    } catch (err) {
        console.error(err);
        alert('Erro ao remover estatística.');
    } finally {
        hideLoader();
    }
};

window.saveStat = async function(index) {
    showLoader();
    try {
        const stats = SaaS.getConfig().stats || [];
        if (stats[index]) {
            stats[index].number = document.getElementById(`stat-number-${index}`).value;
            stats[index].label = document.getElementById(`stat-label-${index}`).value;
            await SaaS.updateSection('stats', stats);
            alert('Estatística salva com sucesso!');
            renderStats(); // Return to view mode
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar estatística.');
    } finally {
        hideLoader();
    }
};


document.getElementById('galleryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await SaaS.updateSection('gallery', {
            img1: document.getElementById('gallery1').value,
            img2: document.getElementById('gallery2').value,
            img3: document.getElementById('gallery3').value,
            img4: document.getElementById('gallery4').value
        });
        alert('Galeria atualizada!');
    } catch (err) {
        console.error(err);
        alert('Erro ao atualizar galeria.');
    } finally {
        hideLoader();
    }
});

document.getElementById('styleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await SaaS.updateSection('style', {
            videoBg: document.getElementById('videoBg').value
        });
        alert('Estilo atualizado!');
    } catch (err) {
        console.error(err);
        alert('Erro ao atualizar estilo.');
    } finally {
        hideLoader();
    }
});

document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await SaaS.updateSection('contact', {
            whatsapp: document.getElementById('contactWhatsapp').value,
            email: document.getElementById('contactEmail').value,
            instagram: document.getElementById('contactInstagram').value
        });
        alert('Contatos atualizados com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao atualizar contatos.');
    } finally {
        hideLoader();
    }
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

window.addVideoField = async function() {
    showLoader();
    try {
        const config = SaaS.getConfig();
        config.videos = config.videos || [];
        config.videos.push({ title: "Novo Vídeo", url: "", type: "youtube" });
        await SaaS.saveConfig(config);
        renderVideos();
    } catch (err) {
        console.error(err);
        alert('Erro ao adicionar vídeo.');
    } finally {
        hideLoader();
    }
};

window.removeVideo = async function(index) {
    if(!confirm('Tem certeza que deseja remover este vídeo?')) return;
    
    showLoader();
    try {
        const config = SaaS.getConfig();
        config.videos.splice(index, 1);
        await SaaS.saveConfig(config);
        renderVideos();
    } catch (err) {
        console.error(err);
        alert('Erro ao remover vídeo.');
    } finally {
        hideLoader();
    }
};

window.saveVideos = async function() {
    showLoader();
    try {
        const config = SaaS.getConfig();
        const newVideos = [];
        const count = config.videos ? config.videos.length : 0;
        
        for(let i=0; i<count; i++) {
            newVideos.push({
                title: document.getElementById(`vid-title-${i}`).value,
                url: document.getElementById(`vid-url-${i}`).value,
                id: document.getElementById(`vid-url-${i}`).value,
                type: "youtube"
            });
        }
        
        config.videos = newVideos;
        await SaaS.saveConfig(config);
        alert('Vídeos salvos com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar vídeos.');
    } finally {
        hideLoader();
    }
};

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

window.addPricingField = async function() {
    showLoader();
    try {
        const config = SaaS.getConfig();
        config.pricing = config.pricing || [];
        config.pricing.push({ title: "Novo Serviço", price: "R$ 0,00", features: [] });
        await SaaS.saveConfig(config);
        renderPricing();
    } catch (err) {
        console.error(err);
        alert('Erro ao adicionar serviço.');
    } finally {
        hideLoader();
    }
};

window.savePricing = async function() {
    showLoader();
    try {
        const config = SaaS.getConfig();
        const count = config.pricing ? config.pricing.length : 0;
        const newPricing = [];
        
        for(let i=0; i<count; i++) {
            newPricing.push({
                id: i,
                title: document.getElementById(`price-title-${i}`).value,
                price: document.getElementById(`price-val-${i}`).value,
                features: config.pricing[i].features || []
            });
        }
        
        config.pricing = newPricing;
        await SaaS.saveConfig(config);
        alert('Preços salvos com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar preços.');
    } finally {
        hideLoader();
    }
};

window.removePrice = async function(index) {
     if(!confirm('Tem certeza que deseja remover este serviço?')) return;
     
     showLoader();
     try {
        const config = SaaS.getConfig();
        config.pricing.splice(index, 1);
        await SaaS.saveConfig(config);
        renderPricing();
    } catch (err) {
        console.error(err);
        alert('Erro ao remover serviço.');
    } finally {
        hideLoader();
    }
};

// Initial Renders
renderVideos();
renderPricing();

// Expose functions to global scope for HTML onclick attributes
window.switchTab = switchTab;


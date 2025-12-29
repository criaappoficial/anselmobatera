import SaaS from '../../js/saas-engine.js';

// Safety Timeout for Auth Loader
setTimeout(() => {
    const authLoader = document.getElementById('auth-loader');
    if (authLoader && authLoader.style.display !== 'none') {
        // If still loading after 8 seconds...
        if (SaaS.currentUser) {
            // User is technically logged in but UI didn't update. Force update?
            console.warn("Loader timeout - User exists but UI stalled. Removing loader.");
            authLoader.style.display = 'none';
            const mainDashboard = document.getElementById('main-dashboard');
            if (mainDashboard) mainDashboard.style.display = 'flex';
        } else {
            // Not logged in (or auth taking too long), redirect to login
            console.warn("Loader timeout - No user found. Redirecting.");
            window.location.href = 'login.html';
        }
    }
}, 8000);

// Admin Dashboard Logic

// 1. Auth & Init (Handled via Event now)
window.addEventListener('saasUserUpdated', (e) => {
    const user = e.detail;
    
    // Auth Confirmed: Remove Loader and Show Dashboard
    const authLoader = document.getElementById('auth-loader');
    const mainDashboard = document.getElementById('main-dashboard');
    if (authLoader) authLoader.style.display = 'none';
    if (mainDashboard) mainDashboard.style.display = 'flex';

    // Update Sidebar/Header Info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userPhoto').src = user.photo || "../assets/logo.png";
    
    // Update Dropdown Info
    if(document.getElementById('dropdownName')) document.getElementById('dropdownName').textContent = user.name;
    if(document.getElementById('dropdownEmail')) document.getElementById('dropdownEmail').textContent = user.email;
    
    // Check Status (isLogin / isPaid)
    const statusEl = document.getElementById('dashSubStatus');
    const userStatusEl = document.getElementById('userStatus');
    
    // Add Public Link Helper
    const publicLinkContainer = document.getElementById('public-link-container');
    if (!publicLinkContainer) {
        const dashContainer = document.getElementById('tab-dashboard');
        if(dashContainer) {
            const linkDiv = document.createElement('div');
            linkDiv.id = 'public-link-container';
            linkDiv.style.background = 'rgba(0,255,100,0.1)';
            linkDiv.style.border = '1px solid rgba(0,255,100,0.3)';
            linkDiv.style.padding = '15px';
            linkDiv.style.borderRadius = '8px';
            linkDiv.style.marginTop = '20px';
            linkDiv.style.marginBottom = '20px';
            linkDiv.innerHTML = `
                <h3 style="margin-top:0; font-size:1.1rem; color:var(--success)">Seu Link Público</h3>
                <p style="font-size:0.9rem; color:#ccc; margin-bottom:10px;">Use este link para compartilhar ou testar seu site se a versão principal não atualizar imediatamente:</p>
                <div style="display:flex; gap:10px;">
                    <input type="text" value="${window.location.origin}/index.html?uid=${user.uid}" readonly style="width:100%; background:rgba(0,0,0,0.3); border:none; color:white; padding:8px; border-radius:4px;" onclick="this.select()">
                    <a href="${window.location.origin}/index.html?uid=${user.uid}" target="_blank" class="btn-primary" style="text-decoration:none; display:flex; align-items:center; white-space:nowrap;">Abrir <i class="fas fa-external-link-alt" style="margin-left:5px;"></i></a>
                </div>
            `;
            // Insert after the first row of cards if possible, or just at top
            dashContainer.insertBefore(linkDiv, dashContainer.firstChild);
        }
    }

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

// Publish Site Button
document.getElementById('btnPublishSite').addEventListener('click', async () => {
    if(!confirm('Deseja definir seu perfil como a versão pública do site? Isso fará com que todos os visitantes vejam suas informações.')) return;
    
    showLoader('Publicando...');
    try {
        await SaaS.publishSite();
        // Also try to save to a redundant public location just in case
        try {
             // We access the firestore instance via SaaS internals if exposed, or just rely on SaaS.publishSite doing it all.
             // Since SaaS.publishSite is the method, we will update THAT method in saas-engine.js instead of here.
        } catch(e) { console.log("Redundant save skipped"); }
        
        alert('Site publicado com sucesso! A versão pública agora deve exibir suas fotos.');
    } catch (err) {
        console.error(err);
        alert('Erro ao publicar site: ' + err.message);
    } finally {
        hideLoader();
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
    if(document.getElementById('heroOverlayTitle')) document.getElementById('heroOverlayTitle').value = config.hero?.overlayTitle || "";
    if(document.getElementById('heroOverlaySubtitle')) document.getElementById('heroOverlaySubtitle').value = config.hero?.overlaySubtitle || "";
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
    renderGalleryInputs(config);

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

// Helper: Compress Image and Convert to Base64
function compressImage(file, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const attemptCompression = (q, w) => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > w) {
                        height = Math.round((height * w) / width);
                        width = w;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', q);
                    return dataUrl;
                };

                let currentQuality = quality;
                let currentWidth = maxWidth;
                let dataUrl = attemptCompression(currentQuality, currentWidth);
                
                // Recursive compression to target size
                let attempts = 0;
                // Target: ~120KB per image to allow 6 images + text in 1MB Firestore limit
                while (dataUrl.length > 130000 && attempts < 6) { 
                    currentQuality -= 0.15;
                    currentWidth = Math.round(currentWidth * 0.70); // More aggressive reduction
                    if (currentQuality < 0.2) currentQuality = 0.2;
                    
                    console.log(`Aggressive Compression: Quality ${currentQuality.toFixed(2)}, Width ${currentWidth}, Current Len ${dataUrl.length}`);
                    dataUrl = attemptCompression(currentQuality, currentWidth);
                    attempts++;
                }

                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Convert Image to Base64 (String) - Deprecated in favor of compressImage but kept for fallback
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

// Custom Modal Implementation
window.showCustomModal = function(title, message) {
    // Remove existing if any
    const existing = document.getElementById('custom-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '100000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.backdropFilter = 'blur(5px)';

    const modal = document.createElement('div');
    modal.style.background = 'var(--surface, #1e1e1e)';
    modal.style.border = '1px solid var(--border, #333)';
    modal.style.borderTop = '4px solid var(--danger, #ff4444)';
    modal.style.borderRadius = '12px';
    modal.style.padding = '30px';
    modal.style.maxWidth = '450px';
    modal.style.width = '90%';
    modal.style.textAlign = 'center';
    modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
    modal.style.position = 'relative';

    modal.innerHTML = `
        <div style="font-size: 3rem; color: var(--danger, #ff4444); margin-bottom: 20px;">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 style="color: var(--text-main, #fff); margin-bottom: 15px; font-size: 1.4rem;">${title}</h3>
        <p style="color: var(--text-muted, #ccc); margin-bottom: 25px; line-height: 1.5;">${message}</p>
        <button id="modal-close-btn" class="btn-primary" style="padding: 12px 30px; border-radius: 50px; width: 100%;">Entendi, vou comprimir</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('modal-close-btn').onclick = () => {
        overlay.remove();
    };
    
    // Close on click outside
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    }
};

document.body.addEventListener('change', async (e) => {
    if (e.target.type === 'file') {
        const file = e.target.files[0];
        if (file) {
            // Display Size Logic
            let targetContainer = e.target.parentNode;
            
            // Fix for file inputs inside labels (like custom buttons)
            if (targetContainer.tagName === 'LABEL') {
                targetContainer = targetContainer.parentNode;
            }

            let sizeDisplay = targetContainer.querySelector('.file-size-display');
            if (!sizeDisplay) {
                sizeDisplay = document.createElement('div');
                sizeDisplay.className = 'file-size-display';
                sizeDisplay.style.fontSize = '0.85rem';
                sizeDisplay.style.marginTop = '8px';
                sizeDisplay.style.fontWeight = '500';
                targetContainer.appendChild(sizeDisplay);
            }
            
            const fileSizeKB = (file.size / 1024).toFixed(0);
            
            // Validate File Size (Initial check for huge files > 5MB that might crash browser)
            const absoluteMax = 5 * 1024 * 1024; // 5MB
            if (file.size > absoluteMax) {
                 sizeDisplay.textContent = `Tamanho da imagem: ${fileSizeKB}KB`;
                 sizeDisplay.style.color = 'var(--danger)';
                 sizeDisplay.innerHTML += ' <i class="fas fa-times-circle"></i> (Muito grande)';
                 showCustomModal('Imagem Gigante', 'A imagem é maior que 5MB. Por favor, escolha uma imagem menor.');
                 e.target.value = '';
                 return;
            }

            showLoader('Otimizando Imagem...');
            try {
                // Compress Image
                // Max Width: 1024px (sufficient for HD web)
                // Quality: 0.7 (good balance)
                const base64String = await compressImage(file, 1024, 0.7);
                
                // Check Final Size of Base64 String
                // Base64 size is approx 1.33 * binary size. 
                // We want final payload to be small. 
                // Firestore limit is 1MB for the WHOLE document.
                // Let's aim for max 300KB per image (Base64 length ~400,000 chars)
                
                const finalSizeKB = (base64String.length * 0.75 / 1024).toFixed(0);
                sizeDisplay.textContent = `Tamanho: ${fileSizeKB}KB ➝ ${finalSizeKB}KB (Otimizado)`;
                
                if (base64String.length > 400000) { // approx 300KB binary
                    sizeDisplay.style.color = 'var(--danger)';
                    sizeDisplay.innerHTML += ' <i class="fas fa-times-circle"></i> (Ainda grande)';
                    showCustomModal(
                        'Imagem Ainda Grande', 
                        `Mesmo após a otimização, a imagem ficou com <strong>${finalSizeKB}KB</strong>.<br><br>Para evitar erros de salvamento, tente uma imagem mais simples ou com menor resolução.`
                    );
                    e.target.value = '';
                    hideLoader();
                    return;
                }
                
                sizeDisplay.style.color = 'var(--success, #2ecc71)';
                sizeDisplay.innerHTML += ' <i class="fas fa-check-circle"></i> (OK)';

                const targetId = e.target.getAttribute('data-target'); 
                if (targetId) {
                    const targetInput = document.getElementById(targetId);
                    if (targetInput) {
                        targetInput.value = base64String;
                        
                        // Update status text if it exists (for gallery)
                        if (targetId.startsWith('gallery-img-')) {
                            const idNum = targetId.split('-')[2];
                            const statusEl = document.getElementById(`gallery-status-${idNum}`);
                            if (statusEl) {
                                statusEl.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> Pronta para Salvar (${finalSizeKB}KB)</span>`;
                            }
                        }

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
            overlayTitle: document.getElementById('heroOverlayTitle').value,
            overlaySubtitle: document.getElementById('heroOverlaySubtitle').value,
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

window.updateBrandPreview = function(index) {
    const url = document.getElementById(`brand-logo-${index}`).value;
    const preview = document.getElementById(`brand-preview-${index}`);
    if (preview) {
        if (url && url.length > 5) {
            preview.src = url;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }
};

window.renderBrands = function(editIndex = -1) {
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
                            <input type="text" class="form-control" value="${brand.logo || ''}" id="brand-logo-${index}" placeholder="https://..." onchange="updateBrandPreview(${index})">
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
        const newGallery = [];
        let totalSize = 0;
        
        for(let i=1; i<=6; i++) {
            const imgInput = document.getElementById(`gallery-img-${i}`);
            const titleInput = document.getElementById(`gallery-title-${i}`);
            const descInput = document.getElementById(`gallery-desc-${i}`);
            
            if (imgInput && titleInput && descInput) {
                const imgVal = imgInput.value;
                totalSize += imgVal.length;
                
                newGallery.push({
                    image: imgVal,
                    title: titleInput.value,
                    description: descInput.value
                });
            }
        }
        
        // Validation: Firestore 1MB limit (approx 1,048,576 bytes)
        // Base64 chars are 1 byte each in UTF-8 usually, but safe limit is 1M chars.
        // We set a safe margin (950KB)
        if (totalSize > 950000) {
             throw new Error("Total gallery size exceeds limit");
        }

        await SaaS.updateSection('gallery', newGallery);
        alert('Galeria salva! Lembre-se de clicar em "Publicar Alterações no Site" para garantir que todos vejam.');
    } catch (err) {
        console.error(err);
        const errorMsg = err.message || JSON.stringify(err);
        if (errorMsg.includes("Total gallery size exceeds limit") || errorMsg.includes("exceeds the maximum allowed size")) {
            showCustomModal("Galeria Muito Pesada", "O tamanho total das imagens excede o limite do banco de dados (1MB).<br><br>Isso acontece quando muitas imagens de alta qualidade são enviadas.<br>Tente substituir algumas imagens por versões menores.");
        } else {
            alert('Erro ao atualizar galeria: ' + errorMsg);
        }
    } finally {
        hideLoader();
    }
});

function renderGalleryInputs(providedConfig = null) {
    const config = providedConfig || SaaS.getConfig();
    if (!config) return;
    
    const container = document.getElementById('gallery-inputs-container');
    if (!container) return;
    container.innerHTML = '';
    
    let gallery = config.gallery;
    // Migration check: if object (old format), convert to array
    if (!Array.isArray(gallery) && gallery) {
        gallery = [
            { image: gallery.img1 || "", title: "Meu Setup", description: "Visão geral do kit" },
            { image: gallery.img2 || "", title: "Em Ação", description: "Perspectiva da câmera" },
            { image: gallery.img3 || "", title: "Detalhes", description: "Timbres e texturas" },
            { image: gallery.img4 || "", title: "Atmosfera", description: "Foco e concentração" }
        ];
    }
    // Ensure 6 items
    gallery = gallery || [];
    while(gallery.length < 6) {
        gallery.push({ image: "", title: `Novo Item`, description: "Descrição" });
    }
    
    gallery.slice(0, 6).forEach((item, index) => {
        const i = index + 1;
        const div = document.createElement('div');
        div.className = 'form-group card';
        div.style.padding = '20px';
        div.style.background = 'var(--bg-darker)';
        div.style.border = '1px solid rgba(255,255,255,0.05)';
        div.style.borderRadius = '12px';
        div.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        div.onmouseenter = () => { div.style.transform = 'translateY(-2px)'; div.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)'; };
        div.onmouseleave = () => { div.style.transform = 'translateY(0)'; div.style.boxShadow = 'none'; };

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: var(--primary); color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.8rem; font-weight: bold;">${i}</span>
                    <strong style="color: white; font-size: 1rem;">Item da Galeria</strong>
                </div>
                <span style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 1px;">Momentos em Ação</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 20px; align-items: start;">
                <!-- Image Preview / Upload Area -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="width: 100%; aspect-ratio: 1/1; background: rgba(0,0,0,0.3); border-radius: 8px; overflow: hidden; position: relative; border: 2px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; transition: border-color 0.3s;">
                        <img id="gallery-preview-${i}" src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                        <span id="gallery-preview-${i}-placeholder" style="color: rgba(255,255,255,0.2); font-size: 1.5rem;"><i class="fas fa-image"></i></span>
                    </div>
                    
                    <label class="btn-primary" style="font-size: 0.75rem; padding: 6px; text-align: center; cursor: pointer; width: 100%; border-radius: 6px; display: block;">
                        <i class="fas fa-upload"></i> Escolher Foto
                        <input type="file" style="display: none;" id="gallery-file-${i}" accept="image/*" data-target="gallery-img-${i}" data-preview="gallery-preview-${i}">
                    </label>
                    <input type="hidden" id="gallery-img-${i}" value="${item.image || ''}">
                    <div id="gallery-status-${i}" style="font-size: 0.7rem; color: #888; margin-top: 5px;">
                        ${item.image && item.image.length > 100 ? `<span style="color: var(--success);"><i class="fas fa-check"></i> Imagem Salva (${Math.round(item.image.length/1024)}KB)</span>` : '<span style="color: #666;">Sem imagem</span>'}
                    </div>
                </div>

                <!-- Text Inputs -->
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label class="form-label" style="font-size: 0.8rem; color: #aaa; margin-bottom: 4px;">Título</label>
                        <input type="text" class="form-control" id="gallery-title-${i}" value="${item.title || ''}" placeholder="Ex: Show no Rock in Rio" style="background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); font-size: 0.9rem; padding: 8px 12px;">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.8rem; color: #aaa; margin-bottom: 4px;">Descrição</label>
                        <input type="text" class="form-control" id="gallery-desc-${i}" value="${item.description || ''}" placeholder="Ex: Foto por @fotografo" style="background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); font-size: 0.9rem; padding: 8px 12px;">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
        
        // Update preview
        updateImagePreview(`gallery-preview-${i}`, item.image);
    });
}

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
            const urlVal = document.getElementById(`vid-url-${i}`).value;
            let type = "youtube"; // Default preference
            
            // Simple detection
            if (urlVal.includes('.mp4') || urlVal.includes('.mov') || urlVal.includes('assets/')) {
                type = "local";
            }

            newVideos.push({
                title: document.getElementById(`vid-title-${i}`).value,
                url: urlVal,
                id: urlVal,
                type: type
            });
        }
        
        config.videos = newVideos;
        await SaaS.saveConfig(config);
        alert('Vídeos salvos! Lembre-se de clicar em "Publicar Alterações no Site" para garantir que todos vejam.');
    } catch (err) {
        console.error("Save Error Details:", err);
        if (err.code === 'permission-denied') {
             alert(`Erro de Permissão (Firestore Rules):
             
1. Verifique se você está logado com a conta correta.
2. Seu usuário é: ${SaaS.currentUser ? SaaS.currentUser.email : 'Deslogado'}
3. UID: ${SaaS.currentUser ? SaaS.currentUser.uid : 'N/A'}

Tente fazer logout e login novamente.`);
        } else {
             alert('Erro ao salvar vídeos: ' + (err.message || err));
        }
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
        alert('Serviços salvos com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar serviços.');
    } finally {
        hideLoader();
    }
};

// Sidebar Toggle Logic for Mobile
document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        });
        
        // Close sidebar when clicking a nav item on mobile
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            });
        });
    }
});

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

// Profile Dropdown Logic
const userProfileDropdown = document.getElementById('userProfileDropdown');
const profileDropdownContent = document.getElementById('profileDropdownContent');
const switchAccountBtn = document.getElementById('switchAccountBtn');
const headerLogoutBtn = document.getElementById('headerLogoutBtn');

if (userProfileDropdown && profileDropdownContent) {
    userProfileDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdownContent.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!userProfileDropdown.contains(e.target)) {
            profileDropdownContent.classList.remove('show');
        }
    });
}

if (switchAccountBtn) {
    switchAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(confirm('Deseja realmente trocar de conta?')) {
            SaaS.logout();
        }
    });
}

if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        SaaS.logout();
    });
}


import SaaS from '../../js/saas-engine.js';

let globalUser = null; // Store user for global access (e.g. switchTab)

// Safety Timeout for Auth Loader
setTimeout(() => {
    const authLoader = document.getElementById('auth-loader');
    if (authLoader && authLoader.style.display !== 'none') {
        if (SaaS.currentUser) {
            console.warn("Loader timeout - User exists but UI stalled. Removing loader.");
            authLoader.style.display = 'none';
            const mainDashboard = document.getElementById('main-dashboard');
            if (mainDashboard) mainDashboard.style.display = 'flex';
        } else {
            console.warn("Loader timeout - No user found. Redirecting.");
            window.location.href = 'login.html';
        }
    }
}, 8000);

// Admin Dashboard Logic

// 1. Auth & Init (Handled via Event now)
window.addEventListener('saasUserUpdated', (e) => {
    const user = e.detail;
    globalUser = user;
    
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
    const inputs = document.querySelectorAll('input, textarea, select');
    const buttons = document.querySelectorAll('button.btn-primary');
    
    inputs.forEach(input => {
        input.disabled = !enabled;
    });

    buttons.forEach(btn => {
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

    // Identity (Logo)
    if(document.getElementById('logoImage')) document.getElementById('logoImage').value = config.logo?.image || "";
    updateImagePreview('logoImagePreview', config.logo?.image);

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
    if (displaySrc) {
        previewEl.src = displaySrc;
        previewEl.style.display = 'block';
    } else {
        previewEl.style.display = 'none';
    }
}

function compressImage(file, maxWidth, quality) {
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
    // LOCKING LOGIC: If user is pending, restrict access to non-subscription tabs
    if (globalUser && !globalUser.isLogin && tabId !== 'subscription') {
        alert("Conta pendente de verificação. Por favor, regularize sua assinatura.");
        return;
    }

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    // Show selected
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add('active');

    // Close sidebar on mobile
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
    
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

function showCustomModal(title, message) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '100000';
    overlay.style.background = 'rgba(0,0,0,0.6)';
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
                
                // Update preview if exists
                const previewId = e.target.getAttribute('data-preview');
                const previewEl = document.getElementById(previewId);
                if (previewId && previewEl) {
                    previewEl.src = base64String;
                    previewEl.style.display = 'block';
                }
                
                // Update hidden input
                const targetId = e.target.getAttribute('data-target');
                const targetInput = document.getElementById(targetId);
                if (targetInput) {
                    targetInput.value = base64String;
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
document.getElementById('identityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await SaaS.updateSection('logo', {
            image: document.getElementById('logoImage').value
        });
        alert('Identidade Visual atualizada com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar Identidade Visual.');
    } finally {
        hideLoader();
    }
});

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
        renderBrands(); 
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
             const logoInput = document.getElementById(`brand-logo-${index}`);
             if (logoInput && logoInput.value) {
                 brands[index].logo = logoInput.value;
             }
             await SaaS.updateSection('brands', brands);
             alert('Marca salva com sucesso!');
             renderBrands();
        }
    } catch (err) {
         console.error(err);
         alert('Erro ao salvar marca.');
    } finally {
         hideLoader();
    }
};

window.addBrand = async function() {
    showLoader();
    try {
        const brands = SaaS.getConfig().brands || [];
        brands.push({ name: "Nova Marca", logo: "" });
        await SaaS.updateSection('brands', brands);
        renderBrands();
    } catch (err) {
        console.error(err);
        alert('Erro ao adicionar marca.');
    } finally {
        hideLoader();
    }
};

function renderBrands() {
    const list = document.getElementById('brandsList');
    if (!list) return;
    list.innerHTML = '';
    const brands = SaaS.getConfig().brands || [];
    
    brands.forEach((brand, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.marginBottom = '15px';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>Marca ${index + 1}</strong>
                <div>
                    <button type="button" class="btn-primary" onclick="saveBrand(${index})" style="margin-right: 5px;">Salvar</button>
                    <button type="button" class="btn-primary" style="background: var(--danger);" onclick="removeBrand(${index})">Remover</button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Nome da Marca</label>
                <input type="text" class="form-control" value="${brand.name}" id="brand-name-${index}">
            </div>
            <div class="form-group">
                <label class="form-label">Logo (Upload)</label>
                <input type="file" class="form-control" accept="image/*" data-target="brand-logo-${index}" data-preview="brand-logo-preview-${index}">
                <input type="hidden" id="brand-logo-${index}" value="${brand.logo || ''}">
                <img id="brand-logo-preview-${index}" src="${brand.logo || ''}" style="max-width: 100px; margin-top: 10px; display: ${brand.logo ? 'block' : 'none'};">
            </div>
        `;
        list.appendChild(div);
    });
}

function renderStats(editIndex = -1) {
    const list = document.getElementById('statsList');
    if (!list) return;
    list.innerHTML = '';
    const stats = SaaS.getConfig().stats || [];
    
    stats.forEach((stat, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.marginBottom = '10px';
        
        if (index === editIndex) {
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
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
            
            if (imgInput && titleInput) {
                newGallery.push({
                    image: imgInput.value,
                    title: titleInput.value,
                    description: descInput ? descInput.value : ""
                });
            }
        }
        
        await SaaS.updateSection('gallery', newGallery);
        alert('Galeria salva com sucesso!');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar galeria.');
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
        alert('Erro ao atualizar estilo: ' + err.message);
    } finally {
        hideLoader();
    }
});

function renderVideos() {
    const list = document.getElementById('videosList');
    if (!list) return;
    list.innerHTML = '';
    const videos = SaaS.getConfig().videos || [];
    
    videos.forEach((video, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.marginBottom = '10px';
        div.innerHTML = `
             <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <strong>Vídeo ${index + 1}</strong>
                <button type="button" class="btn-primary" style="background: var(--danger); padding: 5px 10px; font-size: 0.8rem;" onclick="removeVideo(${index})">Remover</button>
            </div>
            <div class="form-group">
                <label class="form-label">URL do YouTube</label>
                <input type="text" class="form-control" value="${video.url}" id="video-url-${index}">
            </div>
        `;
        list.appendChild(div);
    });
}

window.addVideoField = async function() {
    showLoader();
    try {
        const config = SaaS.getConfig();
        config.videos = config.videos || [];
        config.videos.push({ url: "" });
        await SaaS.saveConfig(config);
        renderVideos();
    } catch (err) {
        console.error(err);
        alert('Erro ao adicionar vídeo.');
    } finally {
        hideLoader();
    }
};

window.saveVideos = async function() {
    showLoader();
    try {
        const config = SaaS.getConfig();
        const count = config.videos ? config.videos.length : 0;
        const newVideos = [];
        
        for(let i=0; i<count; i++) {
            newVideos.push({
                url: document.getElementById(`video-url-${i}`).value
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

function renderPricing() {
    const list = document.getElementById('pricingList');
    if (!list) return;
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

// Ensure navigation works
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if(tab) switchTab(tab);
    });
});

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

// Render Pix QR Code
function renderPixQRCode() {
    const qrContainer = document.getElementById('pix-qrcode');
    // Ensure container exists and is empty
    if (qrContainer && qrContainer.innerHTML === '') {
        const pixKey = "3bb0e547-a5ec-45a2-a6a0-336a470b4fb2"; 
        try {
            // Check if QRCode is defined
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: pixKey,
                    width: 150,
                    height: 150,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.L
                });
            } else {
                console.warn("QRCode library not loaded yet.");
                // Retry once after a second if not loaded
                setTimeout(renderPixQRCode, 1000);
            }
        } catch (e) {
            console.error("QR Code Error:", e);
        }
    }
}

// Initial Call
renderPixQRCode();

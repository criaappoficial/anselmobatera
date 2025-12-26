import SaaS from './saas-engine.js';

// Loader for SaaS Dynamic Content

document.addEventListener('DOMContentLoaded', () => {
    // Listen for config updates (real-time preview if needed)
    window.addEventListener('saasConfigUpdated', (e) => {
        applyConfig(e.detail);
    });

    // Initial Load
    const config = SaaS.getConfig();
    if (config) {
        applyConfig(config);
    }
});

function applyConfig(config) {
    // 1. Hero Section
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    
    if (heroTitle && config.hero.title) heroTitle.innerHTML = config.hero.title.replace("Excelência", `<span class="text-gradient">Excelência</span>`); // Simple hack to keep gradient
    // Ideally we should store the gradient part separately or use a rich text editor.
    // For this demo, we'll just set text.
    if (heroTitle && config.hero.title) heroTitle.innerText = config.hero.title;
    
    if (heroSubtitle && config.hero.subtitle) heroSubtitle.innerText = config.hero.subtitle;

    if (heroImg) {
         if (config.hero.image && config.hero.image.length > 0) {
             heroImg.src = config.hero.image;
         } else {
             // Keep default HTML src or fallback
             // Not modifying src if empty to avoid 404
         }
    }

    // 2. About Section
    const aboutTitle = document.getElementById('about-title');
    const aboutTextContainer = document.getElementById('about-text-container');
    const aboutImg = document.getElementById('about-img');
    
    if (aboutTitle && config.about.title) aboutTitle.innerText = config.about.title;
    if (aboutTextContainer && config.about.text) {
        aboutTextContainer.innerHTML = `<p>${config.about.text.replace(/\n/g, '<br>')}</p>`;
    }
    if (aboutImg && config.about.image && config.about.image.length > 0) {
        aboutImg.src = config.about.image;
    }

    // Brands
    const brandsContainer = document.querySelector('.brands');
    if (brandsContainer && config.brands && config.brands.length > 0) {
        brandsContainer.innerHTML = '';
        config.brands.forEach(brand => {
            const span = document.createElement('span');
            span.className = 'brand-badge';
            if (brand.logo) {
                span.innerHTML = `<img src="${brand.logo}" alt="${brand.name}" style="height: 25px; margin-right: 8px; vertical-align: middle; border-radius: 4px;"> ${brand.name}`;
            } else {
                span.innerHTML = `<i class="fas fa-star"></i> ${brand.name}`;
            }
            brandsContainer.appendChild(span);
        });
    }

    // 3. Contact Info
    const waBtn = document.getElementById('contact-whatsapp-btn');
    const emailBtn = document.getElementById('contact-email-btn');
    const instaBtn = document.getElementById('contact-instagram-btn');

    if (waBtn && config.contact.whatsapp) {
        waBtn.href = `https://wa.me/${config.contact.whatsapp}`;
    }
    if (emailBtn && config.contact.email) {
        emailBtn.href = `mailto:${config.contact.email}`;
    }
    if (instaBtn && config.contact.instagram) {
        instaBtn.href = `https://instagram.com/${config.contact.instagram.replace('@', '')}`;
    }

    // 6. Gallery
    if (config.gallery) {
        for(let i=1; i<=4; i++) {
            const img = document.getElementById(`gallery-img-${i}`);
            if (img && config.gallery[`img${i}`] && config.gallery[`img${i}`].length > 0) {
                img.src = config.gallery[`img${i}`];
            }
        }
    }

    // 7. Backgrounds (Video Section)
    if (config.style && config.style.videoBg && config.style.videoBg.length > 0) {
        const videoSection = document.getElementById('videos');
        if (videoSection) {
            videoSection.style.background = `linear-gradient(rgba(10, 10, 10, 0.9), rgba(10, 10, 10, 0.9)), url('${config.style.videoBg}') fixed center/cover no-repeat`;
        }
    }

    // 4. Videos
    const videoGallery = document.getElementById('video-gallery');
    if (videoGallery && config.videos && config.videos.length > 0) {
        // Clear existing ONLY IF we have new videos from config that are different
        // For simplicity, we'll rebuild.
        videoGallery.innerHTML = '';
        
        config.videos.forEach(video => {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-wrapper';
            wrapper.style.marginBottom = '30px';
            
            if (video.type === 'youtube' || video.url.includes('youtube') || video.url.includes('youtu.be')) {
                // Extract ID if full URL
                let videoId = video.url;
                if (video.url.includes('v=')) videoId = video.url.split('v=')[1].split('&')[0];
                if (video.url.includes('youtu.be/')) videoId = video.url.split('youtu.be/')[1];
                
                wrapper.innerHTML = `
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                `;
            } else {
                // Local fallback
                wrapper.innerHTML = `
                    <video controls preload="metadata" style="width: 100%; border-radius: 10px;">
                        <source src="${video.url}" type="video/mp4">
                    </video>
                `;
            }
            
            const title = document.createElement('h4');
            title.innerText = video.title;
            title.style.color = 'white';
            title.style.marginTop = '10px';
            title.style.textAlign = 'center';
            
            const container = document.createElement('div');
            container.appendChild(wrapper);
            container.appendChild(title);
            
            videoGallery.appendChild(container);
        });
    }

    // 5. Pricing (Inject into Styles Grid or New Section?)
    // The user requested a Pricing Table. The current site doesn't have one.
    // We should inject it before Contact if it exists.
    const pricingSectionId = 'pricing-section-injected';
    let pricingSection = document.getElementById(pricingSectionId);
    
    if (config.pricing && config.pricing.length > 0) {
        if (!pricingSection) {
            pricingSection = document.createElement('section');
            pricingSection.id = pricingSectionId;
            pricingSection.className = 'section-padding';
            pricingSection.style.background = 'var(--bg-darker)';
            
            const contactSection = document.getElementById('contact');
            contactSection.parentNode.insertBefore(pricingSection, contactSection);
        }
        
        let pricingHTML = `
            <div class="container">
                <div class="section-header" style="text-align: center;">
                    <span class="section-subtitle">Investimento</span>
                    <h2 class="section-title">Opções de <span class="text-gradient">Contratação</span></h2>
                </div>
                <div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 50px;">
        `;
        
        config.pricing.forEach(item => {
            pricingHTML += `
                <div class="pricing-card animate active" style="background: var(--surface); padding: 40px; border-radius: 20px; border: 1px solid var(--border); text-align: center; transition: var(--transition);">
                    <h3 style="font-size: 1.5rem; margin-bottom: 15px;">${item.title}</h3>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary); margin-bottom: 20px;">${item.price}</div>
                    <ul style="text-align: left; margin-bottom: 30px; color: var(--text-muted);">
                        ${item.features ? item.features.map(f => `<li style="margin-bottom: 10px;"><i class="fas fa-check" style="color: var(--success); margin-right: 10px;"></i>${f}</li>`).join('') : ''}
                    </ul>
                    <a href="https://wa.me/${config.contact.whatsapp}?text=Olá, tenho interesse no plano ${item.title}" class="btn btn-outline" style="width: 100%; justify-content: center;">Contratar</a>
                </div>
            `;
        });
        
        pricingHTML += `</div></div>`;
        pricingSection.innerHTML = pricingHTML;
    }
}

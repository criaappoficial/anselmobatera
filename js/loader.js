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
    // Hero and About are handled in index.html to support custom logic (coloring, etc.)

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
    const youtubeBtn = document.getElementById('contact-youtube-btn');

    if (waBtn && config.contact.whatsapp) {
        waBtn.href = `https://wa.me/${config.contact.whatsapp}`;
    }
    if (emailBtn && config.contact.email) {
        emailBtn.href = `mailto:${config.contact.email}`;
    }
    if (instaBtn && config.contact.instagram) {
        let instaUrl = config.contact.instagram;
        if (!instaUrl.startsWith('http')) {
            instaUrl = `https://instagram.com/${instaUrl.replace('@', '')}`;
        }
        instaBtn.href = instaUrl;
    }
    if (youtubeBtn && config.contact.youtube) {
        youtubeBtn.href = config.contact.youtube;
        youtubeBtn.target = "_blank";
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
    
    // Fallback to defaults if empty
    let videosToRender = config.videos;
    if ((!videosToRender || videosToRender.length === 0) && SaaS.defaults && SaaS.defaults.config.videos) {
         videosToRender = SaaS.defaults.config.videos;
    }

    if (videoGallery && videosToRender && videosToRender.length > 0) {
        // Clear existing ONLY IF we have new videos from config that are different
        // For simplicity, we'll rebuild.
        videoGallery.innerHTML = '';
        
        videosToRender.forEach(video => {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-wrapper';
            wrapper.style.marginBottom = '30px';
            
            if (video.type === 'youtube' || video.url.includes('youtube') || video.url.includes('youtu.be')) {
                // Extract ID if full URL
                let videoId = video.url;
                try {
                    if (video.url.includes('v=')) {
                        videoId = video.url.split('v=')[1].split('&')[0];
                    } else if (video.url.includes('youtu.be/')) {
                        videoId = video.url.split('youtu.be/')[1].split('?')[0];
                    } else if (video.url.includes('embed/')) {
                        videoId = video.url.split('embed/')[1].split('?')[0];
                    } else if (video.url.includes('shorts/')) {
                         videoId = video.url.split('shorts/')[1].split('?')[0];
                    }
                } catch(e) { console.error("Error parsing video ID", e); }

                // Clean ID
                if(videoId) videoId = videoId.trim();
                
                wrapper.innerHTML = `
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                `;

                const title = document.createElement('h4');
                title.innerText = video.title;
                title.style.color = 'white';
                title.style.marginTop = '10px';
                title.style.textAlign = 'center';
                
                const container = document.createElement('div');
                container.appendChild(wrapper);
                container.appendChild(title);
                
                videoGallery.appendChild(container);
            }
        });
    }

    
    // 5. Pricing
    const pricingGrid = document.getElementById('pricing-grid');
    
    // Fallback to defaults if empty
    let pricingToRender = config.pricing;
    if ((!pricingToRender || pricingToRender.length === 0) && SaaS.defaults && SaaS.defaults.config.pricing) {
        pricingToRender = SaaS.defaults.config.pricing;
    }

    if (pricingGrid && pricingToRender && pricingToRender.length > 0) {
        pricingGrid.innerHTML = '';
        
        pricingToRender.forEach(item => {
            const featuresHTML = item.features ? item.features.map(f => 
                `<li style="margin-bottom: 10px; display: flex; align-items: flex-start; justify-content: center;">
                    <i class="fas fa-check" style="color: var(--primary); margin-right: 10px; margin-top: 5px;"></i>
                    <span>${f}</span>
                </li>`
            ).join('') : '';

            const card = document.createElement('div');
            card.className = 'pricing-card animate active';
            card.style.background = 'var(--surface)';
            card.style.padding = '40px';
            card.style.borderRadius = '20px'; // Enforce consistency
            card.style.border = '1px solid var(--border)';
            card.style.textAlign = 'center';
            card.style.transition = 'var(--transition)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';

            card.innerHTML = `
                <h3 style="font-size: 1.5rem; margin-bottom: 15px;">${item.title}</h3>
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary); margin-bottom: 20px;">${item.price}</div>
                <ul style="text-align: center; margin-bottom: 30px; color: var(--text-muted); list-style: none; padding: 0; flex-grow: 1;">
                    ${featuresHTML}
                </ul>
                <a href="https://wa.me/${config.contact.whatsapp.replace(/\D/g,'')}?text=Olá, tenho interesse no plano ${item.title}" class="btn btn-outline" style="width: 100%; justify-content: center; margin-top: auto;" target="_blank">
                    Contratar
                </a>
            `;
            pricingGrid.appendChild(card);
        });
    }
}

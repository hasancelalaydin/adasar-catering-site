const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

function updateHtmlFiles() {
    const dataPath = path.join(__dirname, 'data.json');
    if (!fs.existsSync(dataPath)) return;
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    const files = ['anasayfa.html', 'hizmetlerimiz.html', 'menuler.html', 'iletisim.html'];
    
    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;
        
        let html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);

        // -- Text updates --
        $('#dyn-sunnet-aciklama').text(data.sunnet_aciklama || 'Geleneksel ve bereketli menüler.');
        $('#dyn-cenaze-aciklama').text(data.cenaze_aciklama || 'Zor gününüzde yanınızdayız.');
        $('#dyn-kurumsal-aciklama').text(data.kurumsal_aciklama || 'Günlük tabldot hizmeti.');
        


        $('#dyn-hero-title').text(data.hero_title || 'Lezzeti Özel Günlerinize Taşıyoruz');
        $('#dyn-hero-desc').text(data.hero_desc || 'Sünnet, düğün, cenaze ve kurumsal etkinlikleriniz için profesyonel catering ve toplu yemek hizmeti.');
        $('#dyn-about-text').text(data.about_text || 'Adasar Catering olarak yılların getirdiği tecrübe ve mutfak sırlarıyla, en özel günlerinizde yanınızdayız. Küçük bir aile işletmesi ruhuyla başladığımız bu lezzet yolculuğunda, geleneksel Türk mutfağının en seçkin tatlarını usta ellerden sofralarınıza taşıyoruz. Amacımız sadece doyurmak değil, misafirlerinize damaklarda iz bırakan bir ziyafet sunmaktır.');

        // -- Sabit menü görselleri artık statik --

        // -- Contact updates --
        if (data.contact_address && data.contact_address.trim()) {
            $('.dyn-contact-address').html(data.contact_address);
            $('.dyn-contact-address').closest('.footer-contact-item').attr('style', 'display: flex;');
        } else {
            $('.dyn-contact-address').closest('.footer-contact-item').attr('style', 'display: none;');
        }
        
        if (data.contact_phone && data.contact_phone.trim()) {
            $('.dyn-contact-phone').text(data.contact_phone);
            $('.dyn-contact-phone-link').attr('href', 'tel:+' + data.contact_phone.replace(/\D/g, ''));
            $('.dyn-contact-phone').closest('.footer-contact-item').attr('style', 'display: flex;');
        } else {
            $('.dyn-contact-phone').closest('.footer-contact-item').attr('style', 'display: none;');
        }
        
        if (data.contact_email && data.contact_email.trim()) {
            $('.dyn-contact-email').text(data.contact_email);
            $('.dyn-contact-email-link').attr('href', 'mailto:' + data.contact_email);
            $('.dyn-contact-email').closest('.footer-contact-item').attr('style', 'display: flex;');
        } else {
            $('.dyn-contact-email').closest('.footer-contact-item').attr('style', 'display: none;');
        }
        
        if (data.contact_whatsapp && data.contact_whatsapp.trim()) {
            $('.dyn-contact-whatsapp-link').attr('href', 'https://wa.me/90' + data.contact_whatsapp.replace(/\D/g, '').replace(/^90/, ''));
            $('.dyn-contact-whatsapp-link').attr('style', 'display: flex;');
        } else {
            $('.dyn-contact-whatsapp-link').attr('style', 'display: none;');
        }
        
        if (data.contact_instagram && data.contact_instagram.trim()) {
            let instaLink = data.contact_instagram;
            let instaText = data.contact_instagram;
            if(!instaLink.startsWith('http')) {
                instaLink = 'https://instagram.com/' + instaLink.replace('@', '');
                instaText = '@' + data.contact_instagram.replace('@', '');
            } else {
                try {
                    const url = new URL(instaLink);
                    let p = url.pathname.replace(/\//g, '');
                    if (p) instaText = '@' + p;
                } catch(e) {}
            }
            $('.dyn-contact-instagram').text(instaText);
            $('.dyn-contact-instagram-link').attr('href', instaLink);
            $('.dyn-contact-instagram-container').attr('style', 'display: flex;');
            $('.dyn-social-instagram').attr('href', instaLink).attr('style', 'display: flex;');
        } else {
            $('.dyn-contact-instagram-container').attr('style', 'display: none;');
            $('.dyn-social-instagram').attr('style', 'display: none;');
        }




        // -- SSS updates --
        if (file === 'anasayfa.html') {
            const container = $('#dyn-sss-container');
            if (container.length > 0) {
                container.empty();
                let sssText = data.sss_list || "";
                const blocks = sssText.split(/\n\s*\n/);
                let hasSss = false;
                blocks.forEach(block => {
                    const lines = block.trim().split('\n');
                    if (lines.length >= 2) {
                        const q = lines[0];
                        const a = lines.slice(1).join('<br>');
                        container.append(`<div class="sss-item"><h4 class="sss-question">${q}</h4><p class="sss-answer">${a}</p></div>`);
                        hasSss = true;
                    }
                });
                if (hasSss) {
                    $('#sss-section').attr('style', 'display: block; background-color: #f9fafb; padding: 60px 0; border-top: 1px solid #e5e7eb;');
                } else {
                    $('#sss-section').attr('style', 'display: none;');
                }
            }
        }

        // -- Dynamic Menus updates (for menuler.html) --
        if (file === 'menuler.html' && data.dynamic_menus) {
            const mContainer = $('#dynamic-menu-container');
            if (mContainer.length > 0) {
                mContainer.empty();
                if (data.dynamic_menus.length === 0) {
                    mContainer.append('<p style="text-align: center; grid-column: span 2; padding: 50px; color: #6b7280; font-size: 1.1rem;">Henüz bir menü eklenmemiş.</p>');
                } else {
                    data.dynamic_menus.forEach(menu => {
                        let fiyatMetni = menu.fiyat || 'Fiyat Belirtilmemiş';
                        if (menu.fiyat && !menu.fiyat.toLowerCase().includes('tl')) {
                            fiyatMetni += ' TL';
                        }
                        let imgSrc = menu.image || '/assets/hero_catering.png';
                        if (imgSrc && !imgSrc.startsWith('/') && !imgSrc.startsWith('http')) {
                            imgSrc = '/' + imgSrc;
                        }
                        const title = menu.baslik || 'Başlıksız Menü';
                        const descHtml = (menu.desc || '').replace(/\n/g, '<br>');
                        
                        mContainer.append(`
                            <div class="dynamic-menu-card">
                                <img class="dynamic-menu-img" src="${imgSrc}" alt="${title}" onerror="this.onerror=null; this.src='/assets/hero_catering.png';">
                                <div class="dynamic-menu-content">
                                    <h3 class="dynamic-menu-title">${title}</h3>
                                    <span class="dynamic-menu-price">${fiyatMetni}</span>
                                    <p class="dynamic-menu-desc">${descHtml}</p>
                                </div>
                            </div>
                        `);
                    });
                }
            }
        }

        fs.writeFileSync(filePath, $.html(), 'utf8');
    });
}

module.exports = updateHtmlFiles;

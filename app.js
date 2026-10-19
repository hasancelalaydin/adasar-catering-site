document.addEventListener('DOMContentLoaded', function() {
    // Verilerin eski kalmaması için sonuna rastgele bir sayı ekliyoruz (Cache Busting)
    fetch('/api/data?t=' + new Date().getTime())
        .then(res => {
            if (!res.ok) {
                throw new Error('Veri alınamadı, sunucu hatası: ' + res.status);
            }
            return res.json();
        })
        .then(data => {
            if(!data || Object.keys(data).length === 0) return;

            // Fiyatlar (index.html ve menuler.html için)
            // Ana Sayfa - Menü Kısa Açıklamaları
            const sunnetAciklamaEl = document.getElementById('dyn-sunnet-aciklama');
            if(sunnetAciklamaEl) sunnetAciklamaEl.innerText = data.sunnet_aciklama || 'Geleneksel ve bereketli menüler.';

            const cenazeAciklamaEl = document.getElementById('dyn-cenaze-aciklama');
            if(cenazeAciklamaEl) cenazeAciklamaEl.innerText = data.cenaze_aciklama || 'Zor gününüzde yanınızdayız.';

            const kurumsalAciklamaEl = document.getElementById('dyn-kurumsal-aciklama');
            if(kurumsalAciklamaEl) kurumsalAciklamaEl.innerText = data.kurumsal_aciklama || 'Günlük tabldot hizmeti.';

            // İletişim Bilgileri (Sınıf Seçiciler)
            if (data.contact_address && data.contact_address.trim()) {
                document.querySelectorAll('.dyn-contact-address').forEach(el => {
                    el.innerHTML = data.contact_address;
                    if(el.closest('.footer-contact-item')) el.closest('.footer-contact-item').style.display = 'flex';
                });
            } else {
                document.querySelectorAll('.dyn-contact-address').forEach(el => {
                    if(el.closest('.footer-contact-item')) el.closest('.footer-contact-item').style.display = 'none';
                });
            }

            if (data.contact_phone && data.contact_phone.trim()) {
                document.querySelectorAll('.dyn-contact-phone').forEach(el => {
                    el.innerText = data.contact_phone;
                    if(el.closest('.footer-contact-item')) el.closest('.footer-contact-item').style.display = 'flex';
                });
                const phoneLink = 'tel:+' + data.contact_phone.replace(/\D/g, '');
                document.querySelectorAll('.dyn-contact-phone-link').forEach(el => el.href = phoneLink);
            } else {
                document.querySelectorAll('.dyn-contact-phone').forEach(el => {
                    if(el.closest('.footer-contact-item')) el.closest('.footer-contact-item').style.display = 'none';
                });
            }

            if (data.contact_email && data.contact_email.trim()) {
                document.querySelectorAll('.dyn-contact-email').forEach(el => {
                    el.innerText = data.contact_email;
                    if(el.closest('.footer-contact-item')) el.closest('.footer-contact-item').style.display = 'flex';
                });
                document.querySelectorAll('.dyn-contact-email-link').forEach(el => el.href = 'mailto:' + data.contact_email);
            } else {
                document.querySelectorAll('.dyn-contact-email').forEach(el => {
                    if(el.closest('.footer-contact-item')) el.closest('.footer-contact-item').style.display = 'none';
                });
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
                        let path = url.pathname.replace(/\//g, '');
                        if(path) instaText = '@' + path;
                    } catch(e) {}
                }
                
                document.querySelectorAll('.dyn-contact-instagram').forEach(el => el.innerText = instaText);
                document.querySelectorAll('.dyn-contact-instagram-link').forEach(el => el.href = instaLink);
                document.querySelectorAll('.dyn-contact-instagram-container').forEach(el => el.style.display = 'flex');
                document.querySelectorAll('.dyn-social-instagram').forEach(el => { el.href = instaLink; el.style.display = 'flex'; });
            } else {
                document.querySelectorAll('.dyn-contact-instagram-container').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.dyn-social-instagram').forEach(el => el.style.display = 'none');
            }

            if (data.contact_whatsapp && data.contact_whatsapp.trim()) {
                const waLink = 'https://wa.me/90' + data.contact_whatsapp.replace(/\D/g, '').replace(/^90/, '');
                document.querySelectorAll('.dyn-contact-whatsapp-link').forEach(el => {
                    el.href = waLink;
                    el.style.display = 'flex';
                });
            } else {
                document.querySelectorAll('.dyn-contact-whatsapp-link').forEach(el => el.style.display = 'none');
            }

            // Ana Sayfa Yazıları ve Arkaplanı


            const heroTitleEl = document.getElementById('dyn-hero-title');
            if(heroTitleEl) heroTitleEl.innerText = data.hero_title || 'Lezzeti Özel Günlerinize Taşıyoruz';

            const heroDescEl = document.getElementById('dyn-hero-desc');
            if(heroDescEl) heroDescEl.innerText = data.hero_desc || 'Sünnet, düğün, cenaze ve kurumsal etkinlikleriniz için profesyonel catering ve toplu yemek hizmeti.';

            const aboutTextEl = document.getElementById('dyn-about-text');
            if(aboutTextEl) aboutTextEl.innerText = data.about_text || 'Adasar Catering olarak yılların getirdiği tecrübe ve mutfak sırlarıyla, en özel günlerinizde yanınızdayız. Küçük bir aile işletmesi ruhuyla başladığımız bu lezzet yolculuğunda, geleneksel Türk mutfağının en seçkin tatlarını usta ellerden sofralarınıza taşıyoruz. Amacımız sadece doyurmak değil, misafirlerinize damaklarda iz bırakan bir ziyafet sunmaktır.';




            // Sık Sorulan Sorular (SSS)
            const sssContainerEl = document.getElementById('dyn-sss-container');
            const sssSection = document.getElementById('sss-section');
            if(sssContainerEl) {
                if(data.sss_list && data.sss_list.trim() !== '') {
                    sssContainerEl.innerHTML = '';
                    const blocks = data.sss_list.split(/\n\s*\n/);
                    let hasSss = false;
                    blocks.forEach(block => {
                        const lines = block.trim().split('\n');
                        if (lines.length >= 2) {
                            const question = lines[0];
                            const answer = lines.slice(1).join('<br>');
                            
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'sss-item';
                            itemDiv.innerHTML = `<h4 class="sss-question">${question}</h4><p class="sss-answer">${answer}</p>`;
                            sssContainerEl.appendChild(itemDiv);
                            hasSss = true;
                        }
                    });
                    
                    if(sssSection) {
                        if(hasSss) {
                            sssSection.style.display = 'block';
                        } else {
                            sssSection.style.display = 'none';
                        }
                    }
                } else {
                    // SSS boşsa tamamen gizle
                    if(sssSection) {
                        sssSection.style.display = 'none';
                    }
                }
            }
        })
        .catch(err => console.error("Veri çekilemedi:", err));
});

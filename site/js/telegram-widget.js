document.addEventListener("DOMContentLoaded", function() {
    // 1. Create structure
    const btn = document.createElement('a');
    btn.id = 'telegram-floating-btn';
    btn.target = '_blank';
    
    const isEn = window.location.pathname.includes('/en/');
    const lang = isEn ? 'en' : 'ru';
    
    // Deep Link payload
    const payload = `src_site_lang_${lang}`;
    btn.href = `https://t.me/lyazkai_bot?start=${payload}`;

    const isRu = !window.location.pathname.includes('/en/');
    const label = isRu ? 'Написать нам' : 'Chat with us';

    btn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="white" fill-opacity="0.2"/>
            <path d="M16.43 8.33L7.78 11.67C7.2 11.9 7.2 12.23 7.68 12.38L9.9 13.07L15.03 9.83C15.27 9.68 15.48 9.77 15.3 9.93L11.15 13.68H11.14L11.15 13.69L11 15.93C11.22 15.93 11.32 15.83 11.43 15.72L12.5 14.68L14.72 16.32C15.13 16.55 15.43 16.43 15.53 15.94L16.99 9.06C17.14 8.46 16.76 8.19 16.43 8.33Z" fill="white"/>
        </svg>
        <span style="font-size:0.85rem; font-weight:700; white-space:nowrap;">${label}</span>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
        #telegram-floating-btn {
            position: fixed;
            bottom: 30px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 18px;
            background: #229ED9;
            border-radius: 30px;
            color: #fff;
            box-shadow: 0 4px 20px rgba(34, 158, 217, 0.45);
            z-index: 9998;
            cursor: pointer;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease;
            text-decoration: none;
        }
        #telegram-floating-btn.visible {
            opacity: 1;
            transform: translateY(0);
        }
        #telegram-floating-btn:hover {
            box-shadow: 0 6px 25px rgba(34, 158, 217, 0.6);
        }
        @media (max-width: 768px) {
            #telegram-floating-btn { display: none; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(btn);

    setTimeout(() => {
        btn.classList.add('visible');
    }, 5000);
});

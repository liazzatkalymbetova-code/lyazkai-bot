/**
 * InfoLady Unified Lead Capture Handler
 * Connects frontend forms to the Render backend API.
 */
window.InfoLadyLeads = {
    apiUrl: '/api/lead',

    async submitLead(data) {
        console.log('[InfoLady] Submitting lead...', data);

        const payload = {
            email: data.email,
            scanned_domain: data.domain || data.website || '',
            seo_score: data.seoScore || data.seo_score || null,
            page_url: data.page_url || window.location.href,
            source_page: data.source || window.location.pathname.split('/').pop() || 'index',
            language: document.documentElement.lang || 'en',
            name: data.name || '',
            budget: data.budget || '',
            timestamp: data.timestamp || new Date().toISOString()
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Submission failed');
            }

            return { success: true, data: await response.json() };
        } catch (err) {
            console.error('[InfoLady] Lead submission error:', err);
            return { success: false, error: err.message };
        }
    }
};

/**
 * Universal function for the SEO checkers email form
 */
async function sendCheckerEmail(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById('checkerEmail') || document.getElementById('leadEmail');
    const email = emailInput ? emailInput.value.trim() : '';

    // Attempt to find domain and score from common UI elements
    const domainInput = document.getElementById('checkerUrl') || document.getElementById('siteUrl');
    const domain = domainInput ? domainInput.value.trim() : '';
    const seoScoreElement = document.getElementById('mSeo');
    const seoScore = seoScoreElement ? seoScoreElement.textContent : null;

    const feedbackMsg = document.getElementById('emailSent');

    if (!email) {
        if (emailInput) emailInput.focus();
        return;
    }

    const btn = event?.target || document.querySelector('button[onclick*="sendCheckerEmail"]');
    if (btn) {
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = '...';

        const result = await window.InfoLadyLeads.submitLead({
            email: email,
            domain: domain,
            seoScore: seoScore,
            source: 'seo_checker_inline'
        });

        btn.disabled = false;
        btn.textContent = originalText;

        if (result.success) {
            if (feedbackMsg) feedbackMsg.style.display = 'block';
            if (emailInput) emailInput.value = '';

            // If there's a success view (like in modal), show it
            const successView = document.getElementById('leadSuccessView');
            const formView = document.getElementById('leadFormView');
            if (successView && formView) {
                formView.style.display = 'none';
                successView.style.display = 'block';
            }
        } else {
            console.error("Submission failed:", result.error);
            alert('Error: ' + result.error);
        }
    }
}

// Auto-wire any generic forms with type="email"
document.addEventListener('submit', async function (e) {
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');

    // If it's a generic form and doesn't have a specific handler already
    if (emailInput && !form.dataset.handled && !form.getAttribute('action')) {
        e.preventDefault();
        form.dataset.handled = "true";

        const btn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
        if (btn) btn.disabled = true;

        const formData = new FormData(form);
        const data = {
            email: emailInput.value,
            source: form.id || 'generic_form',
            name: form.querySelector('[name="name"]')?.value || '',
            website: form.querySelector('[name="url"], [name="website"]')?.value || ''
        };

        const result = await window.InfoLadyLeads.submitLead(data);

        if (btn) btn.disabled = false;

        if (result.success) {
            form.innerHTML = `<div class="success-msg" style="color:#28c840; padding:10px;">✅ Thank you! We received your request.</div>`;
        } else {
            alert('Error: ' + result.error);
            delete form.dataset.handled;
        }
    }
});

function loadScans() {
    const email = document.getElementById('user-email').value.trim();
    if (!email) return;

    // Save for next time
    localStorage.setItem('user_email', email);

    const listContainer = document.getElementById('scans-list');
    const emptyState = document.getElementById('empty-state');
    const spinner = document.getElementById('loading-spinner');

    listContainer.innerHTML = '';
    spinner.style.display = 'block';
    emptyState.style.display = 'none';
    const baseUrl = typeof API_URL !== 'undefined' ? API_URL : window.location.origin;

    fetch(`${baseUrl}/api/my-scans?email=${encodeURIComponent(email)}`)
        .then(response => response.json())
        .then(data => {
            spinner.style.display = 'none';
            if (data && data.length > 0) {
                emptyState.style.display = 'none';
                data.forEach(scan => {
                    const card = document.createElement('div');
                    card.className = 'scan-card';

                    const status = scan.status || 'new';
                    const score = scan.seo_score || 0;
                    const scoreClass = score < 60 ? 'critical' : 'good';
                    const domain = scan.scanned_domain || 'Unknown Domain';

                    const isEn = window.location.pathname.includes('/en/');
                    const dateStr = isEn ? 'Date' : 'Дата';
                    const openReportStr = isEn ? 'Open Report' : 'Открыть отчет';
                    const downloadPdfStr = isEn ? 'Download PDF' : 'Скачать PDF';

                    let statusLabel = status;
                    let statusColor = '#3b82f6'; // blue for new
                    if (status === 'paid') { statusColor = '#10b981'; statusLabel = isEn ? 'Paid' : 'Оплачен'; }
                    else if (status === 'warm') { statusColor = '#f59e0b'; statusLabel = isEn ? 'Warm' : 'Прогрев'; }
                    else if (status === 'viewed') { statusColor = '#8b5cf6'; statusLabel = isEn ? 'Viewed' : 'Просмотрен'; }
                    else if (status === 'lost') { statusColor = '#ef4444'; statusLabel = isEn ? 'Lost' : 'Потерян'; }
                    else { statusLabel = isEn ? 'New' : 'Новый'; }


                    card.innerHTML = `
                        <span class="score-badge ${scoreClass}">Score: ${score}/100</span>
                        <span class="status-badge" style="background: ${statusColor}; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; position: absolute; top: 20px; right: 20px; text-transform: uppercase;">${statusLabel}</span>
                        <div style="margin-bottom: 20px;">
                            <h3 style="font-size: 1.15rem; color: #fff; margin-bottom: 5px; word-break: break-all;">${domain}</h3>
                            <p style="font-size: 0.85rem; color: var(--text-dim);">${dateStr}: ${new Date(scan.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <a href="/${scan.language || 'ru'}/report.html?url=${encodeURIComponent(domain)}" class="btn btn-primary btn-sm" style="text-align:center;">${openReportStr}</a>
                            <button class="btn btn-secondary btn-sm" onclick="triggerPdf('${domain}', '${scan.language || 'ru'}')">${downloadPdfStr}</button>
                        </div>
                    `;

                    listContainer.appendChild(card);
                });
            } else {
                emptyState.style.display = 'block';
            }
        })
        .catch(err => {
            spinner.style.display = 'none';
            emptyState.style.display = 'block';
            console.error('Failed to load scans:', err);
        });
}

function triggerPdf(domain, lang) {
    // Open the report first then auto print it
    const win = window.open(`/${lang}/report.html?url=${encodeURIComponent(domain)}&print=true`, '_blank');
}

import os
import re

def extract_function_body_and_replace(content):
    # Find start of async function runChecker() {
    start_idx = content.find('async function runChecker() {')
    if start_idx == -1:
        return False, content
        
    # Find the closing brace of the function
    brace_count = 0
    in_function = False
    end_idx = -1
    
    # We start counting braces from start_idx
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            if not in_function:
                in_function = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_function and brace_count == 0:
                end_idx = i
                break
                
    if end_idx == -1:
        return False, content

    # The new function body calling our real Node.js backend
    new_body = """async function runChecker() {
            var urlInput = document.getElementById('checkerUrl');
            var url = urlInput.value.trim();
            if (!url) { urlInput.focus(); return; }

            // Basic URL normalization
            if (!/^https?:\\/\\//i.test(url)) {
                url = 'https://' + url;
                urlInput.value = url;
            }

            var loading = document.getElementById('checkerLoading');
            var results = document.getElementById('checkerResults');
            var btn = document.getElementById('checkerBtn');
            var issuesList = document.querySelector('#moreIssues').parentElement.querySelector('div:nth-child(2)');
            var errorMsg = document.getElementById('checkerError');

            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.id = 'checkerError';
                errorMsg.style.cssText = 'color:var(--accent-tertiary); background:rgba(255,100,100,0.1); padding:15px; border-radius:10px; margin-top:20px; display:none; text-align:center; font-size:0.9rem;';
                results.parentElement.appendChild(errorMsg);
            }

            results.style.display = 'none';
            errorMsg.style.display = 'none';
            loading.classList.add('visible');
            btn.disabled = true;

            const isRu = document.documentElement.lang === 'ru';
            btn.textContent = isRu ? 'Анализируем...' : 'Analyzing...';

            try {
                // Call the REAL local Node.js SEO Backend
                const apiUrl = `http://localhost:3000/api/scan?url=${encodeURIComponent(url)}`;
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server Analysis Failed');
                }
                
                const data = await response.json();

                const seo = data.seoScore;
                const performance = data.performanceScore;
                const bestPractices = data.aiScore;
                const accessibility = data.contentScore;
                const failedAudits = data.issues;

                // Update UI scores
                document.getElementById('mSeo').textContent = seo;
                document.getElementById('mTech').textContent = performance;
                document.getElementById('mAi').textContent = bestPractices;
                document.getElementById('mContent').textContent = accessibility;

                // Animate bars
                setTimeout(function () {
                    document.getElementById('mSeoBar').style.width = seo + '%';
                    document.getElementById('mTechBar').style.width = performance + '%';
                    document.getElementById('mAiBar').style.width = bestPractices + '%';
                    document.getElementById('mContentBar').style.width = accessibility + '%';
                }, 100);

                // Map real issues into the list
                if (failedAudits && failedAudits.length > 0) {
                    issuesList.innerHTML = failedAudits.map(a => `<div>• ${isRu ? a.title : a.enTitle}</div>`).join('');
                } else {
                    issuesList.innerHTML = `<div>• ${isRu ? 'Критических проблем не обнаружено' : 'No critical issues detected'}</div>`;
                }

                loading.classList.remove('visible');
                results.style.display = '';
                results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                // Save to dashboard local database if session exists
                var sessionRaw = localStorage.getItem('infolady_session');
                if (sessionRaw) {
                    var session = JSON.parse(sessionRaw);
                    var scans = JSON.parse(localStorage.getItem('il_scans') || '[]');

                    scans.push({
                        email: session.email,
                        domain: url.replace(/^https?:\\/\\//i, '').split('/')[0],
                        seoScore: seo,
                        techScore: performance,
                        aiScore: bestPractices,
                        contentScore: accessibility,
                        date: new Date().toISOString()
                    });

                    localStorage.setItem('il_scans', JSON.stringify(scans));
                }

                btn.disabled = false;
                btn.innerHTML = isRu ? '✅ Проверить SEO' : '✅ Check SEO';

            } catch (err) {
                console.error("Analysis Error:", err);
                loading.classList.remove('visible');
                errorMsg.textContent = isRu
                    ? 'Ошибка при анализе сайта: сервер недоступен или отклонил запрос.'
                    : `Error analyzing website: ${err.message}`;
                errorMsg.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = isRu ? '✅ Проверить SEO' : '✅ Check SEO';
            }
}"""
    
    new_content = content[:start_idx] + new_body + content[end_idx+1:]
    return True, new_content

rootDir = '/Users/lyazzatkalymbetova/Agentic/infolady.online'
count = 0
for dirpath, dirnames, filenames in os.walk(rootDir):
    for filename in filenames:
        if filename.endswith('.html'):
            filepath = os.path.join(dirpath, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            success, new_content = extract_function_body_and_replace(content)
            if success and new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1

print(f"Total HTML files hooked to Node.js backend: {count}")

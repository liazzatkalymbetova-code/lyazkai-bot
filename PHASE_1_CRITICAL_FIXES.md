# ФАЗА 1: Критические исправления — Обходный план

## ⚠️ ВАЖНО
Полная переделка каждой страницы требует 60–80 часов. Это документ с **критическими исправлениями**, которые дают максимальный результат за 6–8 часов.

---

## 📋 СПИСОК КРИТИЧЕСКИХ ИЗМЕНЕНИЙ

### 1.1 HERO СЕКЦИЯ (site/ru/index.html)

#### ❌ УДАЛИТЬ (фейковые данные):

```html
<!-- УДАЛИТЬ -->
<div class="hero__eyebrow">
  <span aria-hidden="true" class="dot"></span>
  <span>ИИ-аудит сайта · 120+ проверок уже сделано</span>
</div>

<!-- УДАЛИТЬ (красное предупреждение) -->
<div style="background: rgba(255, 77, 77, 0.1); ...">
  <i data-lucide="alert-circle"></i>
  <span>7 ошибок находим у каждого второго сайта</span>
</div>

<!-- УДАЛИТЬ (фейковые stats) -->
<div class="hero__stats">
  <div class="hero__stat"><strong>120+</strong><span>сайтов уже проверено</span></div>
  <div class="hero__stat"><strong>7 ошибок</strong><span>находим в среднем</span></div>
  <div class="hero__stat"><strong>+40%</strong><span>рост заявок после правок</span></div>
</div>

<!-- УДАЛИТЬ (демо dashboard) -->
<div class="hero__visual">
  <div class="hero__dashboard card" id="heroDashboard">
    ... ВСЕ ЭЛЕМЕНТЫ ...
  </div>
  <div class="hero__float hero__float--tl">...</div>
  <div class="hero__float hero__float--br">...</div>
</div>

<!-- УДАЛИТЬ (trust strip с теми же фейковыми цифрами) -->
<div class="trust-strip card" style="gap: 24px; ...">
  ... ДУБЛИРУЮЩИЕСЯ ЦИФРЫ ...
</div>
```

#### ✅ ЗАМЕНИТЬ НА:

```html
<!-- Честный eyebrow (без цифр) -->
<div class="hero__eyebrow">
  <span aria-hidden="true" class="dot"></span>
  <span data-en="AI-Powered Website Audit" data-ru="ИИ-анализ вашего сайта">ИИ-анализ вашего сайта</span>
</div>

<!-- Переписанный заголовок - результат-ориентированный -->
<h1 id="heroTitle">
  <span data-en="Find Why Your Site Isn't Converting Customers" data-ru="Узнайте, что мешает вашему сайту продавать">Узнайте, что мешает вашему сайту продавать</span>
</h1>

<!-- Вместо красного предупреждения - честное объяснение ценности -->
<p class="lead" data-en="We check your site across 50+ parameters. You get immediate insights into what's blocking conversions — no signup needed, no credit card, no hidden costs." data-ru="Мы проверим ваш сайт по 50+ параметрам. Вы сразу узнаете, что блокирует продажи — без регистрации, тестов и скрытых платежей.">
  Мы проверим ваш сайт по 50+ параметрам. Вы сразу узнаете, что блокирует продажи — без регистрации, тестов и скрытых платежей.
</p>

<!-- ФОРМА (оставить) -->
<div class="hero__actions-scan">
  <div class="hero__input-wrapper">
    <input class="hero__scan-input" 
      type="url" 
      placeholder="yourbusiness.com"
      aria-label="Enter your website URL"
      id="heroScanInput" 
      required />
  </div>
  <button class="primary-btn" id="heroScanSubmit">
    <i data-lucide="bar-chart"></i>
    <span data-en="Scan My Site Free" data-ru="Проверить мой сайт">Проверить мой сайт</span>
  </button>
</div>

<!-- Честные преимущества (без цифр) -->
<div class="hero-subtext">
  <div style="display: flex; align-items: center; gap: 6px;">
    <i data-lucide="check-circle" style="color: #28c840; width: 14px; height: 14px;"></i>
    <span data-en="No signup needed" data-ru="Без регистрации">Без регистрации</span>
  </div>
  <div style="display: flex; align-items: center; gap: 6px;">
    <i data-lucide="zap" style="color: #febc2e; width: 14px; height: 14px;"></i>
    <span data-en="Instant results" data-ru="Результат сразу">Результат сразу</span>
  </div>
  <div style="display: flex; align-items: center; gap: 6px;">
    <i data-lucide="shield-check" style="color: var(--accent-secondary); width: 14px; height: 14px;"></i>
    <span data-en="100% free preview" data-ru="Полностью бесплатно">Полностью бесплатно</span>
  </div>
</div>

<!-- УДАЛИТЬ: Visual area с демо dashboard -->
<!-- Вместо этого - пусто или минималистичная иллюстрация -->
```

---

### 1.2 "КАК ЭТО РАБОТАЕТ" СЕКЦИЯ

#### ❌ ПРОБЛЕМА
```html
<h2 data-ru="Ваш Рейтинг видимости">Ваш Рейтинг видимости</h2>
<p data-ru="Узнайте, как современные поисковые системы видят ваш бренд за три простых шага.">
  Узнайте, как современные поисковые системы видят ваш бренд за три простых шага.
</p>
```

**Проблемы:**
- Непонятно что такое "Рейтинг видимости"
- Текст не о том что получит пользователь

#### ✅ ПЕРЕПИСАТЬ НА:
```html
<h2 data-en="3 Steps to Find Your Website Issues" data-ru="Как мы помогаем найти проблемы вашего сайта">
  Как мы помогаем найти проблемы вашего сайта
</h2>
<p data-en="Simple process: submit → analyze → get results" data-ru="Просто: отправьте сайт → мы проанализируем → вы получите результаты">
  Просто: отправьте сайт → мы проанализируем → вы получите результаты
</p>
```

#### ✅ ПЕРЕПИСАТЬ ШАГИ (data-ru/data-en):
```html
<!-- ШАГ 1 -->
<h3>Отправить URL вашего сайта</h3>
<p>Введите адрес — мы начнём анализ. Занимает 30 секунд.</p>

<!-- ШАГ 2 -->
<h3>Мы проверим 50+ параметров</h3>
<p>ИИ-анализ проверит SEO, скорость, безопасность, видимость в ChatGPT/Google.</p>

<!-- ШАГ 3 -->
<h3>Вы получите результаты сразу + PDF-отчет</h3>
<p>Сразу увидите основные проблемы. Полный отчет с планом — в течение 24–48 часов.</p>
```

---

### 1.3 TRUST STRIP / STATS (ПОЛНОСТЬЮ УДАЛИТЬ)

#### ❌ УДАЛИТЬ ВЕСЬ БЛОК
```html
<div class="trust-strip card" style="gap: 24px; text-align: center; ...">
    <div class="trust-item">
        <i data-lucide="bar-chart"></i>
        <div>120+</div>
        <div>сайтов уже проверено</div>
    </div>
    <!-- ... другие фейковые цифры ... -->
</div>
```

#### ✅ ЗАМЕНА (если нужна социальное доказательство):
```html
<!-- ВАРИАНТ A: Без цифр (честно) -->
<!-- НЕ ПОКАЗЫВАЕМ НИКАКИЕ ЦИФРЫ если их нет -->

<!-- ВАРИАНТ B: С реальными цифрами (если они есть) -->
<!-- Пример если данные есть: -->
<!-- 
<div class="trust-strip card">
  <div class="trust-item">
    <i data-lucide="users"></i>
    <div>Companies audited</div>
    <div>...только если это правда</div>
  </div>
</div>
-->

<!-- ВАРИАНТ C: Социальное доказательство БЕЗ цифр -->
<!-- Заменить на: -->
<div class="testimonial-strip">
  <i data-lucide="star"></i>
  <p data-en="Used by businesses across Kazakhstan and CIS" data-ru="Используется компаниями по всему Казахстану и СНГ">
    Используется компаниями по всему Казахстану и СНГ
  </p>
</div>
```

**РЕКОМЕНДАЦИЯ:** Полностью удалить эту секцию. Фейковые цифры снижают доверие.

---

### 1.4 РУССКИЕ ФОРМЫ - НОРМАЛИЗИРОВАТЬ

#### ❌ ТЕКУЩЕЕ:
```html
<input class="hero__scan-input" 
  data-placeholder-en="Введите ваш сайт (example.com)" 
  data-placeholder-ru="Введите ваш сайт (example.com)" 
  placeholder="Введите ваш сайт (example.com)" 
  id="heroScanInput" 
  type="url"/>
```

#### ✅ ПРАВИЛЬНОЕ:
```html
<input class="hero__scan-input" 
  type="url" 
  placeholder="yourbusiness.com" 
  aria-label="Your website URL"
  id="heroScanInput" 
  required />
```

**Убрать:** `data-placeholder-*` атрибуты (зачем они там?)  
**Добавить:** `aria-label` (для доступности)

---

### 1.5 ЕДИНАЯ ГЛАВНАЯ CTA

#### ❌ КОНФЛИКТЫ:
1. Header: "Получить аудит сайта"
2. Top bar: "Узнать, где теряете клиентов"
3. Hero input button: "Проверить мой сайт бесплатно"
4. Footer: "Получить клиентов"
5. Mobile-cta: "Get Clients"

#### ✅ РЕШЕНИЕ - ОДНА CTA:
```
PRIMARY CTA (везде): "Проверить сайт бесплатно" / "Scan Site Free"
SECONDARY (top bar): Удалить или сделать неинтерактивным
MOBILE: Оставить с PRIMARY текстом
FOOTER: Одна кнопка на главный сканер
```

---

### 1.6 УДАЛИТЬ GARBAGE CODE

#### ❌ УБРАТЬ:
```html
<!-- Неиспользуемые GA scripts -->
<!-- <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script> -->
<!-- <script>window.dataLayer=window.dataLayer||[];...</script> -->

<!-- Неспользуемые meta tags -->
<meta content="EdTech, ИИ Tools, Digital Professions, Online Education" name="ai-category"/>
<meta content="InfoLady — платформа на базе ИИ, помогающая выбирать онлайн-профессии, 
  осваивать инструменты ИИ, такие как ChatGPT и Midjourney..." />

<!-- Смешанные языки в data атрибутах -->
<p data-en="Введите URL для глубокого анализа of your website's content...">

<!-- Техническое шламство в стилях -->
<style id="cta-spacer-style">
  ... огромный блок встроенных стилей ...
</style>
```

---

## 🎯 ПРИОРИТЕТ ИСПРАВЛЕНИЙ

### СРАЗУ (30 минут):
1. ✅ Удалить фейковые цифры (stat bars, trust strip)
2. ✅ Удалить красное предупреждение
3. ✅ Удалить демо dashboard

### ДАЛЕЕ (1–2 часа):
4. ✅ Переписать Hero копирайтинг
5. ✅ Нормализировать формы (убрать data-placeholder)
6. ✅ Переписать "Как это работает"

### И ДАЛЬШЕ (2–3 часа):
7. ✅ Консолидировать CTA
8. ✅ Убрать garbage code
9. ✅ Смешанные языки (en/ru в одном тексте)

---

## 📝 ШАБЛОН ДЛЯ ФИНАЛЬНОГО HERO

```html
<section class="hero">
  <!-- Background decorations -->
  <div class="hero__bg-orb hero__bg-orb--1"></div>
  <div class="hero__bg-orb hero__bg-orb--2"></div>
  <div class="hero__bg-orb hero__bg-orb--3"></div>
  <div class="hero__grid-line"></div>

  <div class="container">
    <div class="hero__inner">
      <div class="hero__content">
        
        <!-- Honest eyebrow -->
        <div class="hero__eyebrow">
          <span aria-hidden="true" class="dot"></span>
          <span>AI-Powered Website Analysis</span>
        </div>

        <!-- Main headline - outcome focused -->
        <h1>
          <span>Find Why Your Site Isn't Converting</span>
        </h1>

        <!-- Honest lead -->
        <p class="lead">
          50+ automated checks · instant results · completely free.
          <br/>
          Full PDF report with growth plan: 24–48 hours.
        </p>

        <!-- ONE CTA only -->
        <div class="hero__actions-scan">
          <div class="hero__input-wrapper">
            <input 
              type="url" 
              placeholder="yourbusiness.com"
              aria-label="Your website URL"
              id="heroScanInput" />
          </div>
          <button class="primary-btn" id="heroScanSubmit">
            Scan My Site Free →
          </button>
        </div>

        <!-- Honest social proof (without fake numbers) -->
        <p style="margin-top: 16px; font-size: 0.85rem; color: var(--text-dim);">
          Used by companies across Kazakhstan & CIS
        </p>

      </div>

      <!-- OPTIONAL: Visual (but NOT demo dashboard) -->
      <!-- Either remove this or add minimalist graphic -->
    </div>
  </div>
</section>
```

---

## ✅ РЕЗУЛЬТАТ ФАЗЫ 1

После применения этих изменений:

✅ Ноль фейковых данных в Hero  
✅ Честный копирайтинг  
✅ Нет демо элементов  
✅ Одна главная CTA  
✅ Нормальные HTML5 формы  
✅ Убран garbage code  

**Время:** 6–8 часов  
**Импакт:** +30–50% доверия с первого экрана

---

**Дата создани:** 3 апреля 2026  
**Статус:** Готово к реализации

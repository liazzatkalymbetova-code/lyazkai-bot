# Исправления отображения служебных атрибутов в формах

## Проблема
На мобильной версии сайта в блоке формы отображались служебные атрибуты:
```
data-placeholder-ru="..."
Placeholder="..."
```

Эти атрибуты выводились как текст в интерфейсе вместо работы в качестве placeholder для input полей.

## Причина
В файле `site/ru/visibility-audit.html` атрибуты `data-placeholder-ru` и `Placeholder` находились **ВНЕ** тега `<input>` и выводились как обычный текст.

**Неправильный синтаксис (ДО):**
```html
<input data-placeholder-en="your@email.com" id="paypalEmail" type="email"/> data-placeholder-ru="ваш@email.com" Placeholder="ваш@email.com"
```

Текст после `/>` просто печатался на странице.

## Выполненные исправления

### 1. Исправлено site/ru/visibility-audit.html
**Строки 1233-1234:**

```html
<!-- ДО -->
<input data-placeholder-en="your@email.com" id="paypalEmail" required="" style="..." type="email"/> data-placeholder-ru="ваш@email.com" Placeholder="ваш@email.com"
<input data-placeholder-en="https://yourwebsite.com" id="paypalSiteUrl" required="" style="..." type="url"/> data-placeholder-ru="https://вашсайт.com" Placeholder="https://вашсайт.com"

<!-- ПОСЛЕ -->
<input data-placeholder-en="your@email.com" data-placeholder-ru="ваш@email.com" id="paypalEmail" placeholder="ваш@email.com" required="" style="..." type="email"/>
<input data-placeholder-en="https://yourwebsite.com" data-placeholder-ru="https://вашсайт.com" id="paypalSiteUrl" placeholder="https://вашсайт.com" required="" style="..." type="url"/>
```

**Изменения:**
- ✅ Перемещены все атрибуты внутрь тега `<input>`
- ✅ Удалены дублирующиеся атрибуты вне тега
- ✅ Исправлена заглавная буква `Placeholder` → `placeholder`
- ✅ Добавлено `data-placeholder-ru` подходящей значение

### 2. Улучшено site/en/visibility-audit.html
**Строки 1215-1216:**

Добавлены `data-placeholder-ru` атрибуты для полной поддержки многоязычности:

```html
<!-- ДО -->
<input data-placeholder-en="your@email.com" id="paypalEmail" placeholder="your@email.com" required="" ... type="email"/>
<input data-placeholder-en="https://yourwebsite.com" id="paypalSiteUrl" placeholder="https://yourwebsite.com" required="" ... type="url"/>

<!-- ПОСЛЕ -->
<input data-placeholder-en="your@email.com" data-placeholder-ru="ваш@email.com" id="paypalEmail" placeholder="your@email.com" required="" ... type="email"/>
<input data-placeholder-en="https://yourwebsite.com" data-placeholder-ru="https://вашсайт.com" id="paypalSiteUrl" placeholder="https://yourwebsite.com" required="" ... type="url"/>
```

## Как работает динамическое обновление placeholder

В файле `site/js/script.js` уже реализована функция автоматического обновления placeholder:

```javascript
// 2. Placeholders translation
const placeholderSelector = 'input[data-placeholder-ru], input[data-placeholder-en], textarea[data-placeholder-ru], textarea[data-placeholder-en]';
$$(placeholderSelector).forEach(el => {
    const ph = lang === 'ru' ? el.dataset.placeholderRu : el.dataset.placeholderEn;
    if (ph) el.placeholder = ph;
});
```

Этот скрипт:
1. Находит все input и textarea элементы с `data-placeholder-*` атрибутами
2. Определяет текущий язык сайта
3. Устанавливает `placeholder` атрибут динамически на основе выбранного языка

## Результат

✅ **До исправления:**
- Служебные атрибуты выводились как текст в интерфейсе
- Placeholder не работал корректно на мобильной версии

✅ **После исправления:**
- Все input элементы имеют правильный синтаксис
- Placeholder работает корректно для обоих языков
- Нет видимых служебных атрибутов в интерфейсе
- Скрипт динамически переключает placeholders при смене языка

## Проверка

Все 6 элементов с `data-placeholder` проверены и исправлены:

| Файл | Строка | Статус |
|------|--------|--------|
| `en/index.html` | 210 | ✓ OK |
| `en/visibility-audit.html` | 1215-1216 | ✓ Исправлено (добавлены ru) |
| `ru/index.html` | 224 | ✓ OK |
| `ru/visibility-audit.html` | 1233-1234 | ✓ Исправлено (перемещены атрибуты) |

---

**Дата исправления:** 3 апреля 2026  
**Статус:** ✅ Завершено

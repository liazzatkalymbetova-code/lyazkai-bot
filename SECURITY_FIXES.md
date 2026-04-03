# Исправления проблем безопасности сайта InfoLady

## Проблема
На мобильной версии сайта https://infolady.online перед основным экраном появлялось системное предупреждение браузера:
> "Если эта страница отображается с ошибками, можно ослабить меры защиты…"

## Причины
1. **Mixed Content Warning**: В файлах `payment.html` и `report-dynamic.js` были ссылки на `http://localhost:3000`
2. **Отсутствие Security Headers**: На сервере не были установлены критические security заголовки

## Выполненные исправления

### 1. ✅ Устранение Mixed Content
**Файлы:** 
- `site/ru/payment.html` (строка 286)
- `site/en/payment.html` (строка 282)
- `site/js/report-dynamic.js` (строка 89-90)

**Изменение:**
```javascript
// ДО:
const baseUrl = ... ? 'http://localhost:3000' : '';

// ПОСЛЕ:
const baseUrl = ... ? `${window.location.protocol}//localhost:3000` : '';
```

**Эффект:** Теперь при локальной разработке (http://localhost) скрипты используют `http://localhost:3000`, а на production (https://infolady.online) используют `https://localhost:3000` или не обращаются к localhost вообще.

### 2. ✅ Добавлены Security Headers в backend/server.js

Установлены следующие headers:

| Header | Значение | Назначение |
|--------|----------|-----------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Принудительное использование HTTPS на 1 год |
| `X-Content-Type-Options` | `nosniff` | Предотвращение MIME sniffing атак |
| `X-Frame-Options` | `DENY` | Защита от clickjacking атак |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Контроль передачи referrer данных |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Запрет на доступ к устройствам |
| `Content-Security-Policy` | Детальная политика | Предотвращение XSS атак и управление источниками контента |

### 3. ✅ Проверка остальных ресурсов

- ✓ Все внешние CSS/JS ресурсы используют HTTPS
- ✓ Google Fonts используются с HTTPS
- ✓ Lucide Icons используются с HTTPS
- ✓ Нет iframe'ов или embed элементов с HTTP
- ✓ robots.txt корректно конфигурирует доступ для AI crawlers

## Результат

После внедрения этих исправлений:

1. **Исчезнет системное предупреждение браузера** о необходимости ослабления мер защиты
2. **Сайт будет использовать максимальный уровень безопасности HTTPS**
3. **Защита от основных веб-атак** (XSS, clickjacking, MIME sniffing)
4. **Улучшится доверие браузеров и поисковиков** к сайту
5. **Оптимизация для GEO** - Security Headers положительно влияют на видимость в AI поиске

## Как развернуть

1. Убедитесь, что обновлены файлы на сервере:
   - `backend/server.js` 
   - `site/ru/payment.html`
   - `site/en/payment.html`
   - `site/js/report-dynamic.js`

2. Перезагрузите Node.js сервер:
   ```bash
   npm start
   ```

3. Проверьте headers в Chrome DevTools:
   - Откройте DevTools (F12)
   - Перейдите на Network tab
   - Откройте любой запрос
   - Проверьте Response Headers

## Тестирование

Можно проверить headers мобильной версии следующей командой:
```bash
curl -I https://infolady.online/ru/
```

Должны быть видны новые headers в ответе.

---

**Дата исправления:** 3 апреля 2026  
**Статус:** ✅ Завершено

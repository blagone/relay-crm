# Relay CRM

Relay — компактная русскоязычная CRM для фрилансера или небольшой студии. Milestone A реализует полноценное локальное портфолио-демо; облачный режим намеренно не выдаётся за готовый без Supabase и проверок безопасности.

## Что работает в `/demo`

- обзор с суммой воронки, выигранной выручкой и просроченными контактами;
- список заявок, поиск и фильтры по этапу/архиву;
- допустимые переходы статусов, архив и восстановление;
- создание клиентов и заявок, заметки и журнал действий;
- вымышленные seed-данные, версионированное Zod-валидируемое localStorage;
- восстановление после повреждённого/недоступного хранилища и подтверждённый сброс;
- клавиши `N` (новая заявка), `/` (поиск), `Escape` (закрыть);
- адаптивный интерфейс, native controls, skip-link и reduced-motion.

`/app` — честная страница состояния cloud mode. Без переменных Supabase она показывает конфигурационную недоступность и **не** переключается на demo.

## Запуск

```bash
npm ci
npm run dev
```

Откройте `http://localhost:3000/demo`. Данные демо остаются только в текущем браузере и не подходят для реальных контактов.

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Будущий cloud mode

1. Скопируйте `.env.example` в `.env.local` и заполните только public URL/publishable key Supabase и canonical site URL.
2. Примените `supabase/migrations` сначала к отдельному disposable-проекту.
3. Реализуйте SSR-сессии и серверные DTO/actions по `ARCHITECTURE.md`.
4. До production обязательно выполните RLS/Auth matrix из `THREAT_MODEL.md`: два tenant, owner/manager/viewer, forged IDs, revoked membership, audit immutability и optimistic conflict.

Service role key не нужен приложению и не должен попадать в репозиторий или клиентский bundle. На текущем этапе Auth/RLS интеграционные проверки помечаются **NOT RUN**: облачный проект не настроен.

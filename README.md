# Relay CRM

Relay — компактная русскоязычная CRM для фрилансера или небольшой студии.

## Два явных режима

### `/demo` — локальное портфолио-демо

- dashboard, клиенты, заявки, поиск и фильтры;
- разрешённые переходы статусов, архив/восстановление, заметки и audit log;
- вымышленные seed-данные и версионированное Zod-валидируемое localStorage;
- восстановление повреждённого хранилища и подтверждённый reset;
- клавиши `N`, `/`, `Escape`, мобильная вёрстка и доступные native controls.

Изменения демо остаются в браузере и не предназначены для реальных контактов.

### `/app` — Supabase cloud slice

Без корректных public env приложение показывает явное состояние конфигурации и не подменяет cloud mode демо-данными. При настроенном env доступны:

- password login, signup и нейтральное password recovery сообщение;
- PKCE recovery через allowlisted callback, защищённую `/app/recover` и серверное обновление пароля;
- allowlisted auth callback и официальный cookie refresh через Next.js 16 `proxy.ts`;
- проверка claims перед server-side reads и свежий `getUser()` перед bootstrap mutation;
- создание первого workspace через ограниченный SQL RPC;
- защищённый shell с server-side typed reads dashboard/clients/inquiries;
- logout через Server Action.

Приложение использует только browser-safe Supabase URL и publishable key. Административный ключ не требуется.

## Запуск и проверки

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --omit=dev
```

Скопируйте `.env.example` в `.env.local`. Укажите точный `NEXT_PUBLIC_SITE_URL` и добавьте `${NEXT_PUBLIC_SITE_URL}/auth/callback` в разрешённые Supabase redirect URLs.

## Database gate

`supabase/migrations` содержит additive schema, composite tenant FK, RLS, optimistic guards, audit triggers и confirmed-email bootstrap. Миграцию сначала применяют к disposable-проекту.

Live-проект Supabase `Relay CRM` подключён к production-домену. Схема применена транзакционно и проверена: 6 CRM-таблиц, RLS включён на всех 6 таблицах, активны 11 политик и 8 функций; право `DELETE` для роли `authenticated` отсутствует. Обратная миграция хранится в `supabase/rollback/202609070001_initial.down.sql` и перед применением прошла транзакционную репетицию `UP → DOWN → ROLLBACK` без остаточных объектов.

До ввода реальных данных остаются runtime-проверки с тестовыми аккаунтами: login delivery, authenticated persistence между сессиями, два tenant, owner/manager/viewer, forged IDs, membership revocation, audit immutability/transaction rollback и optimistic conflict.

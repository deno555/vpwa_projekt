# ChatDB - MySQL Databáza pre VPWA Chat

Tento priečinok obsahuje kompletnú definíciu a konfiguráciu MySQL databázy pre chatovú aplikáciu, vytvorenú presne podľa UML diagramu logického dátového modelu.

---

## 🚀 Spustenie databázy cez Docker

Najjednoduchší spôsob spustenia MySQL databázy je pomocou priloženého Docker Compose:

```bash
cd database/chatDB
docker compose up -d
```

Týmto sa automaticky spustia dva kontajnery:
1. **`chat_mysql` (MySQL 8.0)** – beží na porte `3306`
   - Automaticky naimportuje a inicializuje schému zo súboru `init.sql`.
   - Perzistentné dáta sú ukladané vo volume `mysql_data`.
2. **`chat_pma` (phpMyAdmin)** – webové rozhranie bežiace na [http://localhost:8080](http://localhost:8080)

### Zastavenie kontajnerov:
```bash
docker compose down
```

---

## 🔑 Prístupové údaje

| Parameter | Hodnota |
| :--- | :--- |
| **Hostiteľ (Host)** | `127.0.0.1` alebo `localhost` |
| **Port** | `3306` |
| **Názov databázy (Database)** | `chat_db` |
| **Používateľ (User)** | `chat_user` |
| **Heslo (Password)** | `chat_password` |
| **Root heslo (Root Password)** | `rootpassword` |
| **phpMyAdmin URL** | [http://localhost:8080](http://localhost:8080) |

---

## 🗄️ Prehľad tabuliek podľa UML diagramu

1. **`users`**
   - Používateľské účty s atribútmi: `id`, `name`, `surname`, `nickname` (unikátny), `email` (unikátny), `password_hash`, `status` (`ONLINE`, `MENTIONS`, `DND`, `OFFLINE`), `created_at`, `updated_at`.
2. **`teams`**
   - Tímy/servery s atribútmi: `id`, `name`, `admin_id` (správca používateľ), `type` (`PUBLIC`, `PRIVATE`), `created_at`.
3. **`team_members`**
   - M:N väzba medzi používateľmi a tímami (`id`, `team_id`, `user_id`, `joined_at`).
4. **`channels`**
   - Kanály patriace pod tím: `id`, `team_id`, `admin_id`, `name`, `type` (`PUBLIC`, `PRIVATE`), `created_at`, `last_activity_at`.
5. **`channel_members`**
   - Členovia kanála: `id`, `channel_id`, `user_id`, `status` (`INVITED`, `ACTIVE`, `BANNED`), `invited_at`, `joined_at`.
6. **`channel_kick_votes`**
   - Hlasovania o vyhodení: `id`, `channel_id`, `voter_id` (kto hlasoval), `target_user_id` (kto má byť vyhodený), `created_at`.
7. **`messages`**
   - Správy: `id`, `channel_id`, `author_id`, `content`, `is_system`, `created_at`.
8. **`message_mentions`**
   - M:N väzba označení používateľov v správach: `id`, `message_id`, `user_id`, `created_at`.
9. **`auth_access_tokens`**
   - Tabuľka pre tokeny prihlasovania v AdonisJS API (`@adonisjs/auth`).


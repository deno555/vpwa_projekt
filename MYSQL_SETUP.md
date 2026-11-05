# Installing MySQL (MariaDB) for the chat project

This guide installs MariaDB on Windows and connects the chat backend to it. It takes about 15 minutes.

## Before you start

You need Windows 10 or 11, administrator rights, and Node.js already installed.

We use **MariaDB**, a free, drop-in replacement for MySQL. Its commands are still called `mysql`, and the backend's `mysql2` driver works with it unchanged. If you already have Oracle's MySQL Server installed, you can use that instead: skip to [Step 3](#step-3-check-that-it-works).

## Step 1: Download the installer

1. Go to <https://mariadb.org/download/>.
2. Choose the latest **stable** release, operating system **MS Windows (64-bit)**, package type **MSI Package**.
3. Click **Download** and save the `.msi` file.

## Step 2: Run the installer

Open the `.msi` file and go through the screens:

1. **Welcome / License:** accept and click **Next**.
2. **Custom Setup:** leave the defaults. Make sure **HeidiSQL** is selected if you want a graphical tool for browsing the database.
3. **Default instance properties:**
    - Tick **Modify password for database user 'root'** and choose a password. **Write it down**; you need it in Step 5.
    - Leave **Enable access from remote machines for 'root' user** unticked.
    - Tick **Use UTF8 as default server's character set**.
4. **Default instance properties (service):**
    - Leave **Install as service** ticked, with the service name `MariaDB`. This starts the database automatically with Windows.
    - Leave **Enable networking** ticked, with TCP port `3306`.
5. Click **Install**, approve the Windows admin prompt, then **Finish**.

## Step 3: Check that it works

Open a **new** terminal (PowerShell or Command Prompt) so it picks up the updated PATH, then run:

```
mysql --version
mysql -u root -p
```

The second command asks for the root password. If you see a `MariaDB [(none)]>` prompt, it works. Type `EXIT;` to leave.

## Step 4: Create the chat database

Log in with `mysql -u root -p` and run:

```sql
CREATE DATABASE chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

`utf8mb4` makes sure emoji and special characters in messages are stored correctly.

## Step 5: Connect the project

In a terminal, go to the backend folder of the project:

```
cd backend/chatBE
npm install
copy .env.example .env
```

Open the new `.env` file and set your database password:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-root-password
DB_DATABASE=chat
```

Then generate the app key, create the tables, and start the server:

```
node ace generate:key
node ace migration:run
npm run dev
```

`migration:run` should end with `Migrated in ... ms`. The backend then runs on <http://localhost:3333>.

Never commit `.env`; it holds your password and is already in `.gitignore`.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| `'mysql' is not recognized as an internal or external command` | Open a new terminal. If it still fails, add `C:\Program Files\MariaDB <version>\bin` to your PATH, or run `mysql.exe` from that folder. |
| `ERROR 1045 (28000): Access denied for user 'root'@'localhost'` | Wrong password. Check `DB_PASSWORD` in `.env` matches the one from Step 2, or see the reset steps below. |
| `connect ECONNREFUSED 127.0.0.1:3306` | The database isn't running. In an administrator terminal run `net start MariaDB`, or start **MariaDB** in the Windows **Services** app. |
| Installer says port 3306 is already in use | Another MySQL is already installed. Either use that one, or pick port `3307` in the installer and set `DB_PORT=3307` in `.env`. |
| `Unknown database 'chat'` | Step 4 was skipped. Create the database, then run `node ace migration:run` again. |
| `Missing environment variable "APP_KEY"` or similar | Run `node ace generate:key` in `backend/chatBE`, and check `.env` was copied from `.env.example`. |

## Forgot the root password

1. Open an **administrator** terminal and stop the service: `net stop MariaDB`.
2. Start the server without password checks: `mysqld --skip-grant-tables`. Leave this window open.
3. In a second terminal, run `mysql -u root` and then:

    ```sql
    FLUSH PRIVILEGES;
    ALTER USER 'root'@'localhost' IDENTIFIED BY 'new-password';
    EXIT;
    ```

4. Close the `mysqld` window, then run `net start MariaDB`.
5. Put the new password in `DB_PASSWORD` in `.env`.

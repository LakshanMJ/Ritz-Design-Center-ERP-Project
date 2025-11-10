### Internal ERP System (Private Project)
**Role:** Software Developer  
**Stack:** React, Python, PostgreSQL  

Contributed to the development of an internal ERP platform designed to streamline company operations such as inventory, HR, and finance.  
Implemented core modules for user authentication, role-based access control, and data visualization dashboards.  
Focused on optimizing REST API performance and improving frontend responsiveness.


# Inventory App - Setup Guide

This guide will help you set up, run, and access your ERP System from the repository:

[https://github.com/LakshanMJ/Ritz-Design-Center-ERP-Project](https://github.com/LakshanMJ/Ritz-Design-Center-ERP-Project)

---

## Table of Contents

1. [Requirements](#requirements)
2. [Clone the Repository](#clone)
3. [Install Dependencies](#install-deps)
4. [Environment Setup](#env)
5. [Database Setup](#db)
6. [Run Migrations](#migrate)
7. [Start Backend Server](#start-backend-server)  
8. [Start Frontend Server](#start-frontend-server)
10. [Access the Application](#access)
11. [Admin Login (Demo Credentials)](#admin-login-demo-credentials)
12. [Sample Data](#sample-data)  
13. [Sample Product Images](#images)
14. [Troubleshooting](#troubleshooting)

---

## 1. Requirements <a name="requirements"></a>

- PHP >= 8.x
- Composer
- Node.js & npm
- A database (MySQL, SQLite, etc.)

---

## 2. Clone the Repository <a name="clone"></a>

```bash
git clone https://github.com/AnujaLd/inventory-app.git
cd inventory-app
```

---

## 3. Install Dependencies <a name="install-deps"></a>

Install PHP dependencies:

```bash
composer install
```

Install Node.js dependencies:

```bash
npm install
```

---

## 4. Environment Setup <a name="env"></a>

Copy the example environment file and generate your app key:

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` to set your database credentials and other configuration.

---

## 5. Database Setup <a name="db"></a>

Edit the `.env` file to match your database settings:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_db
DB_USERNAME=your_user
DB_PASSWORD=your_password
```

Create the database if it does not exist.

---

## 6. Run Migrations <a name="migrate"></a>

```bash
php artisan migrate
```

---

## 7. Build Frontend Assets <a name="frontend"></a>

If the project uses Laravel Mix or Vite:

```bash
npm run build
# or, for development
npm run dev
```

---

## 8. Start the Server <a name="server"></a>

```bash
php artisan serve
```

By default, it runs at [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## 9. Access the Application <a name="access"></a>

- Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
- You will see the home/welcome page.

---

## 10. Register, Login, and Go to Dashboard <a name="userflow"></a>

### Register

- Click **Register** or go to [http://127.0.0.1:8000/register](http://127.0.0.1:8000/register).
- Fill out the registration form.
- Submit to create your account.

### Login

- Go to [http://127.0.0.1:8000/login](http://127.0.0.1:8000/login).
- Enter your credentials.
- Submit to log in.

### Access Dashboard

- After login, you are redirected to the dashboard (http://127.0.0.1:8000/dashboard).
- You now see the Inventory Dashboard UI.

---

## 12. Troubleshooting <a name="troubleshooting"></a>

- **Permissions Issues**:  
  Run `chmod -R 775 storage bootstrap/cache` if you get permission errors.
- **Missing .env**:  
  Copy `.env.example` as described above.
- **Images Not Showing**:  
  Ensure product images are in `public/images/`.
- **Assets Not Loading**:  
  Run `npm install` and `npm run dev`.

---

## Flow Summary

1. Clone repo & install dependencies.
2. Configure `.env` and database.
3. Run migrations & build assets.
4. Start server, visit home.
5. Register, login, and enjoy the dashboard!

---

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
9. [Access the Application](#access)
10. [Admin Login (Demo Credentials)](#admin-login) 
11. [Sample Product Images](#images)
12. [Troubleshooting](#troubleshooting)

---

## 1. Requirements <a name="requirements"></a>

- Python >= 3.10  
- Node.js & npm  
- Django >= 4.x  
- React (create-react-app or Next.js)  
- A database (SQLite included, or MySQL/PostgreSQL)  

---

## 2. Clone the Repository <a name="clone"></a>

```bash
git clone https://github.com/LakshanMJ/Ritz-Design-Center-ERP-Project.git
cd Ritz-Design-Center-ERP-Project
```

---

## 3. Install Dependencies <a name="install-deps"></a>

Backend (Django) dependencies:

```bash
python -m venv env          # create virtual environment
source env/bin/activate     # mac/linux
# OR
env\Scripts\activate        # windows
pip install -r backend/requirements.txt
```

Frontend (React / Next.js) dependencies:

```bash
cd frontend
npm install
cd ..
```

---

## 4. Environment Setup <a name="env"></a>

1. Copy the example environment file:

```bash
cp backend/.env.example backend/.env
```

2. Edit .env to set your database credentials and Django secret key.
Example (.env):

```bash
DJANGO_SECRET_KEY=your_secret_key
DJANGO_DEBUG=True
DB_NAME=erp_db
DB_USER=erp_user
DB_PASSWORD=erp123
DB_HOST=localhost
DB_PORT=5432
```

---

## 5. Database Setup <a name="db"></a>

If using SQLite, no extra setup is required.
If using PostgreSQL/MySQL, create the database and user as per .env.

---

## 6. Run Migrations <a name="migrate"></a>

```bash
cd backend
python manage.py migrate
```

---

## 7. Start Backend Server <a name="start-backend-server"></a>

```bash
python manage.py runserver
```

---

## 8. Start Frontend Server <a name="start-frontend-server"></a>

```bash
cd frontend
npm start
```

By default, it runs at [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## 9. Access the Application <a name="access"></a>

- Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
- You will see the ERP login screen.

---

## 10. Admin Login (Demo Credentials) <a name="admin-login"></a>
- Since this is a demo ERP, the admin user is pre-created in the database:
    | Role  | Username |   Password  |
    | ----- | -------- | ----------- |
    | Admin | admin    | admin@12345 |

- Login using these credentials to access the Admin Dashboard.
- Admin can create users and manage the ERP system.

---

## 11. Sample Product Images <a name="images"></a>

---

## 12. Troubleshooting <a name="troubleshooting"></a>

- **Server not starting**:  
  Ensure virtual environment is active and dependencies installed.
- **Frontend not loading**:  
  Check npm install completed successfully.
- **Database connection errors**:  
  Make sure .env matches your DB credentials.
- **Migrations errors**:  
  Delete db.sqlite3 and run python manage.py migrate again (if using SQLite).

---

## Flow Summary

1. Clone repo & install backend/frontend dependencies.
2. Copy .env.example → .env and update credentials.
3. Run Django migrations.
4. Start backend and frontend servers.
5. Open frontend, login as admin/admin@12345, explore ERP dashboard.

---

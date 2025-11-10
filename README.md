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
6. [Start Backend Server](#start-backend-server)  
7. [Start Frontend Server](#start-frontend-server)
8. [Access the Application](#access)
9. [Admin Login (Demo Credentials)](#admin-login) 
10. [Sample Product Images](#images)
11. [Troubleshooting](#troubleshooting)

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
pip install -r erp-backend-dev/requirements.txt
```

Frontend (React / Next.js) dependencies:

```bash
cd erp-frontend-dev
yarn install
cd ..
```

---

## 4. Environment Setup <a name="env"></a>

- This project uses the preconfigured settings file:
`ritzerp/settings/lakshan_dev.py`

It already contains:
- SECRET_KEY
- DEBUG=True
- DATABASES connection info
- Allowed hosts
- REST framework and JWT config

No `.env` file is required for local development.
---

## 5. Database Setup <a name="db"></a>

This project uses PostgreSQL with the database `DummyDB`.  

- The connection details are already in the settings file.
- Make sure PostgreSQL is running locally.
- The database comes with dummy data, so no migrations are required for initial setup.

---

## 6. Start Backend Server <a name="start-backend-server"></a>

```bash
python manage.py runserver
```

---

## 7. Start Frontend Server <a name="start-frontend-server"></a>

```bash
cd frontend
yarn dev
```

---

## 8. Access the Application <a name="access"></a>

- Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
- You will see the ERP login screen.

---

## 9. Admin Login (Demo Credentials) <a name="admin-login"></a>
- Since this is a demo ERP, the admin user is pre-created in the database:
    | Role  | Username |   Password  |
    | ----- | -------- | ----------- |
    | Admin | admin    | admin@12345 |

- Login using these credentials to access the Admin Dashboard.
- Admin can create users and manage the ERP system.

---

## 10. Sample Product Images <a name="images"></a>

---

## 11. Troubleshooting <a name="troubleshooting"></a>

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

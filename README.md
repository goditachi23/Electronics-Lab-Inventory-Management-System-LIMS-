# 🚀 Unstop Project

A full-stack web application to manage users, components, and real-time notifications through a secure and responsive dashboard interface.

---

## 📌 Project Overview

Unstop Project is designed to demonstrate a production-ready admin dashboard with user authentication, component management, and a notification system. It supports role-based access and aims to offer modularity, scalability, and ease of maintenance.

---

## 🛠️ Technology Stack

| Layer       | Technology            |
|------------|------------------------|
| Frontend   | HTML, CSS, JavaScript |
| Backend    | Node.js, Express.js   |
| Database   | MongoDB (Mongoose ORM)|
| Auth       | JWT (JSON Web Tokens) |
| Hosting    | Localhost/Custom      |

---

## 🏗️ Architecture Overview

Client (HTML + JS)
↓
Express Server (Node.js)
↓
MongoDB (Mongoose)


- **Modular Folder Structure**: Clear separation of backend logic, models, middleware, and routes.
- **JWT Auth**: Secure access control and route protection.
- **Role-based Access**: Admin/User logic built-in.

---

## 📷 Screenshots

> You can capture and replace these placeholders with real UI screenshots or GIFs stored in `assets/screenshots/`.

| Login Page | Dashboard | Notifications |
|------------|-----------|----------------|
| ![Login](<img width="492" height="559" alt="Screenshot 2025-08-03 191928" src="https://github.com/user-attachments/assets/f03917b4-7df9-4b40-936d-49112a929917" />
) 
| ![Dashboard](<img width="1360" height="690" alt="Screenshot 2025-08-03 192001" src="https://github.com/user-attachments/assets/8503f96a-e2f8-40c7-9c3d-9a90cf4a767b" />
)
| ![Notifications](<img width="1350" height="688" alt="Screenshot 2025-08-03 192030" src="https://github.com/user-attachments/assets/cc70f5dc-d1be-45c8-b9ec-5dd1a2916fbc" />
) |

---

## 🧪 Key Features

### ✅ Authentication System
- User registration and login using JWT tokens
- Passwords hashed using bcrypt

### 📦 Component Management
- Add, view, and delete components (admin only)

### 🔔 Notification System
- Users receive alerts
- Admins can create new notifications

### 📊 Dashboard Interface
- Visual layout for quick interactions
- Displays user data and status

### 🧑‍🤝‍🧑 Role Management
- **Admin**: Full access
- **User**: Restricted access

---

## 🧰 Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd "Unstop Project/backend"



 Install Dependencies

npm install
3. Set Environment Variables

Create a .env file inside the backend folder with:

PORT=5000
MONGO_URI=mongodb://localhost:27017/unstop
JWT_SECRET=your_jwt_secret

4. Start the Backend Server

node server.js
5. Open the Frontend
Open index.html or dashboard.html in your browser.


📡 API Overview
Auth APIs
Method	Endpoint	Description
POST	/api/auth/login	Authenticate user
POST	/api/auth/register	Register new user

Component APIs
Method	Endpoint	Description
GET	/api/components	Get all components
POST	/api/components	Create new component
DELETE	/api/components/:id	Delete component

Notification APIs
Method	Endpoint	Description
GET	/api/notifications	Get notifications
POST	/api/notifications	Post new notification


🧬 Database Schema

User
{
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}

Component
{
  name: String,
  description: String,
  version: String,
  createdAt: { type: Date, default: Date.now }
}

Notification
{
  message: String,
  type: String,
  createdAt: { type: Date, default: Date.now }
}

🔐 User Roles
Admin
Full CRUD access to components and notifications

Can manage users and settings

User
Can view components and notifications

Cannot modify data

To assign roles, manually set role: 'admin' in the users collection.

⚠️ Known Limitations
No UI-based role management or settings panel yet

Frontend is static HTML, not using React/Vue or SPA framework

No real-time updates (e.g., sockets) for notifications

Minimal input validation on frontend

🚀 Future Improvements
Convert frontend into React or Vue SPA

Add image upload or avatars for users

Add Socket.IO for real-time notifications

Admin panel to manage roles and audit logs

Improve UI/UX with responsive framework (e.g., Bootstrap/Tailwind)

📬 Contact
Created by [Your Name] – feel free to reach out via email: vedanshgupta00@gmail.com

🏁 License
MIT License



Here is the full video link Of this inventory system working: https://youtu.be/cU_C44I-g7g

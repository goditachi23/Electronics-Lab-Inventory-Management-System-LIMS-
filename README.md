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
| ![Login](<img width="492" height="559" alt="image" src="https://github.com/user-attachments/assets/cebbd859-525c-4f5f-8e71-4c2815a07dac" />) 
| ![Dashboard](<img width="1360" height="690" alt="image" src="https://github.com/user-attachments/assets/49c9c664-ed51-49e9-b157-3eaf3748ddf9" />)
| ![Notifications](<img width="1350" height="688" alt="image" src="https://github.com/user-attachments/assets/5eaca10b-b475-42c0-9089-df0e2d9157e3" />) |

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
MIT License – feel free to use and adapt.

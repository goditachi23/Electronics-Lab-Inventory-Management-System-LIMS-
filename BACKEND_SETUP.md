# Backend Setup Instructions

This guide will help you set up the Node.js backend server to connect your Electronics Inventory Management System with MongoDB.

## 🚀 Quick Setup

### Step 1: Install Node.js
1. Download and install Node.js from [nodejs.org](https://nodejs.org/) (version 14 or higher)
2. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Step 2: Setup Environment Variables
1. Navigate to the `backend` folder
2. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```
3. Edit the `.env` file with your settings:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://vedanshgupta00:Gixxersf@123@inventorymngmnt.jjhnxij.mongodb.net/electronics_inventory

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # JWT Configuration (CHANGE THIS!)
   JWT_SECRET=your_super_secret_jwt_key_make_this_very_long_and_random_12345
   JWT_EXPIRE=7d

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,file://

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

### Step 3: Install Dependencies
```bash
cd backend
npm install
```

### Step 4: Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

### Step 5: Verify Setup
1. Open your browser and go to: `http://localhost:5000/health`
2. You should see:
   ```json
   {
     "success": true,
     "message": "Electronics Inventory API is running",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "environment": "development"
   }
   ```

### Step 6: Update Frontend
1. Add the API client script to your HTML files:
   ```html
   <!-- Add before other scripts -->
   <script src="js/api.js"></script>
   <script src="js/auth-api.js"></script>
   ```

2. Update your existing HTML files to use the new API-based authentication:
   - Replace `js/auth.js` with `js/auth-api.js` in script tags
   - The API client will automatically handle authentication

## 📁 Project Structure

```
backend/
├── models/
│   ├── User.js          # User schema and methods
│   ├── Component.js     # Component schema and methods
│   └── Notification.js  # Notification schema and methods
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── users.js         # User management routes
│   ├── components.js    # Component CRUD routes
│   ├── movements.js     # Stock movement routes
│   └── notifications.js # Notification routes
├── middleware/
│   └── auth.js          # Authentication middleware
├── config/
│   └── database.js      # MongoDB connection
├── package.json         # Dependencies and scripts
├── server.js           # Main server file
└── .env                # Environment variables (create this)
```

## 🔐 Default Users

The system automatically creates these users on first run:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| Admin | admin | admin123 | Full system access |
| User | user | user123 | Lab Technician |
| Researcher | researcher | research123 | Read-only access |
| Engineer | engineer | engineer123 | View and outward operations |

**⚠️ IMPORTANT:** Change these passwords in production!

## 🗄️ MongoDB Setup

Your MongoDB connection string is already configured:
```
mongodb+srv://vedanshgupta00:Gixxersf@123@inventorymngmnt.jjhnxij.mongodb.net/electronics_inventory
```

The system will automatically:
- Create required collections
- Set up indexes for performance
- Seed initial data (users and sample components)

### Collections Created:
- `users` - User accounts and permissions
- `components` - Electronics components inventory
- `notifications` - System notifications and alerts

## 🔧 Configuration Options

### JWT Security
- Change `JWT_SECRET` to a long, random string (recommended: 64+ characters)
- Adjust `JWT_EXPIRE` for token expiration (default: 7 days)

### CORS Settings
- Add your frontend URLs to `FRONTEND_URL` (comma-separated)
- For local development: `http://localhost:3000,http://127.0.0.1:5500`
- For production: Add your domain

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Components
- `GET /api/components` - Get all components (with filtering)
- `POST /api/components` - Create component
- `GET /api/components/:id` - Get component by ID
- `PUT /api/components/:id` - Update component
- `DELETE /api/components/:id` - Delete component
- `GET /api/components/stats/summary` - Get inventory statistics

### Stock Movements
- `POST /api/movements/inward` - Add stock
- `POST /api/movements/outward` - Remove stock
- `GET /api/movements/history/:componentId` - Movement history
- `GET /api/movements/recent` - Recent movements
- `GET /api/movements/statistics` - Movement statistics

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/check-alerts` - Check for alerts

### User Management (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🔍 Testing the API

### Using curl:
```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"admin"}'

# Get components (with token)
curl -X GET http://localhost:5000/api/components \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using the Frontend:
1. Open your `index.html` file
2. Login with demo credentials
3. The frontend will automatically use the API

## 🔧 Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed**
   - Check your internet connection
   - Verify the MongoDB URI is correct
   - Ensure your IP is whitelisted in MongoDB Atlas

2. **CORS Errors**
   - Add your frontend URL to `FRONTEND_URL` in `.env`
   - Include `file://` for local HTML files

3. **Authentication Errors**
   - Clear browser storage (localStorage)
   - Check JWT_SECRET is set correctly
   - Ensure token hasn't expired

4. **Port Already in Use**
   - Change PORT in `.env` file
   - Or stop other processes using port 5000

5. **Dependencies Issues**
   - Delete `node_modules` and run `npm install` again
   - Ensure Node.js version is 14 or higher

### Debug Mode:
```bash
# Enable detailed logging
NODE_ENV=development npm run dev
```

## 🔄 Frontend Integration

Your frontend will automatically:
- Store JWT tokens securely
- Handle authentication state
- Make API calls instead of using localStorage
- Manage user sessions and permissions

### Key Changes:
1. Data is now stored in MongoDB (persistent across devices)
2. Real-time notifications work across users
3. Proper user management and permissions
4. Secure authentication with JWT tokens
5. API-based architecture ready for scaling

## 🚀 Next Steps

1. **Test the System**: Login and test all features
2. **Change Passwords**: Update default passwords
3. **Configure Alerts**: Set up automatic stock alerts
4. **Custom Categories**: Add your specific component categories
5. **Data Import**: Import your existing inventory data
6. **Production Deploy**: Deploy to a cloud service when ready

## 📞 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify your MongoDB connection
3. Ensure all environment variables are set correctly
4. Check that the server is running on the correct port

Your Electronics Inventory Management System is now connected to MongoDB and ready for production use! 🎉
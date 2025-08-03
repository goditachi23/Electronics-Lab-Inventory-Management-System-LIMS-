require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import database connection
const connectDB = require('./config/database');

// Import route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const componentRoutes = require('./routes/components');
const movementRoutes = require('./routes/movements');
const notificationRoutes = require('./routes/notifications');

// Import models for initial data seeding
const User = require('./models/User');
const Component = require('./models/Component');

const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// CORS configuration - More permissive for development
const corsOptions = {
    origin: function (origin, callback) {
        console.log(`🌐 CORS request from origin: ${origin || 'null'}`);
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow file:// protocol for local HTML files
        if (origin && origin.startsWith('file://')) {
            console.log('✅ Allowing file:// origin');
            return callback(null, true);
        }
        
        // Allow null origin (some browsers send this for file://)
        if (origin === 'null') {
            console.log('✅ Allowing null origin');
            return callback(null, true);
        }
        
        const allowedOrigins = process.env.FRONTEND_URL ? 
            process.env.FRONTEND_URL.split(',') : 
            ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'];
            
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log('✅ Allowing known origin');
            callback(null, true);
        } else {
            console.log(`🚫 CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Electronics Inventory API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static files from frontend (if in production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('../'));
    
    app.get('*', (req, res) => {
        res.sendFile(require('path').resolve(__dirname, '../index.html'));
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
            success: false,
            message: `${field} already exists`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation'
        });
    }

    // Default error
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Seed initial data function
async function seedInitialData() {
    try {
        // Check if admin user exists
        const adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
            console.log('Seeding initial admin user...');
            
            const admin = new User({
                username: 'admin',
                password: 'admin123',
                name: 'System Administrator',
                email: 'admin@company.com',
                role: 'admin'
            });
            
            await admin.save();
            console.log('✅ Admin user created successfully');

            // Create other demo users
            const demoUsers = [
                {
                    username: 'user',
                    password: 'user123',
                    name: 'Lab Technician',
                    email: 'tech@company.com',
                    role: 'user',
                    createdBy: admin._id
                },
                {
                    username: 'researcher',
                    password: 'research123',
                    name: 'Research Scientist',
                    email: 'researcher@company.com',
                    role: 'researcher',
                    createdBy: admin._id
                },
                {
                    username: 'engineer',
                    password: 'engineer123',
                    name: 'Manufacturing Engineer',
                    email: 'engineer@company.com',
                    role: 'engineer',
                    createdBy: admin._id
                }
            ];

            for (const userData of demoUsers) {
                const user = new User(userData);
                await user.save();
            }
            
            console.log('✅ Demo users created successfully');
        }

        // Check if sample components exist
        const componentCount = await Component.countDocuments();
        
        if (componentCount === 0) {
            console.log('Seeding sample components...');
            
            const adminUser = await User.findOne({ role: 'admin' });
            
            const sampleComponents = [
                {
                    name: 'Ceramic Capacitor 10nF',
                    partNumber: 'GRM188R71C103KA01D',
                    manufacturer: 'Murata',
                    description: '10nF ±10% 16V Ceramic Capacitor X7R 0603',
                    category: 'Passive Components',
                    quantity: 1500,
                    location: 'A1-B2',
                    unitPrice: 10,
                    criticalLowThreshold: 100,
                    datasheetLink: 'https://www.murata.com/products/capacitor',
                    createdBy: adminUser._id
                },
                {
                    name: 'Resistor 10kΩ',
                    partNumber: 'RC0603FR-0710KL',
                    manufacturer: 'Yageo',
                    description: '10kΩ ±1% 0.1W Thick Film Resistor 0603',
                    category: 'Passive Components',
                    quantity: 25,
                    location: 'A2-B1',
                    unitPrice: 7,
                    criticalLowThreshold: 50,
                    datasheetLink: 'https://www.yageo.com/resistors',
                    createdBy: adminUser._id
                },
                {
                    name: 'ARM Cortex-M4 MCU',
                    partNumber: 'STM32F411CEU6',
                    manufacturer: 'STMicroelectronics',
                    description: 'ARM Cortex-M4 32-bit MCU, 512KB Flash, 128KB SRAM',
                    category: 'Microcontrollers',
                    quantity: 45,
                    location: 'B1-A3',
                    unitPrice: 706,
                    criticalLowThreshold: 20,
                    datasheetLink: 'https://www.st.com/stm32f411',
                    createdBy: adminUser._id
                },
                {
                    name: 'Temperature Sensor',
                    partNumber: 'LM75BIM-3',
                    manufacturer: 'Texas Instruments',
                    description: 'Digital Temperature Sensor ±2°C I2C SOIC-8',
                    category: 'Sensors',
                    quantity: 32,
                    location: 'D1-B1',
                    unitPrice: 174,
                    criticalLowThreshold: 10,
                    datasheetLink: 'https://www.ti.com/sensors',
                    createdBy: adminUser._id
                },
                {
                    name: 'EEPROM 24LC256',
                    partNumber: '24LC256-I/SN',
                    manufacturer: 'Microchip',
                    description: '256Kbit I2C Serial EEPROM SOIC-8',
                    category: 'Memory',
                    quantity: 12,
                    location: 'D2-C2',
                    unitPrice: 154,
                    criticalLowThreshold: 20,
                    datasheetLink: 'https://www.microchip.com/eeprom',
                    createdBy: adminUser._id
                }
            ];

            for (const componentData of sampleComponents) {
                const component = new Component(componentData);
                await component.save();
            }
            
            console.log('✅ Sample components created successfully');
        }

    } catch (error) {
        console.error('❌ Error seeding initial data:', error);
    }
}

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    
    // Seed initial data
    await seedInitialData();
    
    console.log('📊 Electronics Inventory Management API is ready!');
    console.log(`💾 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

module.exports = app;
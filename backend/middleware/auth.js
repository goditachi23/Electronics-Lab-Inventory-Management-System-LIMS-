const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate JWT token
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid - user not found'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

// Middleware to check permissions
const authorize = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userPermissions = req.user.getPermissions();
        
        // Admin has all permissions
        if (userPermissions.includes('all')) {
            return next();
        }

        // Check if user has any of the required permissions
        const hasPermission = permissions.some(permission => 
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required permissions: ${permissions.join(', ')}`
            });
        }

        next();
    };
};

// Middleware to check roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Middleware to allow users to access their own data or admin to access any data
const ownDataOrAdmin = (req, res, next) => {
    const requestedUserId = req.params.userId || req.params.id;
    
    if (req.user.role === 'admin' || req.user._id.toString() === requestedUserId) {
        return next();
    }
    
    return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data'
    });
};

// Utility function to generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE || '7d'
        }
    );
};

// Utility function to set token in cookie (if using cookies)
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = generateToken(user._id);

    res.status(statusCode).json({
        success: true,
        message,
        token,
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.getPermissions()
        }
    });
};

module.exports = {
    authenticate,
    authorize,
    restrictTo,
    adminOnly,
    ownDataOrAdmin,
    generateToken,
    sendTokenResponse
};
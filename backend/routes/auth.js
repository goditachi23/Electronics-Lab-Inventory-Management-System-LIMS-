const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendTokenResponse, authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    body('role')
        .optional()
        .isIn(['admin', 'user', 'researcher', 'engineer'])
        .withMessage('Invalid role')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, password, role } = req.body;

        // Find user by username
        const user = await User.findOne({ 
            username: username.toLowerCase(),
            isActive: true 
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check role if provided
        if (role && user.role !== role) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials for selected role'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Send token response
        sendTokenResponse(user, 200, res, 'Login successful');

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private/Admin
router.post('/register', authenticate, [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage('Username can only contain letters, numbers, dots, underscores, and hyphens'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name is required and cannot exceed 100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('role')
        .isIn(['admin', 'user', 'researcher', 'engineer'])
        .withMessage('Invalid role')
], async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can register new users'
            });
        }

        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, password, name, email, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this username or email already exists'
            });
        }

        // Create user
        const user = new User({
            username: username.toLowerCase(),
            password,
            name,
            email: email.toLowerCase(),
            role,
            createdBy: req.user._id
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.getPermissions()
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            permissions: req.user.getPermissions(),
            lastLogin: req.user.lastLogin
        }
    });
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name cannot exceed 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();

        // Check if email is already taken by another user
        if (email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user._id }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already taken'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.getPermissions()
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during profile update'
        });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticate, [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user._id);

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password change'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (mainly for logging purposes)
// @access  Private
router.post('/logout', authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
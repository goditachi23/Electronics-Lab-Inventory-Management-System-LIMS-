const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize, adminOnly } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', authenticate, adminOnly, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(['admin', 'user', 'researcher', 'engineer']).withMessage('Invalid role'),
    query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search query too long')
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

        const {
            page = 1,
            limit = 20,
            role,
            isActive,
            search,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        // Build filter
        const filter = {};
        
        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const users = await User.find(filter)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'name username')
            .select('-password');

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Own profile or Admin)
router.get('/:id', authenticate, async (req, res) => {
    try {
        // Check if user is accessing their own profile or is admin
        if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own profile'
            });
        }

        const user = await User.findById(req.params.id)
            .populate('createdBy', 'name username')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user'
        });
    }
});

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private/Admin
router.post('/', authenticate, adminOnly, [
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
        .withMessage('Invalid role'),
    body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array')
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

        const { username, password, name, email, role, permissions } = req.body;

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
            permissions: permissions || [],
            createdBy: req.user._id
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.getPermissions(),
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error while creating user'
        });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Own profile or Admin)
router.put('/:id', authenticate, [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name cannot exceed 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('role')
        .optional()
        .isIn(['admin', 'user', 'researcher', 'engineer'])
        .withMessage('Invalid role'),
    body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be boolean')
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

        const { name, email, role, permissions, isActive } = req.body;
        const isOwnProfile = req.user._id.toString() === req.params.id;
        const isAdmin = req.user.role === 'admin';

        // Check permissions
        if (!isOwnProfile && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own profile'
            });
        }

        // Non-admin users can only update certain fields
        if (!isAdmin && (role || permissions || isActive !== undefined)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins can update role, permissions, or active status'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admins from deactivating themselves
        if (isOwnProfile && isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.params.id }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already taken'
                });
            }
        }

        // Update user
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();
        if (role && isAdmin) updateData.role = role;
        if (permissions && isAdmin) updateData.permissions = permissions;
        if (isActive !== undefined && isAdmin) updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user'
        });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (deactivate)
// @access  Private/Admin
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from deleting themselves
        if (req.user._id.toString() === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Soft delete (deactivate)
        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user'
        });
    }
});

// @route   PUT /api/users/:id/activate
// @desc    Activate user
// @access  Private/Admin
router.put('/:id/activate', authenticate, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = true;
        await user.save();

        res.json({
            success: true,
            message: 'User activated successfully',
            data: {
                id: user._id,
                username: user.username,
                name: user.name,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while activating user'
        });
    }
});

// @route   PUT /api/users/:id/reset-password
// @desc    Reset user password (Admin only)
// @access  Private/Admin
router.put('/:id/reset-password', authenticate, adminOnly, [
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

        const { newPassword } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while resetting password'
        });
    }
});

// @route   GET /api/users/stats/summary
// @desc    Get user statistics (Admin only)
// @access  Private/Admin
router.get('/stats/summary', authenticate, adminOnly, async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: { $cond: ['$isActive', 1, 0] }
                    }
                }
            }
        ]);

        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const recentUsers = await User.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        const roleStats = {};
        stats.forEach(stat => {
            roleStats[stat._id] = {
                total: stat.count,
                active: stat.activeCount
            };
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                inactiveUsers: totalUsers - activeUsers,
                recentUsers,
                roleBreakdown: roleStats
            }
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user statistics'
        });
    }
});

// @route   GET /api/users/:id/activity
// @desc    Get user activity log
// @access  Private (Own activity or Admin)
router.get('/:id/activity', authenticate, async (req, res) => {
    try {
        // Check permissions
        if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own activity'
            });
        }

        const { page = 1, limit = 20 } = req.query;

        // This would typically come from an activity log collection
        // For now, we'll get component movements and created components
        const Component = require('../models/Component');
        
        const activities = await Component.aggregate([
            {
                $match: {
                    $or: [
                        { createdBy: require('mongoose').Types.ObjectId(req.params.id) },
                        { 'movements.user': require('mongoose').Types.ObjectId(req.params.id) }
                    ]
                }
            },
            // Expand movements
            { $unwind: { path: '$movements', preserveNullAndEmptyArrays: true } },
            // Filter movements by user
            {
                $match: {
                    $or: [
                        { createdBy: require('mongoose').Types.ObjectId(req.params.id) },
                        { 'movements.user': require('mongoose').Types.ObjectId(req.params.id) }
                    ]
                }
            },
            // Project activity data
            {
                $project: {
                    activityType: {
                        $cond: [
                            { $eq: ['$movements.user', require('mongoose').Types.ObjectId(req.params.id)] },
                            'movement',
                            'component_created'
                        ]
                    },
                    componentName: '$name',
                    componentPartNumber: '$partNumber',
                    movementType: '$movements.type',
                    quantity: '$movements.quantity',
                    reason: '$movements.reason',
                    project: '$movements.project',
                    activityDate: {
                        $cond: [
                            { $eq: ['$movements.user', require('mongoose').Types.ObjectId(req.params.id)] },
                            '$movements.createdAt',
                            '$createdAt'
                        ]
                    }
                }
            },
            { $sort: { activityDate: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
        ]);

        res.json({
            success: true,
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user activity'
        });
    }
});

module.exports = router;
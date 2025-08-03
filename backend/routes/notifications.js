const express = require('express');
const { query, body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const Component = require('../models/Component');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get notifications for current user
// @access  Private
router.get('/', authenticate, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid notification type'),
    query('category').optional().isIn(['low_stock', 'old_stock', 'stock_movement', 'user_activity', 'system']).withMessage('Invalid category'),
    query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be a boolean'),
    query('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority')
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
            type,
            category,
            unreadOnly = false,
            priority
        } = req.query;

        // Build filter
        const filter = {
            isActive: true,
            expiresAt: { $gt: new Date() },
            $or: [
                { targetUsers: req.user._id },
                { targetRoles: req.user.role }
            ]
        };

        if (type) filter.type = type;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;

        // For unread only, filter out notifications that user has read
        if (unreadOnly === 'true') {
            filter['readBy.user'] = { $ne: req.user._id };
        }

        const notifications = await Notification.find(filter)
            .populate('relatedComponent', 'name partNumber')
            .populate('relatedUser', 'name username')
            .sort({ priority: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const total = await Notification.countDocuments(filter);

        // Add read status for current user
        const notificationsWithStatus = notifications.map(notification => ({
            ...notification,
            isReadByUser: notification.readBy.some(r => r.user.toString() === req.user._id.toString())
        }));

        res.json({
            success: true,
            data: notificationsWithStatus,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching notifications'
        });
    }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count for current user
// @access  Private
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            isActive: true,
            expiresAt: { $gt: new Date() },
            $or: [
                { targetUsers: req.user._id },
                { targetRoles: req.user.role }
            ],
            'readBy.user': { $ne: req.user._id }
        });

        res.json({
            success: true,
            data: { unreadCount: count }
        });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching unread count'
        });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            isActive: true,
            $or: [
                { targetUsers: req.user._id },
                { targetRoles: req.user.role }
            ]
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Check if already read by user
        if (!notification.isReadBy(req.user._id)) {
            notification.markAsRead(req.user._id);
            await notification.save();
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while marking notification as read'
        });
    }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read for current user
// @access  Private
router.put('/mark-all-read', authenticate, async (req, res) => {
    try {
        // Find all unread notifications for user
        const notifications = await Notification.find({
            isActive: true,
            expiresAt: { $gt: new Date() },
            $or: [
                { targetUsers: req.user._id },
                { targetRoles: req.user.role }
            ],
            'readBy.user': { $ne: req.user._id }
        });

        // Mark each as read
        const updatePromises = notifications.map(notification => {
            notification.markAsRead(req.user._id);
            return notification.save();
        });

        await Promise.all(updatePromises);

        res.json({
            success: true,
            message: `Marked ${notifications.length} notifications as read`
        });

    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while marking all notifications as read'
        });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification (soft delete)
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            $or: [
                { targetUsers: req.user._id },
                { targetRoles: req.user.role },
                // Allow admins to delete any notification
                ...(req.user.role === 'admin' ? [{}] : [])
            ]
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Soft delete
        notification.isActive = false;
        await notification.save();

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting notification'
        });
    }
});

// @route   POST /api/notifications/create
// @desc    Create custom notification (Admin only)
// @access  Private/Admin
router.post('/create', authenticate, authorize('all'), [
    body('title')
        .trim()
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Title is required and cannot exceed 200 characters'),
    body('message')
        .trim()
        .notEmpty()
        .isLength({ max: 1000 })
        .withMessage('Message is required and cannot exceed 1000 characters'),
    body('type')
        .isIn(['info', 'warning', 'error', 'success'])
        .withMessage('Invalid notification type'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Invalid priority'),
    body('category')
        .isIn(['low_stock', 'old_stock', 'stock_movement', 'user_activity', 'system'])
        .withMessage('Invalid category'),
    body('targetRoles')
        .optional()
        .isArray()
        .withMessage('Target roles must be an array'),
    body('targetUsers')
        .optional()
        .isArray()
        .withMessage('Target users must be an array')
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

        const notification = new Notification({
            ...req.body,
            relatedUser: req.user._id
        });

        await notification.save();

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            data: notification
        });

    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating notification'
        });
    }
});

// @route   POST /api/notifications/check-alerts
// @desc    Check and create automatic alerts (low stock, old stock)
// @access  Private/Admin
router.post('/check-alerts', authenticate, authorize('all'), async (req, res) => {
    try {
        const alerts = {
            lowStockAlerts: [],
            oldStockAlerts: []
        };

        // Check for low stock components
        const lowStockComponents = await Component.find({
            isActive: true,
            $expr: { $lte: ['$quantity', '$criticalLowThreshold'] }
        });

        for (const component of lowStockComponents) {
            // Check if notification already exists for this component in last 24 hours
            const existingNotification = await Notification.findOne({
                category: 'low_stock',
                'metadata.componentId': component._id.toString(),
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                isActive: true
            });

            if (!existingNotification) {
                const notification = Notification.createLowStockNotification(component);
                await notification.save();
                alerts.lowStockAlerts.push({
                    componentId: component._id,
                    componentName: component.name,
                    partNumber: component.partNumber,
                    currentQuantity: component.quantity,
                    threshold: component.criticalLowThreshold
                });
            }
        }

        // Check for old stock components (no outward movement in 90+ days)
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const components = await Component.find({
            isActive: true,
            createdAt: { $lt: ninetyDaysAgo }
        });

        for (const component of components) {
            const hasRecentOutwardMovement = component.movements.some(movement => 
                movement.type === 'outward' && 
                new Date(movement.createdAt) > ninetyDaysAgo
            );

            if (!hasRecentOutwardMovement) {
                // Check if notification already exists for this component in last 7 days
                const existingNotification = await Notification.findOne({
                    category: 'old_stock',
                    'metadata.componentId': component._id.toString(),
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    isActive: true
                });

                if (!existingNotification) {
                    const daysOld = Math.ceil((new Date() - new Date(component.createdAt)) / (1000 * 60 * 60 * 24));
                    const notification = Notification.createOldStockNotification(component, daysOld);
                    await notification.save();
                    alerts.oldStockAlerts.push({
                        componentId: component._id,
                        componentName: component.name,
                        partNumber: component.partNumber,
                        ageInDays: daysOld
                    });
                }
            }
        }

        res.json({
            success: true,
            message: `Alert check completed. Created ${alerts.lowStockAlerts.length} low stock alerts and ${alerts.oldStockAlerts.length} old stock alerts`,
            data: alerts
        });

    } catch (error) {
        console.error('Check alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while checking alerts'
        });
    }
});

// @route   GET /api/notifications/settings
// @desc    Get notification settings for user
// @access  Private
router.get('/settings', authenticate, async (req, res) => {
    try {
        // For now, return default settings
        // In a real implementation, these would be stored per user
        const settings = {
            lowStockAlerts: true,
            oldStockAlerts: true,
            stockMovements: req.user.role === 'admin',
            userActivity: req.user.role === 'admin',
            emailNotifications: false,
            inAppNotifications: true,
            soundNotifications: false
        };

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('Get notification settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching notification settings'
        });
    }
});

// @route   PUT /api/notifications/settings
// @desc    Update notification settings for user
// @access  Private
router.put('/settings', authenticate, [
    body('lowStockAlerts').optional().isBoolean().withMessage('lowStockAlerts must be boolean'),
    body('oldStockAlerts').optional().isBoolean().withMessage('oldStockAlerts must be boolean'),
    body('stockMovements').optional().isBoolean().withMessage('stockMovements must be boolean'),
    body('userActivity').optional().isBoolean().withMessage('userActivity must be boolean'),
    body('emailNotifications').optional().isBoolean().withMessage('emailNotifications must be boolean'),
    body('inAppNotifications').optional().isBoolean().withMessage('inAppNotifications must be boolean'),
    body('soundNotifications').optional().isBoolean().withMessage('soundNotifications must be boolean')
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

        // In a real implementation, save these settings to user profile or separate settings collection
        // For now, just return success
        
        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            data: req.body
        });

    } catch (error) {
        console.error('Update notification settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating notification settings'
        });
    }
});

module.exports = router;
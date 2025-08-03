const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['info', 'warning', 'error', 'success'],
        default: 'info'
    },
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['low_stock', 'old_stock', 'stock_movement', 'user_activity', 'system'],
        required: true
    },
    relatedComponent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
    },
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    targetRoles: [{
        type: String,
        enum: ['admin', 'user', 'researcher', 'engineer']
    }],
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: function() {
            // Default expiry: 30 days from creation
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
    },
    metadata: {
        componentId: String,
        componentName: String,
        componentPartNumber: String,
        oldQuantity: Number,
        newQuantity: Number,
        threshold: Number,
        movementType: String,
        project: String
    }
}, {
    timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ type: 1, priority: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ targetUsers: 1 });
notificationSchema.index({ targetRoles: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for read status
notificationSchema.virtual('isRead').get(function() {
    return this.readBy && this.readBy.length > 0;
});

// Virtual for unread count by user
notificationSchema.virtual('unreadCount').get(function() {
    // This would be calculated differently in aggregation queries
    return this.readBy ? this.readBy.length : 0;
});

// Method to mark as read by user
notificationSchema.methods.markAsRead = function(userId) {
    const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
    
    if (!existingRead) {
        this.readBy.push({
            user: userId,
            readAt: new Date()
        });
    }
    
    return this;
};

// Method to check if read by specific user
notificationSchema.methods.isReadBy = function(userId) {
    return this.readBy.some(r => r.user.toString() === userId.toString());
};

// Static method to create low stock notification
notificationSchema.statics.createLowStockNotification = function(component) {
    return new this({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${component.name} (${component.partNumber}) is running low (${component.quantity} remaining, threshold: ${component.criticalLowThreshold})`,
        priority: component.quantity === 0 ? 'high' : 'medium',
        category: 'low_stock',
        relatedComponent: component._id,
        targetRoles: ['admin', 'user'],
        metadata: {
            componentId: component._id.toString(),
            componentName: component.name,
            componentPartNumber: component.partNumber,
            newQuantity: component.quantity,
            threshold: component.criticalLowThreshold
        }
    });
};

// Static method to create old stock notification
notificationSchema.statics.createOldStockNotification = function(component, daysOld) {
    return new this({
        type: 'info',
        title: 'Old Stock Notice',
        message: `${component.name} (${component.partNumber}) has been in stock for ${daysOld} days without outward movement`,
        priority: 'low',
        category: 'old_stock',
        relatedComponent: component._id,
        targetRoles: ['admin'],
        metadata: {
            componentId: component._id.toString(),
            componentName: component.name,
            componentPartNumber: component.partNumber,
            ageInDays: daysOld
        }
    });
};

// Static method to create stock movement notification
notificationSchema.statics.createStockMovementNotification = function(component, movement, user) {
    const movementText = movement.type === 'inward' ? 'added to' : 'removed from';
    
    return new this({
        type: movement.type === 'inward' ? 'success' : 'info',
        title: 'Stock Movement',
        message: `${movement.quantity} units of ${component.name} ${movementText} inventory by ${user.name} for ${movement.project}`,
        priority: 'low',
        category: 'stock_movement',
        relatedComponent: component._id,
        relatedUser: user._id,
        targetRoles: ['admin'],
        metadata: {
            componentId: component._id.toString(),
            componentName: component.name,
            componentPartNumber: component.partNumber,
            movementType: movement.type,
            quantity: movement.quantity,
            project: movement.project,
            reason: movement.reason
        }
    });
};

// Static method to get notifications for user
notificationSchema.statics.getNotificationsForUser = function(userId, userRole) {
    return this.find({
        $and: [
            { isActive: true },
            { expiresAt: { $gt: new Date() } },
            {
                $or: [
                    { targetUsers: userId },
                    { targetRoles: userRole }
                ]
            }
        ]
    })
    .populate('relatedComponent', 'name partNumber')
    .populate('relatedUser', 'name username')
    .sort({ priority: -1, createdAt: -1 });
};

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
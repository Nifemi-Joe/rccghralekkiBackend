"use strict";
// src/dtos/staff.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_DEFAULT_PERMISSIONS = exports.AVAILABLE_PERMISSIONS = exports.STAFF_ROLES = void 0;
exports.STAFF_ROLES = [
    { value: 'admin', label: 'Administrator', description: 'Full access to all features' },
    { value: 'pastor', label: 'Senior Pastor', description: 'Pastoral oversight and management' },
    { value: 'associate_pastor', label: 'Associate Pastor', description: 'Assists senior pastor' },
    { value: 'youth_pastor', label: 'Youth Pastor', description: 'Youth ministry leader' },
    { value: 'worship_leader', label: 'Worship Leader', description: 'Leads worship team' },
    { value: 'children_minister', label: 'Children Minister', description: 'Children ministry leader' },
    { value: 'finance_officer', label: 'Finance Officer', description: 'Manages church finances' },
    { value: 'secretary', label: 'Secretary', description: 'Administrative support' },
    { value: 'head_usher', label: 'Head Usher', description: 'Leads usher team' },
    { value: 'head_choir', label: 'Choir Director', description: 'Leads choir' },
    { value: 'media_director', label: 'Media Director', description: 'Manages media/tech' },
    { value: 'outreach_coordinator', label: 'Outreach Coordinator', description: 'Manages outreach programs' },
    { value: 'staff', label: 'General Staff', description: 'General staff member' },
    { value: 'volunteer_leader', label: 'Volunteer Leader', description: 'Leads volunteer team' },
];
// Permission system
exports.AVAILABLE_PERMISSIONS = [
    // Members
    { id: 'members.view', name: 'View Members', description: 'View member list and details', category: 'members' },
    { id: 'members.create', name: 'Add Members', description: 'Create new member records', category: 'members' },
    { id: 'members.edit', name: 'Edit Members', description: 'Edit member information', category: 'members' },
    { id: 'members.delete', name: 'Delete Members', description: 'Delete member records', category: 'members' },
    // Events
    { id: 'events.view', name: 'View Events', description: 'View event list and details', category: 'events' },
    { id: 'events.create', name: 'Create Events', description: 'Create new events', category: 'events' },
    { id: 'events.edit', name: 'Edit Events', description: 'Edit event information', category: 'events' },
    { id: 'events.delete', name: 'Delete Events', description: 'Delete events', category: 'events' },
    // Finance
    { id: 'finance.view', name: 'View Finance', description: 'View financial records', category: 'finance' },
    { id: 'finance.create', name: 'Record Transactions', description: 'Record financial transactions', category: 'finance' },
    { id: 'finance.edit', name: 'Edit Transactions', description: 'Edit financial records', category: 'finance' },
    { id: 'finance.delete', name: 'Delete Transactions', description: 'Delete financial records', category: 'finance' },
    // Reports
    { id: 'reports.view', name: 'View Reports', description: 'Access reports and analytics', category: 'reports' },
    { id: 'reports.export', name: 'Export Reports', description: 'Export report data', category: 'reports' },
    // Settings
    { id: 'settings.view', name: 'View Settings', description: 'View system settings', category: 'settings' },
    { id: 'settings.edit', name: 'Edit Settings', description: 'Modify system settings', category: 'settings' },
    // Communications
    { id: 'communications.send', name: 'Send Communications', description: 'Send emails and SMS', category: 'communications' },
    { id: 'communications.view', name: 'View Communications', description: 'View communication history', category: 'communications' },
    // Groups
    { id: 'groups.view', name: 'View Groups', description: 'View group list and details', category: 'groups' },
    { id: 'groups.create', name: 'Create Groups', description: 'Create new groups', category: 'groups' },
    { id: 'groups.edit', name: 'Edit Groups', description: 'Edit group information', category: 'groups' },
    { id: 'groups.delete', name: 'Delete Groups', description: 'Delete groups', category: 'groups' },
];
exports.ROLE_DEFAULT_PERMISSIONS = {
    admin: exports.AVAILABLE_PERMISSIONS.map(p => p.id),
    pastor: [
        'members.view', 'members.create', 'members.edit',
        'events.view', 'events.create', 'events.edit',
        'groups.view', 'groups.create', 'groups.edit',
        'communications.send', 'communications.view',
        'reports.view', 'reports.export',
    ],
    associate_pastor: [
        'members.view', 'members.create', 'members.edit',
        'events.view', 'events.create', 'events.edit',
        'groups.view', 'groups.create', 'groups.edit',
        'communications.send', 'communications.view',
        'reports.view',
    ],
    worship_leader: [
        'members.view',
        'events.view', 'events.create', 'events.edit',
        'groups.view', 'groups.create', 'groups.edit',
    ],
    youth_pastor: [
        'members.view', 'members.create', 'members.edit',
        'events.view', 'events.create', 'events.edit',
        'groups.view', 'groups.create', 'groups.edit',
        'communications.send', 'communications.view',
    ],
    children_minister: [
        'members.view', 'members.create', 'members.edit',
        'events.view', 'events.create', 'events.edit',
        'groups.view', 'groups.create', 'groups.edit',
    ],
    finance_officer: [
        'members.view',
        'finance.view', 'finance.create', 'finance.edit', 'finance.delete',
        'reports.view', 'reports.export',
    ],
    secretary: [
        'members.view', 'members.create', 'members.edit',
        'events.view', 'events.create', 'events.edit',
        'communications.send', 'communications.view',
    ],
    head_usher: [
        'members.view',
        'events.view',
    ],
    head_choir: [
        'members.view',
        'events.view', 'events.create', 'events.edit',
    ],
    media_director: [
        'members.view',
        'events.view', 'events.create', 'events.edit',
    ],
    outreach_coordinator: [
        'members.view', 'members.create',
        'events.view', 'events.create', 'events.edit',
        'communications.send', 'communications.view',
    ],
    staff: [
        'members.view',
        'events.view',
    ],
    volunteer_leader: [
        'members.view',
        'events.view',
        'groups.view',
    ],
};
//# sourceMappingURL=staff.types.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    // SMS Sender IDs
    await knex.schema.createTable('sms_sender_ids', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.string('sender_id', 11).notNullable();
        table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
        table.text('rejection_reason');
        table.boolean('is_default').defaultTo(false);
        table.timestamp('approved_at');
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
        table.unique(['church_id', 'sender_id']);
    });
    // SMS Units/Balance
    await knex.schema.createTable('sms_balances', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.integer('units').notNullable().defaultTo(0);
        table.timestamp('last_updated').defaultTo(knex.fn.now());
        table.unique(['church_id']);
    });
    // SMS Unit Transactions
    await knex.schema.createTable('sms_transactions', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.enum('type', ['purchase', 'usage', 'refund', 'bonus']).notNullable();
        table.integer('units').notNullable();
        table.integer('balance_after').notNullable();
        table.string('reference');
        table.text('description');
        table.decimal('amount', 10, 2);
        table.string('payment_method');
        table.string('payment_reference');
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
    });
    // SMS Campaigns (for batch sends)
    await knex.schema.createTable('sms_campaigns', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.string('name');
        table.text('message').notNullable();
        table.uuid('sender_id').references('id').inTable('sms_sender_ids');
        table.enum('destination_type', ['all_contacts', 'groups', 'members', 'phone_numbers', 'uploaded']).notNullable();
        table.specificType('group_ids', 'uuid[]');
        table.specificType('member_ids', 'uuid[]');
        table.specificType('phone_numbers', 'text[]');
        table.jsonb('uploaded_contacts');
        table.enum('status', ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']).defaultTo('draft');
        table.timestamp('scheduled_at');
        table.timestamp('sent_at');
        table.integer('total_recipients').defaultTo(0);
        table.integer('successful_count').defaultTo(0);
        table.integer('failed_count').defaultTo(0);
        table.integer('units_used').defaultTo(0);
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
    });
    // Individual SMS Messages
    await knex.schema.createTable('sms_messages', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.uuid('campaign_id').references('id').inTable('sms_campaigns').onDelete('SET NULL');
        table.uuid('member_id').references('id').inTable('members').onDelete('SET NULL');
        table.string('phone_number').notNullable();
        table.string('recipient_name');
        table.text('message').notNullable();
        table.string('sender_id');
        table.enum('direction', ['outbound', 'inbound']).defaultTo('outbound');
        table.enum('status', ['pending', 'sent', 'delivered', 'failed', 'rejected']).defaultTo('pending');
        table.string('external_id');
        table.text('error_message');
        table.integer('units').defaultTo(1);
        table.timestamp('sent_at');
        table.timestamp('delivered_at');
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
        table.index(['church_id', 'status']);
        table.index(['church_id', 'direction']);
        table.index(['campaign_id']);
    });
    // SMS Replies
    await knex.schema.createTable('sms_replies', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.uuid('original_message_id').references('id').inTable('sms_messages').onDelete('SET NULL');
        table.string('phone_number').notNullable();
        table.string('sender_name');
        table.text('message').notNullable();
        table.boolean('is_read').defaultTo(false);
        table.timestamp('received_at').defaultTo(knex.fn.now());
        table.timestamps(true, true);
        table.index(['church_id', 'is_read']);
    });
    // Contact Lists (for uploaded contacts)
    await knex.schema.createTable('sms_contact_lists', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.string('name').notNullable();
        table.text('description');
        table.integer('contact_count').defaultTo(0);
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
    });
    // Contact List Items
    await knex.schema.createTable('sms_contact_list_items', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('list_id').notNullable().references('id').inTable('sms_contact_lists').onDelete('CASCADE');
        table.string('phone_number').notNullable();
        table.string('name');
        table.jsonb('custom_fields');
        table.timestamps(true, true);
        table.unique(['list_id', 'phone_number']);
    });
}
async function down(knex) {
    await knex.schema.dropTableIfExists('sms_contact_list_items');
    await knex.schema.dropTableIfExists('sms_contact_lists');
    await knex.schema.dropTableIfExists('sms_replies');
    await knex.schema.dropTableIfExists('sms_messages');
    await knex.schema.dropTableIfExists('sms_campaigns');
    await knex.schema.dropTableIfExists('sms_transactions');
    await knex.schema.dropTableIfExists('sms_balances');
    await knex.schema.dropTableIfExists('sms_sender_ids');
}
//# sourceMappingURL=20240115000001_create_sms_tables.js.map
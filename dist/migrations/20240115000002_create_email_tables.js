"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    // Email Configurations
    await knex.schema.createTable('email_configurations', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.string('from_email').notNullable();
        table.string('from_name').notNullable();
        table.string('reply_to_email');
        table.boolean('is_verified').defaultTo(false);
        table.boolean('is_default').defaultTo(false);
        table.timestamps(true, true);
        table.unique(['church_id', 'from_email']);
    });
    // Email Templates
    await knex.schema.createTable('email_templates', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.string('name').notNullable();
        table.string('subject').notNullable();
        table.text('html_content').notNullable();
        table.text('text_content');
        table.jsonb('variables');
        table.boolean('is_active').defaultTo(true);
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
    });
    // Email Campaigns
    await knex.schema.createTable('email_campaigns', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.string('name');
        table.string('subject').notNullable();
        table.text('html_content').notNullable();
        table.text('text_content');
        table.uuid('template_id').references('id').inTable('email_templates').onDelete('SET NULL');
        table.uuid('from_config_id').references('id').inTable('email_configurations').onDelete('SET NULL');
        table.enum('destination_type', ['all_contacts', 'groups', 'members', 'other_emails']).notNullable();
        table.specificType('group_ids', 'uuid[]');
        table.specificType('member_ids', 'uuid[]');
        table.specificType('other_emails', 'text[]');
        table.enum('status', ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']).defaultTo('draft');
        table.timestamp('scheduled_at');
        table.timestamp('sent_at');
        table.integer('total_recipients').defaultTo(0);
        table.integer('sent_count').defaultTo(0);
        table.integer('delivered_count').defaultTo(0);
        table.integer('opened_count').defaultTo(0);
        table.integer('clicked_count').defaultTo(0);
        table.integer('bounced_count').defaultTo(0);
        table.integer('failed_count').defaultTo(0);
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
    });
    // Email Attachments
    await knex.schema.createTable('email_attachments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('campaign_id').notNullable().references('id').inTable('email_campaigns').onDelete('CASCADE');
        table.string('filename').notNullable();
        table.string('original_name').notNullable();
        table.string('mime_type').notNullable();
        table.integer('size').notNullable();
        table.string('storage_path').notNullable();
        table.timestamps(true, true);
    });
    // Individual Emails
    await knex.schema.createTable('emails', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('church_id').notNullable().references('id').inTable('churches').onDelete('CASCADE');
        table.uuid('campaign_id').references('id').inTable('email_campaigns').onDelete('SET NULL');
        table.uuid('member_id').references('id').inTable('members').onDelete('SET NULL');
        table.string('to_email').notNullable();
        table.string('to_name');
        table.string('subject').notNullable();
        table.text('html_content').notNullable();
        table.text('text_content');
        table.enum('status', ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']).defaultTo('pending');
        table.string('external_id');
        table.text('error_message');
        table.timestamp('sent_at');
        table.timestamp('delivered_at');
        table.timestamp('opened_at');
        table.integer('open_count').defaultTo(0);
        table.integer('click_count').defaultTo(0);
        table.uuid('created_by').references('id').inTable('users');
        table.timestamps(true, true);
        table.index(['church_id', 'status']);
        table.index(['campaign_id']);
    });
    // Email Click Tracking
    await knex.schema.createTable('email_clicks', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('email_id').notNullable().references('id').inTable('emails').onDelete('CASCADE');
        table.text('url').notNullable();
        table.string('ip_address');
        table.text('user_agent');
        table.timestamp('clicked_at').defaultTo(knex.fn.now());
    });
}
async function down(knex) {
    await knex.schema.dropTableIfExists('email_clicks');
    await knex.schema.dropTableIfExists('emails');
    await knex.schema.dropTableIfExists('email_attachments');
    await knex.schema.dropTableIfExists('email_campaigns');
    await knex.schema.dropTableIfExists('email_templates');
    await knex.schema.dropTableIfExists('email_configurations');
}
//# sourceMappingURL=20240115000002_create_email_tables.js.map
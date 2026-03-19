// scripts/seed.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seedPricing() {
    console.log('Seeding default pricing...');

    const pricing = [
        // SMS
        { channel: 'sms', code: 'NG', name: 'Nigeria', cost: 2.5, sell: 5.0 },
        { channel: 'sms', code: 'US', name: 'United States', cost: 10, sell: 20 },
        { channel: 'sms', code: 'GB', name: 'United Kingdom', cost: 8, sell: 16 },
        { channel: 'sms', code: 'GH', name: 'Ghana', cost: 3, sell: 9 },
        { channel: 'sms', code: 'KE', name: 'Kenya', cost: 3.5, sell: 10 },

        // Email
        { channel: 'email', code: 'NG', name: 'Nigeria', cost: 0.5, sell: 3.0 },
        { channel: 'email', code: 'US', name: 'United States', cost: 0.5, sell: 3.0 },
        { channel: 'email', code: 'GB', name: 'United Kingdom', cost: 0.5, sell: 3.0 },

        // WhatsApp
        { channel: 'whatsapp', code: 'NG', name: 'Nigeria', cost: 5, sell: 15 },
        { channel: 'whatsapp', code: 'US', name: 'United States', cost: 12, sell: 25 },
        { channel: 'whatsapp', code: 'GB', name: 'United Kingdom', cost: 10, sell: 20 },

        // Voice
        { channel: 'voice', code: 'NG', name: 'Nigeria', cost: 15, sell: 30 },
        { channel: 'voice', code: 'US', name: 'United States', cost: 20, sell: 40 },
        { channel: 'voice', code: 'GB', name: 'United Kingdom', cost: 18, sell: 35 },
    ];

    for (const p of pricing) {
        try {
            await pool.query(
                `INSERT INTO messaging_pricing (channel, country_code, country_name, cost_per_unit, sell_price)
                 VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (channel, country_code) DO UPDATE
                                                                SET cost_per_unit = EXCLUDED.cost_per_unit, sell_price = EXCLUDED.sell_price`,
                [p.channel, p.code, p.name, p.cost, p.sell]
            );
            console.log(`✓ Seeded pricing: ${p.channel} - ${p.code}`);
        } catch (error) {
            console.error(`✗ Failed to seed ${p.channel} - ${p.code}:`, error.message);
        }
    }
}

async function seedPackages() {
    console.log('Seeding default packages...');

    const packages = [
        // SMS Packages
        { name: 'SMS Starter', channel: 'sms', units: 100, price: 350, bonus: 0, discount: 0, popular: false, order: 1 },
        { name: 'SMS Basic', channel: 'sms', units: 500, price: 1500, bonus: 50, discount: 5, popular: false, order: 2 },
        { name: 'SMS Professional', channel: 'sms', units: 1000, price: 2800, bonus: 150, discount: 10, popular: true, order: 3 },
        { name: 'SMS Enterprise', channel: 'sms', units: 5000, price: 12000, bonus: 1000, discount: 15, popular: false, order: 4 },

        // Email Packages
        { name: 'Email Starter', channel: 'email', units: 500, price: 500, bonus: 0, discount: 0, popular: false, order: 1 },
        { name: 'Email Basic', channel: 'email', units: 2000, price: 1800, bonus: 200, discount: 5, popular: false, order: 2 },
        { name: 'Email Professional', channel: 'email', units: 5000, price: 4000, bonus: 750, discount: 10, popular: true, order: 3 },
        { name: 'Email Enterprise', channel: 'email', units: 20000, price: 14000, bonus: 5000, discount: 15, popular: false, order: 4 },

        // WhatsApp Packages
        { name: 'WhatsApp Starter', channel: 'whatsapp', units: 50, price: 375, bonus: 0, discount: 0, popular: false, order: 1 },
        { name: 'WhatsApp Basic', channel: 'whatsapp', units: 200, price: 1400, bonus: 20, discount: 5, popular: false, order: 2 },
        { name: 'WhatsApp Professional', channel: 'whatsapp', units: 500, price: 3200, bonus: 75, discount: 10, popular: true, order: 3 },
        { name: 'WhatsApp Enterprise', channel: 'whatsapp', units: 2000, price: 11500, bonus: 500, discount: 15, popular: false, order: 4 },

        // Voice Packages
        { name: 'Voice Starter', channel: 'voice', units: 25, price: 550, bonus: 0, discount: 0, popular: false, order: 1 },
        { name: 'Voice Basic', channel: 'voice', units: 100, price: 2000, bonus: 10, discount: 5, popular: false, order: 2 },
        { name: 'Voice Professional', channel: 'voice', units: 250, price: 4800, bonus: 35, discount: 10, popular: true, order: 3 },

        // Combo Packages
        { name: 'Starter Combo', channel: 'combo', units: 150, price: 800, bonus: 0, discount: 0, popular: false, order: 1, description: '100 SMS + 50 Emails' },
        { name: 'Growth Combo', channel: 'combo', units: 750, price: 3500, bonus: 100, discount: 10, popular: true, order: 2, description: '500 SMS + 200 Emails + 50 WhatsApp' },
        { name: 'Business Combo', channel: 'combo', units: 2000, price: 8500, bonus: 400, discount: 15, popular: false, order: 3, description: '1000 SMS + 500 Emails + 200 WhatsApp + 50 Voice' },
    ];

    for (const pkg of packages) {
        try {
            await pool.query(
                `INSERT INTO unit_packages (name, channel, units, price, bonus_units, discount_percent, is_popular, sort_order, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [pkg.name, pkg.channel, pkg.units, pkg.price, pkg.bonus, pkg.discount, pkg.popular, pkg.order, pkg.description || null]
            );
            console.log(`✓ Seeded package: ${pkg.name}`);
        } catch (error) {
            console.error(`✗ Failed to seed ${pkg.name}:`, error.message);
        }
    }
}

async function seed() {
    try {
        await seedPricing();
        await seedPackages();
        console.log('All seeding completed successfully!');
    } catch (error) {
        console.error('Seeding failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

seed().catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
});

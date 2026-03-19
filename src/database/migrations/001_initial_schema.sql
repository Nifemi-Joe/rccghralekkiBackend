-- ChurchPlus Database Schema
-- Complete database migration for all features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Churches (Multi-tenant)
CREATE TABLE churches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Location for proximity notifications
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notification_radius INTEGER DEFAULT 500, -- in meters
    
    -- Branding
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    primary_color VARCHAR(7),
    
    -- Settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    
    -- Subscription
    subscription_plan VARCHAR(50) DEFAULT 'free', -- free, basic, professional, enterprise
    subscription_status VARCHAR(50) DEFAULT 'trialing', -- trialing, active, past_due, canceled
    setup_status VARCHAR(50) DEFAULT 'pending_admin', -- pending_admin, active
    trial_ends_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Admin/Staff accounts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    profile_image_url VARCHAR(500),
    
    role VARCHAR(50) DEFAULT 'staff', -- admin, pastor, staff, finance
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Members
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    
    -- Basic Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    alternate_phone VARCHAR(50),
    
    -- Demographics
    gender VARCHAR(20),
    date_of_birth DATE,
    marital_status VARCHAR(20),
    wedding_anniversary DATE,
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Church Info
    membership_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, transferred
    member_type VARCHAR(20) DEFAULT 'regular', -- regular, visitor, first_timer
    qr_code VARCHAR(50) UNIQUE,
    
    profile_image_url VARCHAR(500),
    occupation VARCHAR(100),
    employer VARCHAR(100),
    notes TEXT,
    
    -- Family relations
    family_id UUID,
    family_role VARCHAR(20), -- head, spouse, child, relative
    
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Families
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    head_id UUID REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add family foreign key to members
ALTER TABLE members ADD CONSTRAINT fk_member_family 
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;

-- ==========================================
-- GROUPS
-- ==========================================

-- Group Types
CREATE TABLE group_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    group_type_id UUID REFERENCES group_types(id) ON DELETE SET NULL,
    leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    meeting_schedule VARCHAR(200),
    meeting_location VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Members (Junction table)
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- leader, co_leader, member
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(group_id, member_id)
);

-- ==========================================
-- EVENTS & ATTENDANCE
-- ==========================================

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- service, meeting, conference, outreach, fellowship, other
    recurrence VARCHAR(20) DEFAULT 'none', -- none, daily, weekly, biweekly, monthly, yearly
    
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME NOT NULL,
    end_time TIME,
    location VARCHAR(255),
    capacity INTEGER,
    
    qr_code VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    allow_self_checkin BOOLEAN DEFAULT true,
    allow_guest_checkin BOOLEAN DEFAULT false,
    
    -- Paid event fields
    is_paid BOOLEAN DEFAULT false,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    registration_deadline DATE,
    max_registrations INTEGER,
    current_registrations INTEGER DEFAULT 0,
    
    -- Media
    banner_url VARCHAR(500),
    
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Instances (For recurring events)
CREATE TABLE event_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    
    instance_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    
    qr_code VARCHAR(50) UNIQUE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, ongoing, completed, cancelled
    total_attendance INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Registrations (For paid events)
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    
    guest_name VARCHAR(200),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, refunded, free
    payment_reference VARCHAR(100),
    amount_paid DECIMAL(10, 2),
    
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    event_instance_id UUID REFERENCES event_instances(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    
    -- For guests
    guest_name VARCHAR(200),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    
    checkin_type VARCHAR(20) NOT NULL, -- qr_scan, manual, self_checkin, bulk
    checkin_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checkout_time TIMESTAMP,
    
    checked_in_by UUID REFERENCES users(id),
    notes TEXT,
    is_first_time BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- FINANCIALS
-- ==========================================

-- Accounts (Charts of Accounts)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- bank, digital, cash, custom
    description TEXT,
    account_number VARCHAR(50),
    bank_name VARCHAR(100),
    
    balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Categories
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_predefined BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined expense categories
INSERT INTO expense_categories (id, church_id, name, is_predefined) VALUES
    (uuid_generate_v4(), NULL, 'Utilities', true),
    (uuid_generate_v4(), NULL, 'Maintenance', true),
    (uuid_generate_v4(), NULL, 'Salaries', true),
    (uuid_generate_v4(), NULL, 'Supplies', true),
    (uuid_generate_v4(), NULL, 'Events', true),
    (uuid_generate_v4(), NULL, 'Outreach', true),
    (uuid_generate_v4(), NULL, 'Equipment', true),
    (uuid_generate_v4(), NULL, 'Transportation', true),
    (uuid_generate_v4(), NULL, 'Welfare', true),
    (uuid_generate_v4(), NULL, 'Other', true);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(20) NOT NULL, -- offering, tithe, donation, expense, transfer, other
    amount DECIMAL(15, 2) NOT NULL, -- Positive for income, negative for expenses
    description TEXT,
    reference_number VARCHAR(100),
    
    member_id UUID REFERENCES members(id) ON DELETE SET NULL, -- For tithes
    donor_name VARCHAR(200), -- For anonymous/external donations
    event_instance_id UUID REFERENCES event_instances(id) ON DELETE SET NULL,
    expense_category VARCHAR(100),
    
    payment_method VARCHAR(20) NOT NULL, -- cash, bank_transfer, card, mobile_money, check, other
    transaction_date DATE NOT NULL,
    
    recorded_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- SERVICE REPORTS
-- ==========================================

CREATE TABLE service_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    event_instance_id UUID REFERENCES event_instances(id) ON DELETE CASCADE,
    
    event_name VARCHAR(255) NOT NULL,
    service_date DATE NOT NULL,
    
    -- Sermon details
    preacher VARCHAR(200),
    sermon_title VARCHAR(300),
    sermon_notes TEXT,
    
    -- Attendance breakdown
    attendance_men INTEGER DEFAULT 0,
    attendance_women INTEGER DEFAULT 0,
    attendance_children INTEGER DEFAULT 0,
    total_attendance INTEGER DEFAULT 0,
    first_timers INTEGER DEFAULT 0,
    new_comers INTEGER DEFAULT 0,
    
    -- Financial breakdown
    offerings DECIMAL(15, 2) DEFAULT 0,
    tithes DECIMAL(15, 2) DEFAULT 0,
    donations DECIMAL(15, 2) DEFAULT 0,
    other_income DECIMAL(15, 2) DEFAULT 0,
    total_income DECIMAL(15, 2) DEFAULT 0,
    expenses DECIMAL(15, 2) DEFAULT 0,
    net_income DECIMAL(15, 2) DEFAULT 0,
    
    -- Payment channels
    cash_amount DECIMAL(15, 2) DEFAULT 0,
    bank_transfer_amount DECIMAL(15, 2) DEFAULT 0,
    card_amount DECIMAL(15, 2) DEFAULT 0,
    mobile_money_amount DECIMAL(15, 2) DEFAULT 0,
    
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- FIRST TIMERS & FOLLOW-UP
-- ==========================================

CREATE TABLE first_timer_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, converted
    assigned_to UUID REFERENCES users(id),
    
    first_visit_date DATE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    converted_date DATE, -- When they became a regular member
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================

CREATE TABLE notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    
    push_endpoint TEXT,
    push_p256dh VARCHAR(255),
    push_auth VARCHAR(255),
    
    location_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Performance indexes
CREATE INDEX idx_users_church ON users(church_id);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_members_church ON members(church_id);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_qr_code ON members(qr_code);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_family ON members(family_id);

CREATE INDEX idx_groups_church ON groups(church_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_member ON group_members(member_id);

CREATE INDEX idx_events_church ON events(church_id);
CREATE INDEX idx_events_qr_code ON events(qr_code);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_type ON events(event_type);

CREATE INDEX idx_event_instances_event ON event_instances(event_id);
CREATE INDEX idx_event_instances_church ON event_instances(church_id);
CREATE INDEX idx_event_instances_qr_code ON event_instances(qr_code);
CREATE INDEX idx_event_instances_date ON event_instances(instance_date);

CREATE INDEX idx_attendance_church ON attendance(church_id);
CREATE INDEX idx_attendance_instance ON attendance(event_instance_id);
CREATE INDEX idx_attendance_member ON attendance(member_id);
CREATE INDEX idx_attendance_checkin_time ON attendance(checkin_time);

CREATE INDEX idx_transactions_church ON transactions(church_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

CREATE INDEX idx_service_reports_church ON service_reports(church_id);
CREATE INDEX idx_service_reports_date ON service_reports(service_date);

-- ==========================================
-- UPDATE TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON churches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_instances_updated_at BEFORE UPDATE ON event_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_reports_updated_at BEFORE UPDATE ON service_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

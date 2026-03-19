-- Migration: Add unique constraint for notification subscriptions
-- Prevents duplicate push subscriptions for same member/endpoint

ALTER TABLE notification_subscriptions 
ADD CONSTRAINT unique_member_endpoint 
UNIQUE (member_id, push_endpoint);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_church 
ON notification_subscriptions(church_id);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_member 
ON notification_subscriptions(member_id);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_location 
ON notification_subscriptions(church_id, location_enabled) 
WHERE location_enabled = true;

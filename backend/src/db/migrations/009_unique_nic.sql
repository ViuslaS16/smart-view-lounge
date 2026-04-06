-- Add unique constraint to nic_number
ALTER TABLE users ADD CONSTRAINT unique_nic_number UNIQUE (nic_number);

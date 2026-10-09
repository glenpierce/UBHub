# UBHub schema migrations for EXISTING databases.
#
# databaseTools.sql always holds the complete, current schema; use it to create a
# new database (it needs nothing from this file). This file upgrades a database
# created from an older databaseTools.sql. Run it against the app's database, e.g.
#   mysql -u <user> -p ubhub < databaseMigrations.sql
#
# Each section runs once. MySQL has no "ADD COLUMN IF NOT EXISTS", so re-running a
# section that is already applied fails with a harmless "Duplicate column name"
# error. Run only the sections your database is missing (newest at the bottom).
# When you change the schema, update CREATE TABLE in databaseTools.sql AND append
# a new section here.

# 1. Contacts merged into the users table.
ALTER TABLE users ADD COLUMN phone VARCHAR(64);
ALTER TABLE users ADD COLUMN workingGroup VARCHAR(255);
ALTER TABLE users ADD COLUMN level VARCHAR(255);
ALTER TABLE users ADD COLUMN createdBy VARCHAR(255);
ALTER TABLE users ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;

# 2. GDPR consent and removal requests. Run BEFORE deploying the code that reads these columns.
ALTER TABLE users ADD COLUMN consentGivenAt DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN removalRequestedAt DATETIME DEFAULT NULL;

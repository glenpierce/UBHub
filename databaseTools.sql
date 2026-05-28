-- Privilege levels: 0 = Contact (no password), 1 = User, 2 = Contributor, 3 = Approver, 4 = Executive
CREATE TABLE IF NOT EXISTS users(
    email VARCHAR(255) NOT NULL,
    userAddress TEXT,
    hashedPassword CHAR(255), -- NULL for Contact-level users (privileges = 0); NOT NULL for authenticated users (privileges >= 1)
    alias VARCHAR(255) NOT NULL, -- display name
    privileges INT DEFAULT 0, -- 0 = Contact, 1 = User, 2 = Contributor, 3 = Approver, 4 = Executive
    lastActive DATE,
    region VARCHAR(255),
    title VARCHAR(255),
    institution VARCHAR(255),
    status VARCHAR(255),
    assignedSite VARCHAR(255), -- assignedSites
    whatsAppNumber VARCHAR(20),
    primaryContact VARCHAR(255),
    notes TEXT,
    phone VARCHAR(64),
    workingGroup VARCHAR(255),
    level VARCHAR(255), -- contact engagement level (e.g. "Observer", "Senior Member")
    createdBy VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email),
    UNIQUE INDEX (email),
    INDEX idx_users_alias (alias(255))
);

-- The contacts table has been merged into the users table (privileges = 0 represents a Contact).
-- The contacts table definition is retained below for reference only and should not be created in new deployments.
-- Migration: ALTER TABLE users ADD COLUMN phone VARCHAR(64), ADD COLUMN workingGroup VARCHAR(255), ADD COLUMN level VARCHAR(255), ADD COLUMN createdBy VARCHAR(255), ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, MODIFY COLUMN hashedPassword CHAR(255) NULL;
-- Migration: INSERT INTO users (email, alias, phone, title, institution, region, level, workingGroup, createdBy, createdAt, privileges) SELECT email, fullName, phone, title, organization, region, level, workingGroup, createdBy, createdAt, 0 FROM contacts ON DUPLICATE KEY UPDATE phone = VALUES(phone), workingGroup = VALUES(workingGroup), level = VALUES(level);
-- DEPRECATED contacts table (replaced by users with privileges = 0):
-- CREATE TABLE IF NOT EXISTS contacts (
--     id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
--     fullName VARCHAR(1024) CHARACTER SET utf8 NOT NULL,
--     email VARCHAR(255) CHARACTER SET utf8 NOT NULL,
--     phone VARCHAR(64) CHARACTER SET utf8,
--     title VARCHAR(512) CHARACTER SET utf8,
--     organization VARCHAR(512) CHARACTER SET utf8,
--     region VARCHAR(255) CHARACTER SET utf8,
--     level VARCHAR(255) CHARACTER SET utf8,
--     workingGroup VARCHAR(255) CHARACTER SET utf8,
--     createdBy VARCHAR(255) CHARACTER SET utf8,
--     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     INDEX idx_contacts_fullName (fullName(255))
-- );

CREATE TABLE IF NOT EXISTS locations (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    inst_address VARCHAR(255) CHARACTER SET utf8,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    inst_title VARCHAR(255) CHARACTER SET utf8,
    country VARCHAR(255) CHARACTER SET utf8,
    scale VARCHAR(255) CHARACTER SET utf8,
    population INT,
    density_km2 NUMERIC(14, 9),
    area_km2 NUMERIC(12,3),
    area_ha NUMERIC(7, 2),
    biodiversity_url VARCHAR(512) CHARACTER SET utf8,
    url_verifydate DATETIME,
    wwf_biome VARCHAR(255) CHARACTER SET utf8,
    wwf_terrestrial_ecoregion VARCHAR(255) CHARACTER SET utf8,
    hotspot VARCHAR(255) CHARACTER SET utf8,
    conservation_status_wwf VARCHAR(255) CHARACTER SET utf8
);

CREATE TABLE IF NOT EXISTS programs(
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    programName VARCHAR(2048) CHARACTER SET utf8,
    description VARCHAR(2048) CHARACTER SET utf8,
    programType INT,
    private BIT,
    author VARCHAR(255),
    creationDate DATE,
    iconFileName VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS documents (
    id INT,
    inst_id INT,
    doc_type VARCHAR(255) CHARACTER SET utf8,
    doc_year INT,
    doc_title VARCHAR(255) CHARACTER SET utf8,
    doc_url VARCHAR(255) CHARACTER SET utf8,
    keywords VARCHAR(512) CHARACTER SET utf8,
    source_url VARCHAR(255) CHARACTER SET utf8,
    link_verified VARCHAR(255) CHARACTER SET utf8
);

CREATE TABLE IF NOT EXISTS participation (
    id INT,
    inst_id INT,
    part_category VARCHAR(255) CHARACTER SET utf8,
    part_name VARCHAR(255) CHARACTER SET utf8,
    part_year INT,
    part_data NUMERIC(8, 5),
    part_units VARCHAR(255) CHARACTER SET utf8,
    part_level VARCHAR(255) CHARACTER SET utf8,
    part_link_label VARCHAR(255) CHARACTER SET utf8,
    part_link VARCHAR(512) CHARACTER SET utf8,
    part_link_label2 VARCHAR(255) CHARACTER SET utf8,
    part_link2 VARCHAR(512) CHARACTER SET utf8,
    part_link_label3 VARCHAR(255) CHARACTER SET utf8,
    part_link3 VARCHAR(512) CHARACTER SET utf8,
    keywords VARCHAR(1024) CHARACTER SET utf8,
    link_verified VARCHAR(255) CHARACTER SET utf8
);

CREATE TABLE IF NOT EXISTS row_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    table_name VARCHAR(255) NOT NULL,
    row_key JSON DEFAULT NULL,
    operation ENUM('insert','update','delete') NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    version INT NOT NULL DEFAULT 1,
    data JSON NOT NULL,
    created_by VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(255) DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_row_versions_table_name (table_name),
    KEY idx_row_versions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

#createUser procedure – creates an authenticated user with privileges = 1 (User)
create
    definer = root@`%` procedure createUser(IN emailInput varchar(255), IN passwordHash varchar(255), IN alias varchar(255), IN userAddress varchar(2000), IN title varchar(255), IN institution varchar(255), whatsAppNumber varchar(20))
BEGIN
    insert into users (email, hashedPassword, alias, userAddress, title, institution, whatsAppNumber, privileges) values(emailInput, passwordHash, alias, userAddress, title, institution, whatsAppNumber, 1);
END;

#createContact procedure – creates a Contact (privileges = 0) with no password
create
    definer = root@`%` procedure createContact(IN emailInput varchar(255), IN aliasInput varchar(255), IN phoneInput varchar(64), IN titleInput varchar(255), IN institutionInput varchar(512), IN regionInput varchar(255), IN levelInput varchar(255), IN workingGroupInput varchar(255), IN createdByInput varchar(255))
BEGIN
    insert into users (email, alias, phone, title, institution, region, level, workingGroup, createdBy, privileges)
    values(emailInput, aliasInput, phoneInput, titleInput, institutionInput, regionInput, levelInput, workingGroupInput, createdByInput, 0);
END;

#login procedure
create
    definer = root@`%` procedure login(IN emailInput varchar(255))
BEGIN
    SELECT email, hashedPassword, privileges, alias
    FROM users
    WHERE email = emailInput;
END;

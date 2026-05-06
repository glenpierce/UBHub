CREATE TABLE IF NOT EXISTS users(
    email VARCHAR(255) NOT NULL,
    userAddress TEXT,
    hashedPassword CHAR(255) not null,
    alias VARCHAR(255) NOT NULL, #name
    privileges INT,
    lastActive DATE,
    region VARCHAR(255),
    title VARCHAR(255),
    institution VARCHAR(255),
    status VARCHAR(255),
    assignedSite VARCHAR(255), # assignedSites
    whatsAppNumber VARCHAR(20),
    primaryContact VARCHAR(255),
    notes TEXT,
    PRIMARY KEY (email),
    UNIQUE INDEX (email)
);

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

CREATE TABLE IF NOT EXISTS contacts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(1024) CHARACTER SET utf8 NOT NULL,
    email VARCHAR(255) CHARACTER SET utf8 NOT NULL,
    phone VARCHAR(64) CHARACTER SET utf8,
    title VARCHAR(512) CHARACTER SET utf8,
    organization VARCHAR(512) CHARACTER SET utf8,
    region VARCHAR(255) CHARACTER SET utf8,
    level VARCHAR(255) CHARACTER SET utf8,
    workingGroup VARCHAR(255) CHARACTER SET utf8,
    createdBy VARCHAR(255) CHARACTER SET utf8,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contacts_fullName (fullName(255))
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

#createUser procedure
create
    definer = root@`%` procedure createUser(IN emailInput varchar(255), IN passwordHash varchar(255), IN alias varchar(255), IN userAddress varchar(2000), IN title varchar(255), IN institution varchar(255), whatsAppNumber varchar(20))
BEGIN
    insert into users (email, hashedPassword, alias, userAddress, title, institution, whatsAppNumber) values(emailInput, passwordHash, alias, userAddress, title, institution, whatsAppNumber);
END;

#login procedure
create
    definer = root@`%` procedure login(IN emailInput varchar(255))
BEGIN
    SELECT email, hashedPassword, privileges, alias
    FROM users
    WHERE email = emailInput;
END;

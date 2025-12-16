CREATE TABLE users(
    email VARCHAR(255) NOT NULL,
    userAddress VARCHAR(2000),
    hashedPassword CHAR(255) not null,
    alias VARCHAR(255) NOT NULL,
    privileges INT,
    PRIMARY KEY (email),
    UNIQUE INDEX (email)
);

CREATE TABLE locations (
    id INT,
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

CREATE TABLE programs(
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    programName VARCHAR(2048) CHARACTER SET utf8,
    description VARCHAR(2048) CHARACTER SET utf8,
    programType INT,
    private BIT,
    author VARCHAR(255),
    creationDate DATE,
    iconFileName VARCHAR(255)
);

CREATE TABLE indicators(
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    indicatorName VARCHAR(2048) CHARACTER SET utf8,
    positionInCategory INT,
    categoryId INT,
    archetype VARCHAR(255),
    weight FLOAT(10, 2),
    required BIT,
    description VARCHAR(2048) CHARACTER SET utf8,
    descriptionOfCalculation VARCHAR(2048) CHARACTER SET utf8,
    calculation VARCHAR(2048),
    private BIT,
    author VARCHAR(255),
    creationDate DATE
);

CREATE TABLE documents (
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

CREATE TABLE participation (
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

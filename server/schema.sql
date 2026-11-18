CREATE TABLE IF NOT EXISTS members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  name VARCHAR(100) NOT NULL,
  batch SMALLINT UNSIGNED NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT '',
  field VARCHAR(120) NOT NULL DEFAULT '',
  mentor_topic VARCHAR(160) NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT FALSE,
  role ENUM('member','organizer') NOT NULL DEFAULT 'member',
  status ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending',
  INDEX directory (visible, status, batch, name)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
  digest CHAR(64) PRIMARY KEY,
  member_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id),
  INDEX (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  kind ENUM('reunion','office_hours') NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  venue VARCHAR(180) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL CHECK (capacity > 0),
  creator_id INT UNSIGNED NOT NULL,
  mentor_id INT UNSIGNED,
  FOREIGN KEY (creator_id) REFERENCES members(id),
  FOREIGN KEY (mentor_id) REFERENCES members(id),
  INDEX (starts_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS bookings (
  event_id INT UNSIGNED NOT NULL,
  member_id INT UNSIGNED NOT NULL,
  status ENUM('confirmed','waitlisted','cancelled') NOT NULL,
  revision INT UNSIGNED NOT NULL,
  ticket INT UNSIGNED,
  PRIMARY KEY (event_id, member_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  UNIQUE KEY unique_ticket (event_id, ticket),
  INDEX queue_order (event_id, status, ticket),
  CHECK ((status='waitlisted' AND ticket IS NOT NULL) OR (status<>'waitlisted' AND ticket IS NULL))
) ENGINE=InnoDB;

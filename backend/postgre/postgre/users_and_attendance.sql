-- ============================================
-- LIBRAX: USERS & ATTENDANCE SCHEMA
-- ============================================

-- Clean up previous versions
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_type_enum, user_status_enum, user_role_enum, gender_enum CASCADE;
DROP FUNCTION IF EXISTS generate_user_id() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;

-- ============================================
-- ENUM DEFINITIONS
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_type_enum AS ENUM ('staff', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('Active', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('Librarian', 'Administrative', 'Faculty', 'Student', 'Admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- SEQUENCES FOR USER ID GENERATION
-- ============================================
CREATE SEQUENCE seq_student START 1;
CREATE SEQUENCE seq_librarian START 1;
CREATE SEQUENCE seq_admin START 1;
CREATE SEQUENCE seq_faculty START 1;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    user_type user_type_enum NOT NULL,
    role user_role_enum,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender gender_enum,
    birthday DATE,
    address TEXT,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    student_faculty_id VARCHAR(20) UNIQUE,
    username VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    nfc_uid VARCHAR(20) UNIQUE,
    status user_status_enum NOT NULL DEFAULT 'Active',
    date_hired DATE,
    last_login TIMESTAMP,
    date_registered DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGERS FOR USERS TABLE
-- ============================================

-- Auto-update `updated_at`
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Auto-generate user_id based on role and year
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix CHAR(1);
    seq_val BIGINT;
    year_part CHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

    CASE NEW.role
        WHEN 'Student' THEN prefix := 'S'; seq_val := nextval('seq_student');
        WHEN 'Librarian' THEN prefix := 'L'; seq_val := nextval('seq_librarian');
        WHEN 'Admin' THEN prefix := 'A'; seq_val := nextval('seq_admin');
        WHEN 'Faculty' THEN prefix := 'F'; seq_val := nextval('seq_faculty');
        ELSE prefix := 'U'; seq_val := nextval('seq_student');
    END CASE;

    NEW.user_id := prefix || year_part || LPAD(seq_val::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_user_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION generate_user_id();

-- ============================================
-- LIBRAX: ATTENDANCE TABLE
-- ============================================
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE CASCADE,
    nfc_uid VARCHAR(20),
    reader_number INT NOT NULL,
    scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Present',
    remarks TEXT
);

-- Create an index to prevent multiple same-day entries
CREATE UNIQUE INDEX unique_user_per_day
ON attendance (user_id, (DATE(scan_time)));

-- Auto-update timestamp before insert
CREATE OR REPLACE FUNCTION update_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.scan_time := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attendance_timestamp
BEFORE INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_attendance_timestamp();

-- ============================================
-- VIEW FOR REPORTING
-- ============================================
CREATE OR REPLACE VIEW attendance_view AS
SELECT 
    a.attendance_id,
    a.scan_time,
    a.reader_number,
    a.status,
    u.user_id,
    u.first_name,
    u.last_name,
    u.role,
    u.nfc_uid
FROM attendance a
JOIN users u ON a.user_id = u.user_id
ORDER BY a.scan_time DESC;

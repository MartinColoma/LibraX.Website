-- ============================================
-- HOK LIBRARY: USERS TABLE (PostgreSQL Version)
-- ============================================

-- Clean up any old versions (optional)
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_type_enum CASCADE;
DROP TYPE IF EXISTS user_status_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;
DROP FUNCTION IF EXISTS generate_user_id() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP TRIGGER IF EXISTS before_insert_user_id ON users;

-- ============================================
-- ENUM TYPE DEFINITIONS
-- ============================================
DO $$
BEGIN
    CREATE TYPE user_type_enum AS ENUM ('staff', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE user_status_enum AS ENUM ('Active', 'Inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE user_role_enum AS ENUM ('Librarian', 'Administrative', 'Faculty', 'Student', 'Admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SEQUENCES PER ROLE (for ID generation)
-- ============================================
CREATE SEQUENCE seq_student START 1;
CREATE SEQUENCE seq_librarian START 1;
CREATE SEQUENCE seq_admin START 1;
CREATE SEQUENCE seq_faculty START 1;

-- ============================================
-- USERS TABLE STRUCTURE
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
    student_faculty_id VARCHAR(20) UNIQUE, -- generalizes student/faculty ID
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
-- TRIGGER FUNCTION: AUTO UPDATE 'updated_at'
-- ============================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================
-- TRIGGER FUNCTION: AUTO GENERATE USER_ID
-- ============================================
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix CHAR(1);
    seq_val BIGINT;
    year_part CHAR(4);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

    CASE NEW.role
        WHEN 'Student' THEN
            prefix := 'S';
            seq_val := nextval('seq_student');
        WHEN 'Librarian' THEN
            prefix := 'L';
            seq_val := nextval('seq_librarian');
        WHEN 'Admin' THEN
            prefix := 'A';
            seq_val := nextval('seq_admin');
        WHEN 'Faculty' THEN
            prefix := 'F';
            seq_val := nextval('seq_faculty');
        ELSE
            prefix := 'U';
            seq_val := nextval('seq_student');
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
-- SAMPLE DATA (Optional)
-- ============================================
INSERT INTO users (
    user_type, role, first_name, last_name, gender, birthday, address, email,
    phone_number, username, password_hash, nfc_uid, status, student_faculty_id, date_hired
) VALUES
('staff', 'Librarian', 'Martin', 'Coloma', 'Male', '1994-08-03', 'Cebu City', 'martin@hok.com',
 '09171234567', 'morphy', '$2b$10$gSmOL.qaqp3zRbQGI3Kv8edxjniIE.f/JLus2GLdSC6PV6rh5lewu', '04A1B23C45', 'Active', NULL, '2025-08-05'),
('staff', 'Admin', 'Karl', 'Iligan', 'Male', '1993-07-15', 'Davao City', 'karl@hok.com',
 '09123456789', 'karl', '$2b$10$KOgdaw6KrkVnlAbmKFyEROwZkO4JO5ZJ0EYQafRhCCqlmnnzkWvl.', '05B2C34D56', 'Active', NULL, '2025-08-01'),
('member', 'Student', 'Earl', 'Liporada', 'Male', '2003-02-20', 'Manila', 'earl@student.hok.edu',
 '09987654321', NULL, '$2b$10$J9hgT2MWKfFzP/E8yU6fwO6mZ.yKhklx4Yz1fK2z9squMIt1UeoA.', '07C3D45E67', 'Active', '2025-001122', NULL),
('member', 'Student', 'Jane', 'Doe', 'Female', '2002-06-11', 'Quezon City', 'jane@student.hok.edu',
 '09121231234', NULL, '$2b$10$OelP2vNRpUw4dGxgxKrf4eaEwzrfNf39S3c5B0HqJ0i6jHuSKWZlG', '08D4E56F78', 'Active', '2025-009988', NULL);

-- ============================================
-- CHECK RESULTS
-- ============================================
SELECT user_id, first_name, last_name, role, gender, birthday, address
FROM users;

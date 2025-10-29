-- ============================================
-- HOK LIBRARY: ATTENDANCE TABLE
-- ============================================

-- Clean up old version
DROP TABLE IF EXISTS attendance CASCADE;

-- ============================================
-- ATTENDANCE TABLE STRUCTURE
-- ============================================
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE CASCADE,
    nfc_uid VARCHAR(20) REFERENCES users(nfc_uid) ON DELETE CASCADE,
    reader_number INT NOT NULL,
    scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Present', -- Optional, future-proofing
    remarks TEXT, -- Optional: e.g., 'Late', 'Excused', 'Manual Entry'
    UNIQUE (user_id, scan_time::DATE) -- Prevent multiple same-day records
);

-- ============================================
-- TRIGGER FUNCTION: AUTO UPDATE TIMESTAMP (Optional)
-- ============================================
CREATE OR REPLACE FUNCTION update_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.scan_time = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attendance_timestamp
BEFORE INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_attendance_timestamp();

-- ============================================
-- VIEW FOR EASY REPORTING
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

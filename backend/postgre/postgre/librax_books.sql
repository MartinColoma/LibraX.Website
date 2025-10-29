-- Drop tables if they exist (for safe re-import)
DROP TABLE IF EXISTS inventory_logs CASCADE;

DROP TABLE IF EXISTS book_copies CASCADE;

DROP TABLE IF EXISTS book_authors CASCADE;

DROP TABLE IF EXISTS books CASCADE;

DROP TABLE IF EXISTS authors CASCADE;

DROP TABLE IF EXISTS categories CASCADE;

-- --------------------------------------------------------
-- Table: authors
-- --------------------------------------------------------
CREATE TABLE
    authors (
        author_id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        biography TEXT
    );

-- Insert authors
INSERT INTO
    authors (author_id, name, biography) OVERRIDING SYSTEM VALUE
VALUES
    (
        1,
        'Frank Herbert',
        'American science-fiction author, best known for Dune.'
    ),
    (
        2,
        'Walter Isaacson',
        'American biographer, known for books on historical figures.'
    ),
    (
        3,
        'Stuart Russell',
        'Professor of Computer Science at UC Berkeley. Co-author of AI textbook.'
    ),
    (
        4,
        'Peter Norvig',
        'Director of Research at Google and AI expert.'
    ),
    (2147483647, 'Martin Coloma', 'CpE Student');

-- --------------------------------------------------------
-- Table: categories
-- --------------------------------------------------------
CREATE TABLE
    categories (
        category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        category_name VARCHAR(255) NOT NULL UNIQUE,
        category_description TEXT,
        category_type VARCHAR(20) NOT NULL
    );

-- Insert categories
INSERT INTO
    categories (
        category_id,
        category_name,
        category_description,
        category_type
    ) OVERRIDING SYSTEM VALUE
VALUES
    (
        1,
        'Literary Fiction',
        'Character-driven, thought-provoking stories.',
        'Fiction'
    ),
    (
        2,
        'Classic Literature',
        'Timeless works from historical authors.',
        'Fiction'
    ),
    (
        3,
        'Historical Fiction',
        'Stories set in historical time periods.',
        'Fiction'
    ),
    (
        4,
        'Mystery / Detective',
        'Whodunits and detective investigations.',
        'Fiction'
    ),
    (
        5,
        'Thriller / Suspense',
        'Fast-paced, edge-of-your-seat narratives.',
        'Fiction'
    ),
    (
        6,
        'Crime Fiction',
        'Stories about crimes and criminals.',
        'Fiction'
    ),
    (
        7,
        'Horror',
        'Frightening stories with supernatural or psychological elements.',
        'Fiction'
    ),
    (
        8,
        'Fantasy',
        'Magical or mythical worlds and adventures.',
        'Fiction'
    ),
    (
        9,
        'Science Fiction',
        'Futuristic or scientific-based imaginative stories.',
        'Fiction'
    ),
    (
        10,
        'Dystopian / Post-Apocalyptic',
        'Futures with societal collapse or strict regimes.',
        'Fiction'
    ),
    (
        11,
        'Adventure',
        'Exciting journeys and explorations.',
        'Fiction'
    ),
    (
        12,
        'Action Fiction',
        'High-energy, action-driven plots.',
        'Fiction'
    ),
    (
        13,
        'Magical Realism',
        'Real-world settings with magical elements.',
        'Fiction'
    ),
    (
        14,
        'Mythology / Folklore',
        'Stories inspired by myths and legends.',
        'Fiction'
    ),
    (
        15,
        'Paranormal / Supernatural',
        'Ghosts, spirits, and other supernatural phenomena.',
        'Fiction'
    ),
    (
        16,
        'Romance',
        'Stories focused on love and relationships.',
        'Fiction'
    ),
    (
        17,
        'Contemporary Romance',
        'Modern-day love stories.',
        'Fiction'
    ),
    (
        18,
        'Historical Romance',
        'Love stories set in the past.',
        'Fiction'
    ),
    (
        19,
        'Romantic Suspense',
        'Love stories mixed with thrill and danger.',
        'Fiction'
    ),
    (
        20,
        'Young Adult (YA) Fiction',
        'Stories geared towards teenage readers.',
        'Fiction'
    ),
    (
        21,
        'Middle Grade Fiction',
        'Stories for pre-teens and young readers.',
        'Fiction'
    ),
    (
        22,
        'Children’s Fiction',
        'Stories for children and early readers.',
        'Fiction'
    ),
    (
        23,
        'Fairy Tales & Fables',
        'Traditional tales with moral lessons.',
        'Fiction'
    ),
    (
        24,
        'Graphic Novels / Comics / Manga',
        'Illustrated storytelling.',
        'Fiction'
    ),
    (
        25,
        'Humor / Satire',
        'Comedic and satirical narratives.',
        'Fiction'
    ),
    (
        26,
        'Short Story Collections',
        'Anthologies of fictional short stories.',
        'Fiction'
    ),
    (
        27,
        'Western Fiction',
        'Stories set in the American Old West.',
        'Fiction'
    ),
    (
        28,
        'War / Military Fiction',
        'Stories centered on war and soldiers.',
        'Fiction'
    ),
    (
        29,
        'Urban Fiction',
        'Stories set in urban or street environments.',
        'Fiction'
    ),
    (
        30,
        'LGBTQ+ Fiction',
        'Stories highlighting LGBTQ+ characters and themes.',
        'Fiction'
    ),
    (
        31,
        'Biographies & Autobiographies',
        'Life stories of real people.',
        'Non-Fiction'
    ),
    (
        32,
        'Memoirs',
        'Personal reflections and experiences.',
        'Non-Fiction'
    ),
    (
        33,
        'Self-Help / Personal Development',
        'Guides for improving life and mindset.',
        'Non-Fiction'
    ),
    (
        34,
        'Psychology',
        'The study of the human mind and behavior.',
        'Non-Fiction'
    ),
    (
        35,
        'Philosophy',
        'Books about wisdom, logic, and ethics.',
        'Non-Fiction'
    ),
    (
        36,
        'Religion / Spirituality',
        'Faith-based and spiritual texts.',
        'Non-Fiction'
    ),
    (
        37,
        'Science & Technology',
        'Books on scientific principles and innovations.',
        'Non-Fiction'
    ),
    (
        38,
        'Mathematics',
        'Books on math concepts and applications.',
        'Non-Fiction'
    ),
    (
        39,
        'Health & Wellness',
        'Guides on fitness, health, and medical topics.',
        'Non-Fiction'
    ),
    (
        40,
        'Cookbooks / Food & Drink',
        'Recipe collections and culinary guides.',
        'Non-Fiction'
    ),
    (
        41,
        'Travel / Adventure',
        'Travelogues and adventure guides.',
        'Non-Fiction'
    ),
    (
        42,
        'Art & Photography',
        'Books showcasing art, design, and photography.',
        'Non-Fiction'
    ),
    (
        43,
        'Music',
        'Books on music, musicians, and theory.',
        'Non-Fiction'
    ),
    (
        44,
        'History',
        'Historical analysis and events.',
        'Non-Fiction'
    ),
    (
        45,
        'Politics & Government',
        'Books about governance and political science.',
        'Non-Fiction'
    ),
    (
        46,
        'Economics / Business / Finance',
        'Business, finance, and economic principles.',
        'Non-Fiction'
    ),
    (
        47,
        'Education / Teaching',
        'Instructional and pedagogy resources.',
        'Non-Fiction'
    ),
    (
        48,
        'Parenting & Family',
        'Guides on raising children and family life.',
        'Non-Fiction'
    ),
    (
        49,
        'Sports & Recreation',
        'Books on sports, games, and leisure.',
        'Non-Fiction'
    ),
    (
        50,
        'Nature & Environment',
        'Books on ecosystems, wildlife, and conservation.',
        'Non-Fiction'
    ),
    (
        51,
        'True Crime',
        'Real-life crime stories and investigations.',
        'Non-Fiction'
    ),
    (
        52,
        'Cultural Studies / Anthropology',
        'Books on human societies and cultures.',
        'Non-Fiction'
    ),
    (
        53,
        'Sociology',
        'Study of social behavior and societies.',
        'Non-Fiction'
    ),
    (
        54,
        'Law',
        'Books on legal studies and regulations.',
        'Non-Fiction'
    ),
    (
        55,
        'Medical / Nursing / Healthcare',
        'Health profession-related books.',
        'Non-Fiction'
    ),
    (
        56,
        'Engineering & Technical Manuals',
        'Engineering and technical references.',
        'Non-Fiction'
    ),
    (
        57,
        'Computer Science / Programming',
        'Coding and computer-related books.',
        'Non-Fiction'
    ),
    (
        58,
        'Hobbies & Crafts',
        'Guides on crafts and hobbies.',
        'Non-Fiction'
    ),
    (
        59,
        'Home & Garden',
        'Home improvement and gardening guides.',
        'Non-Fiction'
    ),
    (
        60,
        'Reference Books',
        'Dictionaries, encyclopedias, and atlases.',
        'Non-Fiction'
    ),
    (
        61,
        'Audiobooks',
        'Books in audio format.',
        'Special'
    ),
    (
        62,
        'E-books',
        'Digital versions of books.',
        'Special'
    ),
    (
        63,
        'Periodicals',
        'Magazines and academic journals.',
        'Special'
    ),
    (
        64,
        'Newspapers',
        'Daily and weekly news publications.',
        'Special'
    ),
    (
        65,
        'Research Papers / Theses',
        'Academic research and graduate papers.',
        'Special'
    ),
    (
        66,
        'Local History / Archives',
        'Materials about local community history.',
        'Special'
    ),
    (
        67,
        'Maps & Atlases',
        'Geographical references and maps.',
        'Special'
    ),
    (
        68,
        'Government Publications',
        'Official government documents.',
        'Special'
    ),
    (
        69,
        'Rare Books / Special Collections',
        'Rare and valuable books.',
        'Special'
    );

-- --------------------------------------------------------
-- Table: books
-- --------------------------------------------------------
CREATE TABLE
    books (
        book_id VARCHAR(11) PRIMARY KEY,
        isbn VARCHAR(20),
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        description TEXT,
        publisher VARCHAR(255),
        publication_year INT,
        edition VARCHAR(50),
        category_id INT REFERENCES categories (category_id),
        language VARCHAR(50) DEFAULT 'English',
        date_added TIMESTAMP DEFAULT NOW ()
    );

-- Insert books
INSERT INTO
    books (
        book_id,
        isbn,
        title,
        subtitle,
        description,
        publisher,
        publication_year,
        edition,
        category_id,
        language,
        date_added
    ) OVERRIDING SYSTEM VALUE
VALUES
    (
        '1200956312',
        '213411234',
        'catt typo',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        7,
        'English',
        '2025-08-12 13:38:16'
    ),
    (
        '1460652468',
        '79846531',
        'Soda Pop',
        'hey hey',
        'hey hey',
        NULL,
        NULL,
        NULL,
        8,
        'English',
        '2025-08-12 12:17:36'
    ),
    (
        '3504139608',
        '12312312',
        'missing catt',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        30,
        'English',
        '2025-08-12 13:36:19'
    ),
    (
        '4020091340',
        '1234234',
        'Gabriela',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        17,
        'English',
        '2025-08-12 12:22:12'
    ),
    (
        '4614273899',
        '23412',
        'catt',
        NULL,
        NULL,
        'PBCOm',
        2021,
        '1st',
        10,
        'English',
        '2025-08-12 13:36:49'
    ),
    (
        '7725147954',
        '2341324',
        'Category Missing Again',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        12,
        'English',
        '2025-08-12 13:08:48'
    ),
    (
        '8016745074',
        '75445213',
        'Rolling in the Deep',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        8,
        'English',
        '2025-08-12 12:11:29'
    ),
    (
        '8108356816',
        '341324',
        'Golden',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        16,
        'English',
        '2025-08-12 12:10:42'
    );

-- --------------------------------------------------------
-- Table: book_authors
-- --------------------------------------------------------
CREATE TABLE
    book_authors (
        book_id VARCHAR(11) REFERENCES books (book_id),
        author_id INT REFERENCES authors (author_id),
        PRIMARY KEY (book_id, author_id)
    );

INSERT INTO
    book_authors (book_id, author_id) OVERRIDING SYSTEM VALUE
VALUES
    ('1200956312', 1),
    ('1460652468', 1),
    ('3504139608', 2147483647),
    ('4020091340', 3),
    ('4614273899', 3),
    ('7725147954', 3),
    ('8016745074', 1),
    ('8108356816', 2);

-- --------------------------------------------------------
-- Table: book_copies
-- --------------------------------------------------------
CREATE TABLE
    book_copies (
        copy_id VARCHAR(20) PRIMARY KEY,
        book_id VARCHAR(11) REFERENCES books (book_id),
        barcode BIGINT NOT NULL,
        status VARCHAR(20) DEFAULT 'Available',
        book_condition VARCHAR(20) DEFAULT 'Good',
        location VARCHAR(100) DEFAULT 'Main Shelf',
        date_added TIMESTAMP DEFAULT NOW ()
    );

-- --------------------------------------------------------
-- Table: inventory_logs
-- --------------------------------------------------------
CREATE TABLE
    inventory_logs (
        log_id VARCHAR(20) PRIMARY KEY,
        copy_id VARCHAR(20) REFERENCES book_copies (copy_id),
        action VARCHAR(20) NOT NULL,
        performed_by VARCHAR(255) DEFAULT 'System',
        log_date TIMESTAMP DEFAULT NOW ()
    );

COMMIT;
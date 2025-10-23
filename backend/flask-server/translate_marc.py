from pymarc import MARCReader

def safe_get(record, tag, code=None):
    """Safely get data from a MARC tag and subfield."""
    field = record.get_fields(tag)
    if not field:
        return "N/A"

    # If control field (like 001, 005, etc.)
    if field[0].is_control_field():
        return field[0].data.strip() if field[0].data else "N/A"

    # If subfield code is specified (like $a)
    if code:
        return field[0][code].strip(" /:;,.") if code in field[0] else "N/A"

    # If no specific subfield is given, concatenate all
    subfields = []
    for f in field:
        for k, v in f.get_subfields():
            subfields.append(f"${k} {v.strip(' /:;,.')}")
    return "; ".join(subfields) if subfields else "N/A"


def translate_marc(file_path):
    with open(file_path, 'rb') as fh:
        reader = MARCReader(fh)
        
        for i, record in enumerate(reader, start=1):
            print("=" * 60)
            print(f"📘 Translating MARC Record #{i}")
            print("=" * 60)

            # Common descriptive fields
            title = safe_get(record, '245', 'a')
            author = safe_get(record, '100', 'a') or safe_get(record, '110', 'a')
            publisher = safe_get(record, '260', 'b') if safe_get(record, '260', 'b') != "N/A" else safe_get(record, '264', 'b')
            year = safe_get(record, '260', 'c') if safe_get(record, '260', 'c') != "N/A" else safe_get(record, '264', 'c')
            isbn = safe_get(record, '020', 'a')
            subjects = ", ".join([field['a'] for field in record.get_fields('650') if 'a' in field]) or "N/A"

            # Control fields
            control_001 = safe_get(record, '001')
            control_005 = safe_get(record, '005')
            control_008 = safe_get(record, '008')

            # Other common metadata
            edition = safe_get(record, '250', 'a')
            description = safe_get(record, '300', 'a')
            notes = safe_get(record, '500', 'a')
            series = safe_get(record, '490', 'a')
            language = safe_get(record, '041', 'a')
            place = safe_get(record, '260', 'a') if safe_get(record, '260', 'a') != "N/A" else safe_get(record, '264', 'a')
            contributor = safe_get(record, '700', 'a')

            # Output results in a clean readable structure
            print(f"Control Number: {control_001}")
            print(f"Timestamp: {control_005}")
            print(f"Fixed-Length Data: {control_008}")
            print(f"Title: {title}")
            print(f"Author: {author}")
            print(f"Contributor: {contributor}")
            print(f"Edition: {edition}")
            print(f"Publisher: {publisher}")
            print(f"Place: {place}")
            print(f"Year: {year}")
            print(f"Description: {description}")
            print(f"Series: {series}")
            print(f"Language: {language}")
            print(f"ISBN: {isbn}")
            print(f"Subjects: {subjects}")
            print(f"Notes: {notes}")
            print()

if __name__ == "__main__":
    marc_file = input("Enter MARC file path (e.g. books.mrc): ").strip()
    translate_marc(marc_file)

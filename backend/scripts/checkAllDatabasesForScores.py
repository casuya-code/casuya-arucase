"""
Check all databases (PostgreSQL, MySQL, SQLite) for scores
Run: python backend/scripts/checkAllDatabasesForScores.py
"""
import os
import sys
from pathlib import Path

# Add parent directory to path to import database modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    POSTGRESQL_AVAILABLE = True
except ImportError:
    POSTGRESQL_AVAILABLE = False
    print("WARNING: psycopg2 not available - skipping PostgreSQL check")

try:
    import mysql.connector
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False
    print("WARNING: mysql-connector-python not available - skipping MySQL check")

try:
    import sqlite3
    SQLITE_AVAILABLE = True
except ImportError:
    SQLITE_AVAILABLE = False
    print("WARNING: sqlite3 not available - skipping SQLite check")

def check_postgresql_scores():
    """Check PostgreSQL database for scores"""
    if not POSTGRESQL_AVAILABLE:
        return None
    
    try:
        # Get PostgreSQL config from environment
        config = {
            'host': os.environ.get('PGHOST') or os.environ.get('POSTGRES_HOST', 'localhost'),
            'port': int(os.environ.get('PGPORT') or os.environ.get('POSTGRES_PORT', 5432)),
            'user': os.environ.get('PGUSER') or os.environ.get('POSTGRES_USER', 'postgres'),
            'password': os.environ.get('PGPASSWORD') or os.environ.get('POSTGRES_PASSWORD', ''),
            'database': os.environ.get('PGDATABASE') or os.environ.get('POSTGRES_DB', 'railway'),
        }
        
        # Try DATABASE_URL if available (Railway)
        if os.environ.get('DATABASE_URL'):
            conn = psycopg2.connect(os.environ.get('DATABASE_URL'), sslmode='require')
        else:
            conn = psycopg2.connect(**config)
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if individual_scores table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'individual_scores'
            );
        """)
        table_exists = cursor.fetchone()['exists']
        
        if not table_exists:
            print("ERROR: PostgreSQL: individual_scores table does not exist")
            conn.close()
            return None
        
        # Count total scores
        cursor.execute("SELECT COUNT(*) as count FROM individual_scores")
        total_count = cursor.fetchone()['count']
        
        # Check for FORM I 2025 scores
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' AND year = 2025
        """)
        form_one_count = cursor.fetchone()['count']
        
        # Check for specific query: FORM I | A | 2025 | 0111 | November
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' 
            AND stream = 'A' 
            AND year = 2025 
            AND subject_code = '0111' 
            AND month = 'November'
        """)
        specific_count = cursor.fetchone()['count']
        
        # Check for stream NA
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' 
            AND stream = 'NA' 
            AND year = 2025 
            AND subject_code = '0111' 
            AND month = 'November'
        """)
        na_count = cursor.fetchone()['count']
        
        # Get all streams/subjects/months for FORM I 2025
        cursor.execute("""
            SELECT stream, subject_code, month, COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' AND year = 2025
            GROUP BY stream, subject_code, month
            ORDER BY stream, subject_code, month
        """)
        all_form_one = cursor.fetchall()
        
        # Get sample scores
        cursor.execute("""
            SELECT adm_no, score, stream, subject_code, month
            FROM individual_scores 
            WHERE level = 'FORM I' AND year = 2025
            ORDER BY stream, subject_code, month, adm_no
            LIMIT 10
        """)
        samples = cursor.fetchall()
        
        conn.close()
        
        return {
            'database': 'PostgreSQL',
            'total_scores': total_count,
            'form_one_2025_scores': form_one_count,
            'specific_query': {
                'level': 'FORM I',
                'stream': 'A',
                'year': 2025,
                'subject_code': '0111',
                'month': 'November',
                'count': specific_count
            },
            'na_stream_count': na_count,
            'all_form_one': all_form_one,
            'samples': samples
        }
    except Exception as e:
        print(f"ERROR: PostgreSQL Error: {e}")
        return None

def check_mysql_scores():
    """Check MySQL database for scores"""
    if not MYSQL_AVAILABLE:
        return None
    
    try:
        # Try to get MySQL config from environment or use defaults
        config = {
            'host': os.environ.get('MYSQL_HOST', 'localhost'),
            'user': os.environ.get('MYSQL_USER', 'root'),
            'password': os.environ.get('MYSQL_PASSWORD', ''),
            'database': os.environ.get('MYSQL_DATABASE', 'arucase'),
            'port': int(os.environ.get('MYSQL_PORT', 3306)),
        }
        
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor(dictionary=True)
        
        # Check if individual_scores table exists
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = %s 
            AND table_name = 'individual_scores'
        """, (config['database'],))
        table_exists = cursor.fetchone()['count'] > 0
        
        if not table_exists:
            print("ERROR: MySQL: individual_scores table does not exist")
            conn.close()
            return None
        
        # Count total scores
        cursor.execute("SELECT COUNT(*) as count FROM individual_scores")
        total_count = cursor.fetchone()['count']
        
        # Check for FORM I 2025 scores
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' AND year = 2025
        """)
        form_one_count = cursor.fetchone()['count']
        
        # Check for specific query
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' 
            AND stream = 'A' 
            AND year = 2025 
            AND subject_code = '0111' 
            AND month = 'November'
        """)
        specific_count = cursor.fetchone()['count']
        
        # Check for stream NA
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' 
            AND stream = 'NA' 
            AND year = 2025 
            AND subject_code = '0111' 
            AND month = 'November'
        """)
        na_count = cursor.fetchone()['count']
        
        # Get all streams/subjects/months for FORM I 2025
        cursor.execute("""
            SELECT stream, subject_code, month, COUNT(*) as count 
            FROM individual_scores 
            WHERE level = 'FORM I' AND year = 2025
            GROUP BY stream, subject_code, month
            ORDER BY stream, subject_code, month
        """)
        all_form_one = cursor.fetchall()
        
        # Get sample scores
        cursor.execute("""
            SELECT adm_no, score, stream, subject_code, month
            FROM individual_scores 
            WHERE level = 'FORM I' AND year = 2025
            ORDER BY stream, subject_code, month, adm_no
            LIMIT 10
        """)
        samples = cursor.fetchall()
        
        conn.close()
        
        return {
            'database': 'MySQL',
            'total_scores': total_count,
            'form_one_2025_scores': form_one_count,
            'specific_query': {
                'level': 'FORM I',
                'stream': 'A',
                'year': 2025,
                'subject_code': '0111',
                'month': 'November',
                'count': specific_count
            },
            'na_stream_count': na_count,
            'all_form_one': all_form_one,
            'samples': samples
        }
    except Exception as e:
        print(f"ERROR: MySQL Error: {e}")
        return None

def check_sqlite_scores():
    """Check SQLite database files for scores"""
    if not SQLITE_AVAILABLE:
        return None
    
    results = []
    
    # Common SQLite database locations
    sqlite_paths = [
        Path(__file__).parent.parent.parent / 'data' / 'arucase.db',
        Path(__file__).parent.parent.parent / 'arucase.db',
        Path(__file__).parent.parent.parent / 'data' / '*.db',
    ]
    
    # Also check arucase456copy directory
    copy_dir = Path(__file__).parent.parent.parent.parent / 'arucase456copy' / 'data'
    if copy_dir.exists():
        sqlite_paths.extend(copy_dir.glob('*.db'))
    
    for db_path in sqlite_paths:
        if isinstance(db_path, Path) and not db_path.exists():
            continue
        
        try:
            if '*' in str(db_path):
                continue  # Skip glob patterns for now
            
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Check if individual_scores table exists
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='individual_scores'
            """)
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                print(f"ERROR: SQLite ({db_path}): individual_scores table does not exist")
                conn.close()
                continue
            
            # Count total scores
            cursor.execute("SELECT COUNT(*) as count FROM individual_scores")
            total_count = cursor.fetchone()[0]
            
            # Check for FORM I 2025 scores
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM individual_scores 
                WHERE level = 'FORM I' AND year = 2025
            """)
            form_one_count = cursor.fetchone()[0]
            
            # Check for specific query
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM individual_scores 
                WHERE level = 'FORM I' 
                AND stream = 'A' 
                AND year = 2025 
                AND subject_code = '0111' 
                AND month = 'November'
            """)
            specific_count = cursor.fetchone()[0]
            
            # Check for stream NA
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM individual_scores 
                WHERE level = 'FORM I' 
                AND stream = 'NA' 
                AND year = 2025 
                AND subject_code = '0111' 
                AND month = 'November'
            """)
            na_count = cursor.fetchone()[0]
            
            # Get all streams/subjects/months for FORM I 2025
            cursor.execute("""
                SELECT stream, subject_code, month, COUNT(*) as count 
                FROM individual_scores 
                WHERE level = 'FORM I' AND year = 2025
                GROUP BY stream, subject_code, month
                ORDER BY stream, subject_code, month
            """)
            all_form_one = [dict(row) for row in cursor.fetchall()]
            
            # Get sample scores
            cursor.execute("""
                SELECT adm_no, score, stream, subject_code, month
                FROM individual_scores 
                WHERE level = 'FORM I' AND year = 2025
                ORDER BY stream, subject_code, month, adm_no
                LIMIT 10
            """)
            samples = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            results.append({
                'database': f'SQLite ({db_path.name})',
                'path': str(db_path),
                'total_scores': total_count,
                'form_one_2025_scores': form_one_count,
                'specific_query': {
                    'level': 'FORM I',
                    'stream': 'A',
                    'year': 2025,
                    'subject_code': '0111',
                    'month': 'November',
                    'count': specific_count
                },
                'na_stream_count': na_count,
                'all_form_one': all_form_one,
                'samples': samples
            })
        except Exception as e:
            print(f"ERROR: SQLite Error ({db_path}): {e}")
            continue
    
    return results if results else None

def main():
    print("=" * 80)
    print("CHECKING ALL DATABASES FOR SCORES")
    print("=" * 80)
    print()
    
    all_results = []
    
    # Check PostgreSQL
    print("Checking PostgreSQL...")
    pg_result = check_postgresql_scores()
    if pg_result:
        all_results.append(pg_result)
        print(f"SUCCESS: PostgreSQL: Found {pg_result['total_scores']} total scores")
    else:
        print("ERROR: PostgreSQL: No scores found or connection failed")
    print()
    
    # Check MySQL
    print("Checking MySQL...")
    mysql_result = check_mysql_scores()
    if mysql_result:
        all_results.append(mysql_result)
        print(f"SUCCESS: MySQL: Found {mysql_result['total_scores']} total scores")
    else:
        print("ERROR: MySQL: No scores found or connection failed")
    print()
    
    # Check SQLite
    print("Checking SQLite databases...")
    sqlite_results = check_sqlite_scores()
    if sqlite_results:
        all_results.extend(sqlite_results)
        for result in sqlite_results:
            print(f"SUCCESS: {result['database']}: Found {result['total_scores']} total scores")
    else:
        print("ERROR: SQLite: No scores found or no databases found")
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    
    if not all_results:
        print("ERROR: NO SCORES FOUND IN ANY DATABASE")
        print()
        print("This means:")
        print("  1. Scores have not been entered yet for FORM I 2025")
        print("  2. The score entry page is working correctly (showing empty fields)")
        print("  3. You can now enter scores using the score entry page")
        return
    
    for result in all_results:
        print(f"\nDATABASE: {result['database']}")
        print(f"   Total scores: {result['total_scores']}")
        print(f"   FORM I 2025 scores: {result['form_one_2025_scores']}")
        print(f"   Specific query (FORM I | A | 2025 | 0111 | November): {result['specific_query']['count']}")
        print(f"   Stream NA count: {result['na_stream_count']}")
        
        if result['all_form_one']:
            print(f"\n   All FORM I 2025 scores by stream/subject/month:")
            for row in result['all_form_one']:
                stream = row.get('stream', row.get('Stream', 'N/A'))
                subject = row.get('subject_code', row.get('subject_code', 'N/A'))
                month = row.get('month', row.get('Month', 'N/A'))
                count = row.get('count', row.get('Count', 0))
                print(f"      Stream: {stream}, Subject: {subject}, Month: {month}, Count: {count}")
        
        if result['samples']:
            print(f"\n   Sample scores (first 10):")
            for idx, sample in enumerate(result['samples'], 1):
                adm_no = sample.get('adm_no', sample.get('adm_no', 'N/A'))
                score = sample.get('score', sample.get('Score', 'N/A'))
                stream = sample.get('stream', sample.get('Stream', 'N/A'))
                subject = sample.get('subject_code', sample.get('subject_code', 'N/A'))
                month = sample.get('month', sample.get('Month', 'N/A'))
                print(f"      {idx}. Adm No: {adm_no}, Score: {score}, Stream: {stream}, Subject: {subject}, Month: {month}")
    
    print()
    print("=" * 80)

if __name__ == '__main__':
    main()

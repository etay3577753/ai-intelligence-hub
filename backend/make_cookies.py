"""
יוצר קובץ cookies.txt מה-sessionid של אינסטגרם.

שימוש:
  python make_cookies.py SESSION_ID_כאן

איך להשיג את ה-session ID?
  1. פתח Chrome ועבור ל: https://www.instagram.com
  2. לחץ F12 → לשונית "Application"
  3. בצד שמאל: Storage → Cookies → https://www.instagram.com
  4. מצא את השורה "sessionid" → העתק את הערך בעמודה "Value"
  5. הרץ: python make_cookies.py VALUE_שהעתקת
"""

import sys
from pathlib import Path

OUTPUT = Path(__file__).parent / "cookies.txt"

def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print("שימוש: python make_cookies.py SESSION_ID")
        print()
        print("איך להשיג session ID:")
        print("  1. פתח Chrome → instagram.com")
        print("  2. F12 → Application → Cookies → https://www.instagram.com")
        print("  3. מצא 'sessionid' → העתק את ה-Value")
        print("  4. הרץ שוב: python make_cookies.py VALUE")
        sys.exit(1)

    session_id = sys.argv[1].strip()

    cookies_content = f"""# Netscape HTTP Cookie File
# Generated for Instagram
.instagram.com\tTRUE\t/\tTRUE\t9999999999\tsessionid\t{session_id}
"""

    OUTPUT.write_text(cookies_content, encoding="utf-8")
    print(f"נשמר: {OUTPUT}")
    print("עכשיו הרץ:")
    print(f'  python facebook_import.py fetch --page "https://www.instagram.com/eliron.giny/reels/" --cookies cookies.txt --data data/ig_posts.json')

if __name__ == "__main__":
    main()

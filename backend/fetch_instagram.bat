@echo off
echo ===================================================
echo  ייבוא תיאורים מאינסטגרם - אלירן גיני
echo ===================================================
echo.
echo שלב 1: סוגר את Chrome כדי לגשת ל-cookies...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo שלב 2: מוריד תיאורים מאינסטגרם...
cd /d "%~dp0"
yt-dlp --flat-playlist --print "%%(id)s	%%(title)s	%%(description)s	%%(webpage_url)s" --no-warnings --ignore-errors --cookies-from-browser chrome "https://www.instagram.com/eliron.giny/reels/" > data\ig_raw.txt 2>&1

echo שלב 3: בודק תוצאות...
type data\ig_raw.txt | head -5 2>nul || (for /f "tokens=1,2,3,4 delims=	" %%a in (data\ig_raw.txt) do echo %%a - %%b)

echo.
echo שלב 4: מעבד ומייבא לקבצי wiki...
python ig_import.py

echo.
echo סיים! תוכל לפתוח Chrome מחדש.
pause

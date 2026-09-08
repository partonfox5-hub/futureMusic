@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Run install.bat first.
  exit /b 1
)
call .venv\Scripts\activate.bat
echo Voice studio  http://127.0.0.1:7860
echo Clone on this laptop. Quest only plays baked ogg files.
python app.py

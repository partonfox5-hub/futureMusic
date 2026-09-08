@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher "py" not found. Install Python 3.11 and retry.
  exit /b 1
)

echo Creating venv with Python 3.11...
py -3.11 -m venv .venv
if errorlevel 1 (
  echo Failed to create venv. Is Python 3.11 installed?
  exit /b 1
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
echo Installing CUDA PyTorch (cu128). If this fails, see README.md.
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
if errorlevel 1 (
  echo CUDA wheel failed. Installing CPU torch as a last resort (slow).
  python -m pip install torch torchaudio
)
python -m pip install -r requirements.txt
echo.
echo Done. Run run.bat  then open http://127.0.0.1:7860
echo Drop only recordings you made or have a written license to clone.
endlocal

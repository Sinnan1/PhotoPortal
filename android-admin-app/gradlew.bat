@echo off
echo Gradle wrapper not found. Please run this on a machine with Android Studio
echo or use GitHub Actions to build the APK automatically.
echo.
echo To build via GitHub Actions:
echo 1. Push this code to GitHub
echo 2. Go to Actions tab
echo 3. Run "Build Android APK" workflow
echo 4. Download the APK from artifacts
exit /b 1

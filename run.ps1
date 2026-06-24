# Script khởi động ứng dụng - tự động dừng process cũ
Write-Host "Dang dung cac process QLDV cu..." -ForegroundColor Yellow
Get-Process -Name "QLDV" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Write-Host "Dang khoi dong ung dung..." -ForegroundColor Green
dotnet run

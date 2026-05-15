using Microsoft.EntityFrameworkCore;
using QLDV.Data;
using QLDV.Models;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace QLDV.Services
{
    public class FileService : IFileService
    {
        private readonly IWebHostEnvironment _environment;

        public FileService(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public async Task<string> SaveFileAsync(IFormFile file, string subFolder)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is empty");

            var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", subFolder);
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return fileName;
        }

        public bool DeleteFile(string filePath)
        {
            var fullPath = Path.Combine(_environment.WebRootPath, filePath.TrimStart('/'));
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                return true;
            }
            return false;
        }

        public string GetFileUrl(string fileName, string subFolder)
        {
            return $"/uploads/{subFolder}/{fileName}";
        }
    }

    public class MovementService : IMovementService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;

        public MovementService(ApplicationDbContext context, ILogService logService)
        {
            _context = context;
            _logService = logService;
        }

        public async Task<List<Movement>> GetAllMovementsAsync()
        {
            return await _context.Movements
                .Include(m => m.Reports)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Movement?> GetMovementByIdAsync(string id)
        {
            return await _context.Movements
                .Include(m => m.Reports)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<Movement> CreateMovementAsync(Movement movement)
        {
            movement.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.Movements.Add(movement);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                movement.CreatorId, "System", "CREATE", "Movement", movement.Id,
                $"Tạo phong trào: {movement.Title}");

            return movement;
        }

        public async Task UpdateMovementAsync(Movement movement)
        {
            _context.Movements.Update(movement);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                movement.CreatorId, "System", "UPDATE", "Movement", movement.Id,
                $"Cập nhật phong trào: {movement.Title}");
        }

        public async Task DeleteMovementAsync(string id)
        {
            var movement = await GetMovementByIdAsync(id);
            if (movement == null) throw new Exception("Movement not found");

            _context.Movements.Remove(movement);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                movement.CreatorId, "System", "DELETE", "Movement", id,
                $"Xóa phong trào: {movement.Title}");
        }

        public async Task<List<MovementReport>> GetReportsByMovementAsync(string movementId)
        {
            return await _context.MovementReports
                .Where(r => r.MovementId == movementId)
                .Include(r => r.Unit)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<MovementReport> SubmitReportAsync(MovementReport report)
        {
            report.SubmittedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.MovementReports.Add(report);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                report.UnitId, "System", "SUBMIT_REPORT", "MovementReport", report.Id,
                $"Gửi báo cáo cho phong trào");

            return report;
        }

        public async Task UpdateReportAsync(MovementReport report)
        {
            _context.MovementReports.Update(report);
            await _context.SaveChangesAsync();
        }
    }

    public class StatisticsService : IStatisticsService
    {
        private readonly ApplicationDbContext _context;

        public StatisticsService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Dictionary<string, int>> GetMemberCountByStatusAsync()
        {
            return await _context.Members
                .GroupBy(m => m.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);
        }

        public async Task<Dictionary<string, int>> GetMemberCountByGenderAsync()
        {
            return await _context.Members
                .GroupBy(m => m.Gender)
                .Select(g => new { Gender = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Gender, x => x.Count);
        }

        public async Task<Dictionary<string, int>> GetMemberCountByAchievementAsync()
        {
            return await _context.Members
                .GroupBy(m => m.AchievementLevel)
                .Select(g => new { Achievement = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Achievement, x => x.Count);
        }

        public async Task<int> GetTotalMembersAsync()
        {
            return await _context.Members.CountAsync();
        }

        public async Task<List<dynamic>> GetMembersByUnitAsync()
        {
            var result = await _context.Members
                .GroupBy(m => m.UnitId)
                .Select(g => new
                {
                    UnitId = g.Key,
                    Count = g.Count(),
                    Unit = g.First().Unit!.Name
                })
                .ToListAsync();

            return result.Cast<dynamic>().ToList();
        }
    }

    public class LogService : ILogService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<ApplicationUser> _userManager;

        public LogService(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _userManager = userManager;
        }

        public async Task<List<SystemLog>> GetLogsAsync(int take = 100)
        {
            return await _context.SystemLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(take)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<SystemLog>> GetLogsByActionAsync(string action, int take = 100)
        {
            return await _context.SystemLogs
                .Where(l => l.Action == action)
                .OrderByDescending(l => l.Timestamp)
                .Take(take)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<SystemLog>> GetLogsByUserAsync(string userId, int take = 100)
        {
            return await _context.SystemLogs
                .Where(l => l.UserId == userId)
                .OrderByDescending(l => l.Timestamp)
                .Take(take)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task LogActivityAsync(string userId, string userName, string action, string entityType, string entityId, string details)
        {
            if (string.IsNullOrEmpty(userId) || userId == "System")
            {
                var user = _httpContextAccessor.HttpContext?.User;
                if (user?.Identity?.IsAuthenticated == true)
                {
                    userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? userId;
                    var appUser = await _userManager.GetUserAsync(user);
                    userName = appUser?.FullName ?? user.Identity.Name ?? userName;
                }
            }

            var log = new SystemLog
            {
                UserId = userId,
                UserName = userName,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Details = details,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            _context.SystemLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }

    public class GoogleAIService : IGoogleAIService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public GoogleAIService(IConfiguration configuration, HttpClient httpClient)
        {
            _configuration = configuration;
            _httpClient = httpClient;
        }

        public async Task<string> GenerateResponseAsync(string prompt)
        {
            try
            {
                var apiKey = _configuration["GoogleAI:ApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                    return "Google AI API key not configured. Please set GoogleAI:ApiKey in appsettings.json";

                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={apiKey}";
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = prompt }
                            }
                        }
                    }
                };

                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                var response = await _httpClient.PostAsync(url, content);
                if (!response.IsSuccessStatusCode)
                    return $"Error calling Google AI: {response.StatusCode}";

                var responseContent = await response.Content.ReadAsStringAsync();
                var jsonResponse = JsonDocument.Parse(responseContent);
                
                var text = jsonResponse.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                return text ?? "No response generated";
            }
            catch (Exception ex)
            {
                return $"Error calling Google AI: {ex.Message}";
            }
        }

        public async Task<string> AnalyzeDataAsync(string data, string query)
        {
            try
            {
                var analysisPrompt = $"Analyze the following data:\n{data}\n\nAnswer this query: {query}";
                return await GenerateResponseAsync(analysisPrompt);
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }
    }
}

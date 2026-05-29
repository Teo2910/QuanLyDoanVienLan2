using System;
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
using Microsoft.AspNetCore.SignalR;

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
        private readonly IHubContext<QLDV.Hubs.ChatHub> _hubContext;

        public MovementService(ApplicationDbContext context, ILogService logService, IHubContext<QLDV.Hubs.ChatHub> hubContext)
        {
            _context = context;
            _logService = logService;
            _hubContext = hubContext;
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

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Movement");

            return movement;
        }

        public async Task UpdateMovementAsync(Movement movement)
        {
            _context.Movements.Update(movement);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                movement.CreatorId, "System", "UPDATE", "Movement", movement.Id,
                $"Cập nhật phong trào: {movement.Title}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Movement");
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

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Movement");
        }

        public async Task<List<MovementReport>> GetReportsByMovementAsync(string movementId)
        {
            return await _context.MovementReports
                .Where(r => r.MovementId == movementId)
                .Include(r => r.Unit)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<MovementReport?> GetReportByIdAsync(string id)
        {
            return await _context.MovementReports
                .Include(r => r.Unit)
                .Include(r => r.Movement)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<MovementReport> SubmitReportAsync(MovementReport report)
        {
            report.SubmittedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            if (report.SubmissionCount <= 0) report.SubmissionCount = 1;
            _context.MovementReports.Add(report);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                report.UnitId, "System", "SUBMIT_REPORT", "MovementReport", report.Id,
                $"Gửi báo cáo cho phong trào");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Movement");

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

        public async Task<Dictionary<string, int>> GetMemberCountByEthnicAsync()
        {
            return await _context.Members
                .GroupBy(m => m.Ethnic)
                .Select(g => new { Ethnic = g.Key ?? "Chưa cập nhật", Count = g.Count() })
                .ToDictionaryAsync(x => x.Ethnic, x => x.Count);
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

        public async Task<List<UnitStatisticsViewModel>> GetDetailedUnitStatisticsAsync()
        {
            var units = await _context.Units.Include(u => u.Members).ToListAsync();
            var stats = new List<UnitStatisticsViewModel>();

            foreach (var unit in units)
            {
                var members = unit.Members;
                stats.Add(new UnitStatisticsViewModel
                {
                    UnitName = unit.Name,
                    Total = members.Count,
                    Male = members.Count(m => m.Gender == "Nam"),
                    Female = members.Count(m => m.Gender == "Nữ"),
                    Kinh = members.Count(m => m.Ethnic == "Kinh"),
                    OtherEthnic = members.Count(m => m.Ethnic != "Kinh" && !string.IsNullOrEmpty(m.Ethnic)),
                    HasReligion = members.Count(m => !string.IsNullOrEmpty(m.Religion) && m.Religion != "Không"),
                    NoReligion = members.Count(m => string.IsNullOrEmpty(m.Religion) || m.Religion == "Không"),
                    Active = members.Count(m => m.Status == "Đang sinh hoạt"),
                    Transferred = members.Count(m => m.Status == "Đã chuyển sinh hoạt"),
                    Graduated = members.Count(m => m.Status == "Đã trưởng thành"),
                    Excellent = members.Count(m => m.AchievementLevel == "Xuất sắc"),
                    Good = members.Count(m => m.AchievementLevel == "Khá"),
                    Average = members.Count(m => m.AchievementLevel == "Trung bình"),
                    Outstanding = members.Count(m => m.IsOutstanding)
                });
            }

            return stats;
        }

        public async Task<int> GetTotalOutstandingCountAsync()
        {
            return await _context.Members.CountAsync(m => m.IsOutstanding);
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
        private readonly IServiceProvider _serviceProvider;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<QLDV.Hubs.ChatHub> _hubContext;

        public GoogleAIService(
            IConfiguration configuration, 
            HttpClient httpClient, 
            IServiceProvider serviceProvider,
            Microsoft.AspNetCore.SignalR.IHubContext<QLDV.Hubs.ChatHub> hubContext)
        {
            _configuration = configuration;
            _httpClient = httpClient;
            _serviceProvider = serviceProvider;
            _hubContext = hubContext;
        }

        public async Task<string> GenerateResponseAsync(string prompt)
        {
            try
            {
                var apiKey = _configuration["GoogleAI:ApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                    return "Google AI API key not configured. Please set GoogleAI:ApiKey in appsettings.json";

                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={apiKey}";
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
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return $"Error calling Google AI ({response.StatusCode}): {responseContent}";

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

        public async Task<string> ProcessSmartCommandAsync(string userId, string message)
        {
            try
            {
                // System Prompt to guide the AI with more detail
                var systemPrompt = @"Bạn là trợ lý AI cấp cao cho hệ thống Quản lý Đoàn (DLU Intelligent Core).
Nhiệm vụ của bạn là chuyển đổi yêu cầu ngôn ngữ tự nhiên thành hành động dữ liệu JSON.

DƯỚI ĐÂY LÀ QUY TẮC CỰC KỲ QUAN TRỌNG:
1. LUÔN TRẢ VỀ JSON theo cấu trúc: {""action"": ""..."", ""data"": { ... }, ""reply"": ""...""}
2. Nếu người dùng yêu cầu tạo/thêm (ví dụ: 'Tạo đoàn viên tên Huy'), hãy tự tạo các dữ liệu còn thiếu một cách hợp lý.
3. Nếu người dùng chỉ hỏi bình thường, action là ""REPLY"".
4. Nếu người dùng hỏi về quy định, hướng dẫn, nghiệp vụ Đoàn, hoặc cách thực hiện các thủ tục, hãy sử dụng action ""KNOWLEDGE_QUERY"".

THÔNG TIN SCHEMA DỮ LIỆU:
- ĐOÀN VIÊN (CREATE_MEMBER / UPDATE_MEMBER):
  + FullName (string, BẮT BUỘC)
  + MemberId (string, tự tạo nếu thiếu, VD: DV001)
  + DOB (string, format YYYY-MM-DD, tự tạo nếu thiếu)
  + Gender (string: 'Nam' hoặc 'Nữ')
  + UnitId (string, Id của đơn vị, chọn đại 1 Id như 'U001' nếu không rõ)
  + Status (string: 'Đang sinh hoạt', 'Đã chuyển đi', 'Đã trưởng thành')
  + AchievementLevel (string: 'Xuất sắc', 'Khá', 'Trung bình')
  + Ethnic (string: 'Kinh', ...)
  + IsOutstanding (boolean)

- HOẠT ĐỘNG (CREATE_ACTIVITY / UPDATE_ACTIVITY): (Sử dụng cho các sự kiện cụ thể, ngắn hạn)
  + Title (string, BẮT BUỘC)
  + Date (string, format YYYY-MM-DD, tự tạo nếu thiếu)
  + Location (string, tự tạo nếu thiếu)
  + Description (string)
  + Type (string: 'Meeting', 'Training', 'Event', 'Seminar', 'Other')

- ĐƠN VỊ CHI ĐOÀN (CREATE_UNIT):
  + Name (string, BẮT BUỘC, VD: Chi đoàn 12A1)
  + Code (string, BẮT BUỘC, tự tạo nếu thiếu, VD: CD001)
  + ParentId (string, Id đơn vị cấp trên nếu có)

- PHONG TRÀO & BÁO CÁO (CREATE_MOVEMENT): (Sử dụng cho các phong trào thi đua, chiến dịch dài hạn cần báo cáo)
  + Title (string, BẮT BUỘC)
  + Description (string)
  + StartDate (string, YYYY-MM-DD)
  + EndDate (string, YYYY-MM-DD)

- XÓA DỮ LIỆU (DELETE_MEMBER / DELETE_UNIT / DELETE_ACTIVITY / DELETE_MOVEMENT):
  + Name (string, Tên hoặc tiêu đề chính xác của đối tượng cần xóa)

- KIẾN THỨC (KNOWLEDGE_QUERY):
  + SearchTerm (string, từ khóa để tìm trong tài liệu nghiệp vụ)

VÍ DỤ HÀNH ĐỘNG:
- 'Tạo đoàn viên tên Huy':
  {""action"": ""CREATE_MEMBER"", ""data"": {""FullName"": ""Nguyễn Quốc Huy"", ""MemberId"": ""DV009"", ""DOB"": ""2005-01-01"", ""Gender"": ""Nam"", ""UnitId"": ""U001"", ""Status"": ""Đang sinh hoạt""}, ""reply"": ""Đang tạo hồ sơ đoàn viên cho Huy...""}
- 'Tạo đơn vị Chi đoàn 10A1':
  {""action"": ""CREATE_UNIT"", ""data"": {""Name"": ""Chi đoàn 10A1"", ""Code"": ""CD10A1""}, ""reply"": ""Đang khởi tạo đơn vị mới trên hệ thống...""}
- 'Quy định kết nạp Đoàn là gì?':
  {""action"": ""KNOWLEDGE_QUERY"", ""data"": {""SearchTerm"": ""kết nạp Đoàn""}, ""reply"": ""Để tôi kiểm tra tài liệu nghiệp vụ về việc kết nạp Đoàn...""}
- 'Phát động phong trào Mùa hè xanh':
  {""action"": ""CREATE_MOVEMENT"", ""data"": {""Title"": ""Chi chiến dịch Mùa hè xanh 2026"", ""Description"": ""Phong trào tình nguyện hè dành cho đoàn viên"", ""StartDate"": ""2026-06-01"", ""EndDate"": ""2026-08-31""}, ""reply"": ""Đang khởi tạo phong trào Mùa hè xanh trên hệ thống...""}
- 'Xóa phong trào 285':
  {""action"": ""DELETE_MOVEMENT"", ""data"": {""Name"": ""Phong trào 285""}, ""reply"": ""Đang thực hiện xóa phong trào 285 khỏi hệ thống quản lý...""}

LƯU Ý: CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH.";

                var fullPrompt = $"{systemPrompt}\n\nNgười dùng: {message}";
                var aiRawResponse = await GenerateResponseAsync(fullPrompt);
                
                // Try to extract JSON from the response
                string jsonString = aiRawResponse;
                if (aiRawResponse.Contains("```json"))
                {
                    jsonString = aiRawResponse.Split("```json")[1].Split("```")[0].Trim();
                }
                else if (aiRawResponse.Contains("{"))
                {
                    jsonString = aiRawResponse.Substring(aiRawResponse.IndexOf("{"));
                    jsonString = jsonString.Substring(0, jsonString.LastIndexOf("}") + 1);
                }

                try
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var command = JsonSerializer.Deserialize<SmartCommand>(jsonString, options);
                    
                    if (command == null || string.IsNullOrEmpty(command.Action)) return aiRawResponse;

                    using var scope = _serviceProvider.CreateScope();
                    var memberService = scope.ServiceProvider.GetRequiredService<IMemberService>();
                    var activityService = scope.ServiceProvider.GetRequiredService<IActivityService>();
                    var unitService = scope.ServiceProvider.GetRequiredService<IUnitService>();
                    var kbService = scope.ServiceProvider.GetRequiredService<IKnowledgeBaseService>();
                    var movementService = scope.ServiceProvider.GetRequiredService<IMovementService>();
                    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                    
                    var user = await userManager.FindByIdAsync(userId);
                    var isSecretary = user?.Role == "Secretary";

                    switch (command.Action.ToUpper())
                    {
                        case "CREATE_UNIT":
                            string uData = JsonSerializer.Serialize(command.Data);
                            var unit = JsonSerializer.Deserialize<Unit>(uData, options);
                            if (unit != null) {
                                unit.Id = Guid.NewGuid().ToString();
                                if (string.IsNullOrEmpty(unit.Code)) unit.Code = "U" + new Random().Next(100, 999).ToString();
                                
                                // Sanitize ParentId to avoid FK errors
                                if (!string.IsNullOrEmpty(unit.ParentId))
                                {
                                    var parent = await unitService.GetUnitByIdAsync(unit.ParentId);
                                    if (parent == null)
                                    {
                                        unit.ParentId = null; // Reset to null if parent not found
                                    }
                                }
                                else
                                {
                                    unit.ParentId = null; // Ensure empty strings are null
                                }
                                
                                await unitService.CreateUnitAsync(unit);
                                return $"✅ {command.Reply}\n(Hệ thống đã lưu thành công đơn vị: **{unit.Name}** vào cơ sở dữ liệu)";
                            }
                            break;

                        case "CREATE_MEMBER":
                            string mData = JsonSerializer.Serialize(command.Data);
                            var member = JsonSerializer.Deserialize<Member>(mData, options);
                            if (member != null) {
                                // Critical: Ensure Id is set before saving
                                member.Id = Guid.NewGuid().ToString();
                                
                                // Ensure a valid UnitId exists
                                var allUnits = await unitService.GetAllUnitsAsync();
                                var existingUnit = allUnits.FirstOrDefault(u => u.Id == member.UnitId || u.Name == member.UnitId);
                                
                                if (existingUnit != null)
                                {
                                    member.UnitId = existingUnit.Id;
                                }
                                else
                                {
                                    member.UnitId = allUnits.FirstOrDefault()?.Id ?? string.Empty;
                                    
                                    // If no units exist at all, create a default one to satisfy FK constraint
                                    if (string.IsNullOrEmpty(member.UnitId))
                                    {
                                        var defaultUnit = new Unit 
                                        { 
                                            Id = "DEFAULT_UNIT",
                                            Name = "Chi đoàn mặc định", 
                                            Code = "CD001",
                                            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                                        };
                                        await unitService.CreateUnitAsync(defaultUnit);
                                        member.UnitId = defaultUnit.Id;
                                    }
                                }
                                
                                // Set mandatory defaults if missing to avoid DB constraints
                                if (string.IsNullOrEmpty(member.Status)) member.Status = "Đang sinh hoạt";
                                if (string.IsNullOrEmpty(member.MemberId)) member.MemberId = "DV" + new Random().Next(1000, 9999);
                                if (string.IsNullOrEmpty(member.DOB)) member.DOB = "2005-01-01";
                                if (string.IsNullOrEmpty(member.Gender)) member.Gender = "Nam";
                                if (string.IsNullOrEmpty(member.AchievementLevel)) member.AchievementLevel = "Chưa xếp loại";
                                
                                await memberService.CreateMemberAsync(member);
                                return $"✅ {command.Reply}\n(Hệ thống đã lưu thành công đoàn viên: **{member.FullName}** vào cơ sở dữ liệu)";
                            }
                            break;
                            
                        case "CREATE_ACTIVITY":
                            string aData = JsonSerializer.Serialize(command.Data);
                            var activity = JsonSerializer.Deserialize<Activity>(aData, options);
                            if (activity != null) {
                                activity.Id = Guid.NewGuid().ToString();
                                if (string.IsNullOrEmpty(activity.Type)) activity.Type = "Other";
                                if (string.IsNullOrEmpty(activity.Date)) activity.Date = DateTime.Now.ToString("yyyy-MM-dd");
                                if (string.IsNullOrEmpty(activity.Location)) activity.Location = "Văn phòng Đoàn";
                                
                                await activityService.CreateActivityAsync(activity);
                                return $"✅ {command.Reply}\n(Hệ thống đã lưu thành công hoạt động: **{activity.Title}** vào cơ sở dữ liệu)";
                            }
                            break;

                        case "CREATE_MOVEMENT":
                            if (isSecretary)
                            {
                                return "⚠️ Bạn không có quyền khởi tạo hoặc chỉnh sửa phong trào trên hệ thống. Chức năng này chỉ dành cho Quản trị viên.";
                            }
                            string movData = JsonSerializer.Serialize(command.Data);
                            var movement = JsonSerializer.Deserialize<Movement>(movData, options);
                            if (movement != null) {
                                movement.Id = Guid.NewGuid().ToString();
                                
                                // Safely handle dates from AI response
                                if (command.Data is JsonElement movElement && movElement.ValueKind == JsonValueKind.Object)
                                {
                                    if (movElement.TryGetProperty("StartDate", out var startProp) && DateTime.TryParse(startProp.GetString(), out var sd))
                                        movement.StartDate = sd;
                                    else
                                        movement.StartDate = DateTime.Now;

                                    if (movElement.TryGetProperty("EndDate", out var endProp) && DateTime.TryParse(endProp.GetString(), out var ed))
                                        movement.EndDate = ed;
                                    else
                                        movement.EndDate = DateTime.Now.AddMonths(1);
                                }
                                else
                                {
                                    movement.StartDate = DateTime.Now;
                                    movement.EndDate = DateTime.Now.AddMonths(1);
                                }
                                
                                if (string.IsNullOrEmpty(movement.Status)) movement.Status = "Active";
                                if (string.IsNullOrEmpty(movement.TargetUnit)) movement.TargetUnit = "Toàn hệ thống";
                                
                                await movementService.CreateMovementAsync(movement);
                                return $"✅ {command.Reply}\n(Hệ thống đã phát động phong trào: **{movement.Title}** thành công)";
                            }
                            break;
                            
                        case "SEARCH":
                            var results = await memberService.SearchMembersAsync(message);
                            if (results.Any()) {
                                var resText = string.Join("\n", results.Take(5).Select(m => $"- {m.FullName} ({m.MemberId})"));
                                return $"🔍 {command.Reply}\nTìm thấy {results.Count} kết quả:\n{resText}";
                            }
                            return "🔍 Không tìm thấy kết quả nào phù hợp trong hệ thống.";

                        case "KNOWLEDGE_QUERY":
                            string searchTerm = message;
                            if (command.Data is JsonElement element && element.ValueKind == JsonValueKind.Object)
                            {
                                if (element.TryGetProperty("SearchTerm", out var prop))
                                {
                                    searchTerm = prop.GetString() ?? message;
                                }
                            }
                            
                            var items = await kbService.SearchItemsAsync(searchTerm);
                            if (items.Any()) {
                                var context = string.Join("\n\n", items.Take(3).Select(i => $"--- TIÊU ĐỀ: {i.Title} ---\n{i.Content}"));
                                var groundedPrompt = @$"Bạn là một chuyên gia về nghiệp vụ Đoàn. Hãy trả lời câu hỏi của người dùng dựa trên thông tin từ Tài liệu nghiệp vụ được cung cấp dưới đây.

DƯỚI ĐÂY LÀ CÁC TÀI LIỆU LIÊN QUAN:
{context}

CÂU HỎI CỦA NGƯỜI DÙNG: {message}

YÊU CẦU TRẢ LỜI:
1. Trình bày rõ ràng, chuyên nghiệp, sử dụng ngôn từ phù hợp với môi trường Đoàn - Hội.
2. Chỉ trả lời dựa trên thông tin có trong tài liệu trên. 
3. Nếu tài liệu không chứa đủ thông tin để trả lời, hãy lịch sự thông báo là bạn không tìm thấy hướng dẫn chi tiết cho vấn đề này trong hệ thống hiện tại.
4. Trích dẫn tiêu đề tài liệu nếu cần thiết.";
                                
                                return await GenerateResponseAsync(groundedPrompt);
                            }
                            return "🔍 Tôi đã tìm trong Tài liệu nghiệp vụ nhưng không thấy thông tin liên quan đến yêu cầu của bạn. Bạn có thể thử với từ khóa khác hoặc liên hệ Ban Chấp hành để được hướng dẫn.";

                        case "DELETE_MOVEMENT":
                            if (isSecretary) return "⚠️ Bạn không có quyền xóa phong trào. Chức năng này chỉ dành cho Quản trị viên.";
                            string movName = "";
                            if (command.Data is JsonElement d1 && d1.ValueKind == JsonValueKind.Object && d1.TryGetProperty("Name", out var p1)) movName = p1.GetString() ?? "";
                            if (string.IsNullOrEmpty(movName)) return "⚠️ Thiếu tên phong trào cần xóa.";
                            var allMovs = await movementService.GetAllMovementsAsync();
                            var movToDelete = allMovs.FirstOrDefault(m => m.Title.Contains(movName, StringComparison.OrdinalIgnoreCase));
                            if (movToDelete != null) {
                                await movementService.DeleteMovementAsync(movToDelete.Id);
                                return $"✅ {command.Reply}\n(Hệ thống đã xóa thành công phong trào: **{movToDelete.Title}**)";
                            }
                            return $"❌ Không tìm thấy phong trào có tên '{movName}'";

                        case "DELETE_MEMBER":
                            string memName = "";
                            if (command.Data is JsonElement d2 && d2.ValueKind == JsonValueKind.Object && d2.TryGetProperty("Name", out var p2)) memName = p2.GetString() ?? "";
                            if (string.IsNullOrEmpty(memName)) return "⚠️ Thiếu tên đoàn viên hoặc mã đoàn viên cần xóa.";
                            var allMems = await memberService.GetAllMembersAsync();
                            var memToDelete = allMems.FirstOrDefault(m => m.FullName.Contains(memName, StringComparison.OrdinalIgnoreCase) || m.MemberId.Equals(memName, StringComparison.OrdinalIgnoreCase));
                            if (memToDelete != null) {
                                await memberService.DeleteMemberAsync(memToDelete.Id);
                                return $"✅ {command.Reply}\n(Hệ thống đã xóa thành công đoàn viên: **{memToDelete.FullName}**)";
                            }
                            return $"❌ Không tìm thấy đoàn viên: {memName}";

                        case "DELETE_UNIT":
                            if (isSecretary) return "⚠️ Bạn không có quyền xóa đơn vị.";
                            string uName = "";
                            if (command.Data is JsonElement d3 && d3.ValueKind == JsonValueKind.Object && d3.TryGetProperty("Name", out var p3)) uName = p3.GetString() ?? "";
                            if (string.IsNullOrEmpty(uName)) return "⚠️ Thiếu tên đơn vị cần xóa.";
                            var allUnitsD = await unitService.GetAllUnitsAsync();
                            var unitToDelete = allUnitsD.FirstOrDefault(u => u.Name.Contains(uName, StringComparison.OrdinalIgnoreCase) || u.Code.Equals(uName, StringComparison.OrdinalIgnoreCase));
                            if (unitToDelete != null) {
                                await unitService.DeleteUnitAsync(unitToDelete.Id);
                                return $"✅ {command.Reply}\n(Hệ thống đã xóa thành công đơn vị: **{unitToDelete.Name}**)";
                            }
                            return $"❌ Không tìm thấy đơn vị: {uName}";

                        case "DELETE_ACTIVITY":
                            string actName = "";
                            if (command.Data is JsonElement d4 && d4.ValueKind == JsonValueKind.Object && d4.TryGetProperty("Name", out var p4)) actName = p4.GetString() ?? "";
                            if (string.IsNullOrEmpty(actName)) return "⚠️ Thiếu tên hoạt động cần xóa.";
                            var allActs = await activityService.GetAllActivitiesAsync();
                            var actToDelete = allActs.FirstOrDefault(a => a.Title.Contains(actName, StringComparison.OrdinalIgnoreCase));
                            if (actToDelete != null) {
                                await activityService.DeleteActivityAsync(actToDelete.Id);
                                return $"✅ {command.Reply}\n(Hệ thống đã xóa thành công hoạt động: **{actToDelete.Title}**)";
                            }
                            return $"❌ Không tìm thấy hoạt động: {actName}";

                        case "DELETE_KNOWLEDGE":
                            if (isSecretary) return "⚠️ Bạn không có quyền xóa tài liệu nghiệp vụ.";
                            string kTitle = "";
                            if (command.Data is JsonElement d5 && d5.ValueKind == JsonValueKind.Object && d5.TryGetProperty("Name", out var p5)) kTitle = p5.GetString() ?? "";
                            if (string.IsNullOrEmpty(kTitle)) return "⚠️ Thiếu tiêu đề tài liệu cần xóa.";
                            var allKItems = await kbService.GetAllItemsAsync();
                            var kToDelete = allKItems.FirstOrDefault(k => k.Title.Contains(kTitle, StringComparison.OrdinalIgnoreCase));
                            if (kToDelete != null) {
                                await kbService.DeleteItemAsync(kToDelete.Id);
                                return $"✅ {command.Reply}\n(Hệ thống đã xóa thành công tài liệu: **{kToDelete.Title}**)";
                            }
                            return $"❌ Không tìm thấy tài liệu: {kTitle}";
                            
                        default:
                            return command.Reply;
                    }
                }
                catch (Exception ex)
                {
                    var errorMsg = ex.Message;
                    if (ex.InnerException != null)
                    {
                        errorMsg += $" (Inner: {ex.InnerException.Message})";
                    }
                    return $"⚠️ Lỗi khi thực thi lệnh trên Database: {errorMsg}";
                }

                return aiRawResponse;
            }
            catch (Exception ex)
            {
                return $"Lỗi xử lý lệnh thông minh: {ex.Message}";
            }
        }
    }

    public class SmartCommand
    {
        public string Action { get; set; } = string.Empty;
        public dynamic Data { get; set; } = null!;
        public string Reply { get; set; } = string.Empty;
    }
}
using Microsoft.AspNetCore.Mvc;
using QLDV.Services;
using QLDV.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.IO;

namespace QLDV.Controllers
{
    [Authorize]
    public class ActivitiesController : Controller
    {
        private readonly IActivityService _activityService;
        private readonly IMovementService _movementService;
        private readonly ILogService _logService;

        public ActivitiesController(IActivityService activityService, IMovementService movementService, ILogService logService)
        {
            _activityService = activityService;
            _movementService = movementService;
            _logService = logService;
        }

        public async Task<IActionResult> Index()
        {
            var activities = await _activityService.GetAllActivitiesAsync();
            return View(activities);
        }

        public async Task<IActionResult> Details(string id)
        {
            var activity = await _activityService.GetActivityByIdAsync(id);
            if (activity == null)
                return NotFound();

            return View(activity);
        }

        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Create(Activity activity)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    await _activityService.CreateActivityAsync(activity);
                    TempData["Success"] = "Tạo hoạt động mới thành công!";
                    return RedirectToAction(nameof(Details), new { id = activity.Id });
                }
                catch (Exception ex)
                {
                    TempData["Error"] = $"Lỗi khi tạo hoạt động: {ex.Message}";
                    ModelState.AddModelError("", $"Error creating activity: {ex.Message}");
                }
            }
            return View(activity);
        }

        public async Task<IActionResult> Edit(string id)
        {
            var activity = await _activityService.GetActivityByIdAsync(id);
            if (activity == null)
                return NotFound();

            return View(activity);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(string id, Activity activity)
        {
            if (id != activity.Id)
                return BadRequest();

            if (ModelState.IsValid)
            {
                try
                {
                    await _activityService.UpdateActivityAsync(activity);
                    TempData["Success"] = "Cập nhật hoạt động thành công!";
                    return RedirectToAction(nameof(Details), new { id = activity.Id });
                }
                catch (Exception ex)
                {
                    TempData["Error"] = $"Lỗi khi cập nhật hoạt động: {ex.Message}";
                    ModelState.AddModelError("", $"Error updating activity: {ex.Message}");
                }
            }
            return View(activity);
        }

        [HttpPost]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await _activityService.DeleteActivityAsync(id);
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpgradeToMovement(string id)
        {
            try
            {
                var activity = await _activityService.GetActivityByIdAsync(id);
                if (activity == null) return NotFound(new { success = false, message = "Không tìm thấy hoạt động" });

                var movement = new Movement
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = activity.Title,
                    Description = activity.Description,
                    Status = "Active",
                    CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    CreatorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
                    TargetUnit = "Tất cả các chi đoàn"
                };

                if (DateTime.TryParse(activity.Date, out var date))
                {
                    movement.StartDate = date;
                    movement.EndDate = date.AddDays(7);
                }
                else
                {
                    movement.StartDate = DateTime.Now;
                    movement.EndDate = DateTime.Now.AddDays(7);
                }

                await _movementService.CreateMovementAsync(movement);
                await _activityService.DeleteActivityAsync(id);

                await _logService.LogActivityAsync(
                    User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
                    User.Identity?.Name ?? "Unknown",
                    "Upgrade Activity to Movement",
                    "Activity",
                    id,
                    $"Converted activity '{activity.Title}' to movement '{movement.Id}'"
                );

                return Json(new { success = true, movementId = movement.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }

    [Authorize]
    public class MovementsController : Controller
    {
        private readonly IMovementService _movementService;
        private readonly IUnitService _unitService;
        private readonly IFileService _fileService;
        private readonly UserManager<ApplicationUser> _userManager;

        public MovementsController(IMovementService movementService, IUnitService unitService, IFileService fileService, UserManager<ApplicationUser> userManager)
        {
            _movementService = movementService;
            _unitService = unitService;
            _fileService = fileService;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index()
        {
            var movements = await _movementService.GetAllMovementsAsync();
            var stats = new List<MovementStatsViewModel>();

            foreach (var m in movements)
            {
                var targetUnitIds = new List<string>();
                if (!string.IsNullOrEmpty(m.ParticipatingUnitIdsJson))
                {
                    try { targetUnitIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(m.ParticipatingUnitIdsJson) ?? new List<string>(); } catch { }
                }
                else if (!string.IsNullOrEmpty(m.TargetUnit))
                {
                    targetUnitIds.Add(m.TargetUnit);
                }

                var reportedUnitIds = m.Reports.Select(r => r.UnitId).Distinct().Count();
                var totalTargetUnits = targetUnitIds.Count;
                if (totalTargetUnits == 0) totalTargetUnits = 1; // Default to 1 if not specified

                stats.Add(new MovementStatsViewModel
                {
                    Movement = m,
                    TotalUnits = totalTargetUnits,
                    ReportedCount = reportedUnitIds,
                    TotalSubmissions = m.Reports.Count,
                    CompletionPercentage = (double)reportedUnitIds / totalTargetUnits * 100
                });
            }

            ViewBag.MovementStats = stats;
            return View(movements);
        }

        [HttpPost]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await _movementService.DeleteMovementAsync(id);
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        public async Task<IActionResult> Details(string id)
        {
            var movement = await _movementService.GetMovementByIdAsync(id);
            if (movement == null)
                return NotFound();

            var reports = await _movementService.GetReportsByMovementAsync(id);
            var allUnits = await _unitService.GetAllUnitsAsync();
            ViewBag.Reports = reports;
            ViewBag.AllUnits = allUnits;
            return View(movement);
        }

        public async Task<IActionResult> Create()
        {
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Create(Movement movement, List<IFormFile> attachments)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    movement.CreatorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
                    
                    if (attachments != null && attachments.Count > 0)
                    {
                        var files = new List<Attachment>();
                        foreach (var file in attachments)
                        {
                            var fileName = await _fileService.SaveFileAsync(file, "movements");
                            files.Add(new Attachment 
                            { 
                                Name = file.FileName, 
                                Url = _fileService.GetFileUrl(fileName, "movements"),
                                Type = file.ContentType 
                            });
                        }
                        movement.AttachmentsJson = System.Text.Json.JsonSerializer.Serialize(files);
                    }

                    await _movementService.CreateMovementAsync(movement);
                    TempData["Success"] = "Movement created successfully!";
                    return RedirectToAction(nameof(Details), new { id = movement.Id });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error creating movement: {ex.Message}");
                }
            }
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View(movement);
        }

        public async Task<IActionResult> Edit(string id)
        {
            var movement = await _movementService.GetMovementByIdAsync(id);
            if (movement == null)
                return NotFound();

            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View(movement);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(string id, Movement movement)
        {
            if (id != movement.Id)
                return BadRequest();

            var existingMovement = await _movementService.GetMovementByIdAsync(id);
            if (existingMovement == null)
                return NotFound();

            // Clear errors for fields we don't update from the form
            ModelState.Remove("CreatorId");
            ModelState.Remove("CreatedAt");
            ModelState.Remove("Reports");

            if (ModelState.IsValid)
            {
                try
                {
                    existingMovement.Title = movement.Title;
                    existingMovement.StartDate = movement.StartDate;
                    existingMovement.EndDate = movement.EndDate;
                    existingMovement.Description = movement.Description;
                    existingMovement.TargetUnit = movement.TargetUnit;
                    existingMovement.Status = movement.Status;
                    // Keep CreatorId and CreatedAt from the original entity

                    await _movementService.UpdateMovementAsync(existingMovement);
                    return RedirectToAction(nameof(Details), new { id = existingMovement.Id });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error updating movement: {ex.Message}");
                }
            }
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View(movement);
        }

        public async Task<IActionResult> SubmitReport(string id, string? movementId)
        {
            var mId = !string.IsNullOrEmpty(id) ? id : movementId;
            ViewBag.MovementId = mId;
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> SubmitReport(string id, MovementReport report, List<IFormFile> attachments)
        {
            report.MovementId = id;
            
            // If UnitId is missing from form, try to get it from current user
            if (string.IsNullOrEmpty(report.UnitId))
            {
                var user = await _userManager.GetUserAsync(User);
                report.UnitId = user?.UnitId ?? "";
            }

            // Clear validation errors for fields we set manually or don't need from form
            ModelState.Remove("Id");
            ModelState.Remove("MovementId");
            ModelState.Remove("UnitId"); // We've ensured it's set or we'll handle it below
            ModelState.Remove("SubmittedAt");
            ModelState.Remove("SubmissionCount");
            ModelState.Remove("Movement");
            ModelState.Remove("Unit");

            if (string.IsNullOrEmpty(report.UnitId))
            {
                ModelState.AddModelError("UnitId", "Tài khoản của bạn chưa được gán vào đơn vị nào. Vui lòng liên hệ Admin.");
            }

            if (ModelState.IsValid)
            {
                try
                {
                    if (attachments != null && attachments.Count > 0)
                    {
                        var files = new List<Attachment>();
                        foreach (var file in attachments)
                        {
                            var fileName = await _fileService.SaveFileAsync(file, "reports");
                            files.Add(new Attachment 
                            { 
                                Name = file.FileName, 
                                Url = _fileService.GetFileUrl(fileName, "reports"),
                                Type = file.ContentType 
                            });
                        }
                        report.AttachmentsJson = System.Text.Json.JsonSerializer.Serialize(files);
                    }

                    await _movementService.SubmitReportAsync(report);
                    TempData["Success"] = "Gửi báo cáo thành công!";
                    return RedirectToAction(nameof(Details), new { id = id });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Lỗi khi nộp báo cáo: {ex.Message}");
                }
            }
            
            ViewBag.MovementId = id;
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View(report);
        }

        public async Task<IActionResult> ReportDetails(string id)
        {
            var report = await _movementService.GetReportByIdAsync(id);
            if (report == null) return NotFound();

            return View(report);
        }
    }

    [Authorize]
    public class KnowledgeBaseController : Controller
    {
        private readonly IKnowledgeBaseService _knowledgeService;

        public KnowledgeBaseController(IKnowledgeBaseService knowledgeService)
        {
            _knowledgeService = knowledgeService;
        }

        public async Task<IActionResult> Index()
        {
            var items = await _knowledgeService.GetAllItemsAsync();
            return View(items);
        }

        public async Task<IActionResult> Details(string id)
        {
            var item = await _knowledgeService.GetItemByIdAsync(id);
            if (item == null)
                return NotFound();

            return View(item);
        }

        [HttpGet]
        public async Task<IActionResult> Search(string term)
        {
            var items = await _knowledgeService.SearchItemsAsync(term);
            return Json(items);
        }

        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Create(KnowledgeItem item)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    await _knowledgeService.CreateItemAsync(item);
                    return RedirectToAction(nameof(Details), new { id = item.Id });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error creating item: {ex.Message}");
                }
            }
            return View(item);
        }

        public async Task<IActionResult> Edit(string id)
        {
            var item = await _knowledgeService.GetItemByIdAsync(id);
            if (item == null)
                return NotFound();

            return View(item);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(string id, KnowledgeItem item)
        {
            if (id != item.Id)
                return BadRequest();

            if (ModelState.IsValid)
            {
                try
                {
                    await _knowledgeService.UpdateItemAsync(item);
                    return RedirectToAction(nameof(Details), new { id = item.Id });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error updating item: {ex.Message}");
                }
            }
            return View(item);
        }

        [HttpPost]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await _knowledgeService.DeleteItemAsync(id);
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }

    [Authorize]
    public class StatisticsController : Controller
    {
        private readonly IStatisticsService _statisticsService;
        private readonly IMemberService _memberService;
        private readonly IUnitService _unitService;

        public StatisticsController(IStatisticsService statisticsService, IMemberService memberService, IUnitService unitService)
        {
            _statisticsService = statisticsService;
            _memberService = memberService;
            _unitService = unitService;
        }

        public async Task<IActionResult> Index()
        {
            var totalMembers = await _statisticsService.GetTotalMembersAsync();
            var membersByStatus = await _statisticsService.GetMemberCountByStatusAsync();
            var membersByGender = await _statisticsService.GetMemberCountByGenderAsync();
            var membersByAchievement = await _statisticsService.GetMemberCountByAchievementAsync();
            var membersByEthnic = await _statisticsService.GetMemberCountByEthnicAsync();
            var membersByUnit = await _statisticsService.GetMembersByUnitAsync();
            var detailedStats = await _statisticsService.GetDetailedUnitStatisticsAsync();
            var totalOutstanding = await _statisticsService.GetTotalOutstandingCountAsync();

            ViewBag.TotalMembers = totalMembers;
            ViewBag.MembersByStatus = membersByStatus;
            ViewBag.MembersByGender = membersByGender;
            ViewBag.MembersByAchievement = membersByAchievement;
            ViewBag.MembersByEthnic = membersByEthnic;
            ViewBag.MembersByUnit = membersByUnit;
            ViewBag.DetailedStats = detailedStats;
            ViewBag.TotalOutstanding = totalOutstanding;

            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetStatistics()
        {
            var stats = new
            {
                totalMembers = await _statisticsService.GetTotalMembersAsync(),
                membersByStatus = await _statisticsService.GetMemberCountByStatusAsync(),
                membersByGender = await _statisticsService.GetMemberCountByGenderAsync(),
                membersByAchievement = await _statisticsService.GetMemberCountByAchievementAsync(),
                membersByUnit = await _statisticsService.GetMembersByUnitAsync()
            };

            return Json(stats);
        }

        [HttpGet]
        public async Task<IActionResult> ExportExcel()
        {
            var detailedStats = await _statisticsService.GetDetailedUnitStatisticsAsync();
            
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using (var package = new ExcelPackage())
            {
                var worksheet = package.Workbook.Worksheets.Add("Thống kê chi tiết");
                
                // --- STRUCTURED HEADERS (Row 1: Group Titles, Row 2: Sub-headers) ---
                
                // 1. Group Titles
                worksheet.Cells[1, 1].Value = "ĐƠN VỊ CHI ĐOÀN";
                worksheet.Cells[1, 1, 2, 1].Merge = true; // Vertical merge for Unit Name

                worksheet.Cells[1, 2].Value = "NHÂN KHẨU HỌC";
                worksheet.Cells[1, 2, 1, 4].Merge = true; // Horizontal merge for Demographics

                worksheet.Cells[1, 5].Value = "DÂN TỘC";
                worksheet.Cells[1, 5, 1, 6].Merge = true;

                worksheet.Cells[1, 7].Value = "TÔN GIÁO";
                worksheet.Cells[1, 7, 1, 8].Merge = true;

                worksheet.Cells[1, 9].Value = "TRẠNG THÁI HOẠT ĐỘNG";
                worksheet.Cells[1, 9, 1, 11].Merge = true;

                worksheet.Cells[1, 12].Value = "XẾP LOẠI CHẤT LƯỢNG";
                worksheet.Cells[1, 12, 1, 14].Merge = true;

                worksheet.Cells[1, 15].Value = "TIÊU BIỂU";
                worksheet.Cells[1, 15, 2, 15].Merge = true;

                // 2. Sub-headers (Row 2)
                worksheet.Cells[2, 2].Value = "TỔNG";
                worksheet.Cells[2, 3].Value = "NAM";
                worksheet.Cells[2, 4].Value = "NỮ";
                worksheet.Cells[2, 5].Value = "KINH";
                worksheet.Cells[2, 6].Value = "KHÁC";
                worksheet.Cells[2, 7].Value = "CÓ";
                worksheet.Cells[2, 8].Value = "KHÔNG";
                worksheet.Cells[2, 9].Value = "ĐANG SH";
                worksheet.Cells[2, 10].Value = "CHUYỂN";
                worksheet.Cells[2, 11].Value = "T. THÀNH";
                worksheet.Cells[2, 12].Value = "X. SẮC";
                worksheet.Cells[2, 13].Value = "KHÁ";
                worksheet.Cells[2, 14].Value = "T. BÌNH";

                // --- STYLING HEADERS ---
                using (var range = worksheet.Cells[1, 1, 2, 15])
                {
                    range.Style.Font.Bold = true;
                    range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(248, 251, 255)); // Light blue bg
                    range.Style.Font.Color.SetColor(System.Drawing.Color.FromArgb(26, 115, 232)); // Primary blue text
                    range.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    range.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    range.Style.Border.BorderAround(ExcelBorderStyle.Thin);
                }

                // --- ADD DATA ---
                int startRow = 3;
                for (int i = 0; i < detailedStats.Count; i++)
                {
                    var s = detailedStats[i];
                    int r = startRow + i;
                    worksheet.Cells[r, 1].Value = s.UnitName;
                    worksheet.Cells[r, 2].Value = s.Total;
                    worksheet.Cells[r, 3].Value = s.Male;
                    worksheet.Cells[r, 4].Value = s.Female;
                    worksheet.Cells[r, 5].Value = s.Kinh;
                    worksheet.Cells[r, 6].Value = s.OtherEthnic;
                    worksheet.Cells[r, 7].Value = s.HasReligion;
                    worksheet.Cells[r, 8].Value = s.NoReligion;
                    worksheet.Cells[r, 9].Value = s.Active;
                    worksheet.Cells[r, 10].Value = s.Transferred;
                    worksheet.Cells[r, 11].Value = s.Graduated;
                    worksheet.Cells[r, 12].Value = s.Excellent;
                    worksheet.Cells[r, 13].Value = s.Good;
                    worksheet.Cells[r, 14].Value = s.Average;
                    worksheet.Cells[r, 15].Value = s.Outstanding;

                    // Zebra striping
                    if (i % 2 == 1)
                    {
                        worksheet.Cells[r, 1, r, 15].Style.Fill.PatternType = ExcelFillStyle.Solid;
                        worksheet.Cells[r, 1, r, 15].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(252, 252, 252));
                    }
                }

                // --- ADD SUMMARY TOTAL ROW (Row at the bottom) ---
                int totalRow = startRow + detailedStats.Count;
                worksheet.Cells[totalRow, 1].Value = "TỔNG TOÀN ĐOÀN";
                worksheet.Cells[totalRow, 2].Formula = $"SUM(B{startRow}:B{totalRow - 1})";
                worksheet.Cells[totalRow, 3].Formula = $"SUM(C{startRow}:C{totalRow - 1})";
                worksheet.Cells[totalRow, 4].Formula = $"SUM(D{startRow}:D{totalRow - 1})";
                worksheet.Cells[totalRow, 5].Formula = $"SUM(E{startRow}:E{totalRow - 1})";
                worksheet.Cells[totalRow, 6].Formula = $"SUM(F{startRow}:F{totalRow - 1})";
                worksheet.Cells[totalRow, 7].Formula = $"SUM(G{startRow}:G{totalRow - 1})";
                worksheet.Cells[totalRow, 8].Formula = $"SUM(H{startRow}:H{totalRow - 1})";
                worksheet.Cells[totalRow, 9].Formula = $"SUM(I{startRow}:I{totalRow - 1})";
                worksheet.Cells[totalRow, 10].Formula = $"SUM(J{startRow}:J{totalRow - 1})";
                worksheet.Cells[totalRow, 11].Formula = $"SUM(K{startRow}:K{totalRow - 1})";
                worksheet.Cells[totalRow, 12].Formula = $"SUM(L{startRow}:L{totalRow - 1})";
                worksheet.Cells[totalRow, 13].Formula = $"SUM(M{startRow}:M{totalRow - 1})";
                worksheet.Cells[totalRow, 14].Formula = $"SUM(N{startRow}:N{totalRow - 1})";
                worksheet.Cells[totalRow, 15].Formula = $"SUM(O{startRow}:O{totalRow - 1})";

                // Style Total Row
                using (var range = worksheet.Cells[totalRow, 1, totalRow, 15])
                {
                    range.Style.Font.Bold = true;
                    range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(15, 23, 42)); // Dark navy bg
                    range.Style.Font.Color.SetColor(System.Drawing.Color.White);
                }

                worksheet.Cells.AutoFitColumns();
                worksheet.Column(1).Width = 35; // Wider for unit names
                
                var stream = new MemoryStream();
                package.SaveAs(stream);
                stream.Position = 0;

                string fileName = $"ThongKe_QLDV_{DateTime.Now:yyyyMMdd}.xlsx";
                return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
        }

        [HttpPost]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                TempData["Error"] = "Vui lòng chọn file Excel hợp lệ.";
                return RedirectToAction("Index");
            }

            try
            {
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                using (var package = new ExcelPackage(file.OpenReadStream()))
                {
                    var worksheet = package.Workbook.Worksheets[0];
                    int rowCount = worksheet.Dimension.Rows;
                    int colCount = worksheet.Dimension.Columns;
                    int importedCount = 0;

                    var units = await _unitService.GetAllUnitsAsync();
                    var defaultUnit = units.FirstOrDefault();

                    var skipKeywords = new[] { "Họ và tên", "Họ tên", "STT", "Số thứ tự", "Định danh", "Ngày sinh", "Giới tính", "Chi đoàn", "Thống kê", "Báo cáo", "Dữ liệu", "Danh sách" };
                    var orgPrefixes = new[] { "BCH ", "ĐOÀN ", "CHI ĐOÀN ", "HỆ THỐNG ", "CƠ SỞ ", "TỔ ", "TRUNG TÂM ", "UBND ", "TỈNH " };

                    for (int row = 2; row <= rowCount; row++)
                    {
                        var fullName = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                        if (string.IsNullOrEmpty(fullName))
                        {
                            fullName = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                        }

                        if (string.IsNullOrEmpty(fullName)) continue;

                        // AGGRESSIVE FILTERING
                        // 1. Skip if string is way too long for a name ( > 40 chars)
                        if (fullName.Length > 40) continue;
                        
                        // 2. Skip if it contains too many words (typical of titles, e.g., > 6 words)
                        if (fullName.Split(' ').Length > 6) continue;

                        // 3. Skip if it contains known report/org keywords
                        if (skipKeywords.Any(k => fullName.Contains(k, StringComparison.OrdinalIgnoreCase))) continue;
                        if (orgPrefixes.Any(p => fullName.Contains(p, StringComparison.OrdinalIgnoreCase))) continue;
                        
                        // 4. Skip numeric
                        if (double.TryParse(fullName, out _)) continue;

                        string memberId = "";
                        string dobString = "2005-01-01";
                        string gender = "";
                        string unitNameFromExcel = "";
                        string status = "";
                        string achievement = "";
                        string ethnic = "";

                        for (int col = 1; col <= Math.Min(colCount, 15); col++)
                        {
                            var cellValue = worksheet.Cells[row, col].Value;
                            if (cellValue == null) continue;
                            var cellStr = cellValue.ToString()?.Trim();
                            if (string.IsNullOrEmpty(cellStr)) continue;

                            if (cellStr == fullName) continue;

                            // 1. Check if it's a Date (likely DOB)
                            if (cellValue is DateTime dt)
                            {
                                if (dt.Year < 2015) dobString = dt.ToString("yyyy-MM-dd");
                            }
                            else if (DateTime.TryParse(cellStr, out var parsedDate))
                            {
                                if (parsedDate.Year < 2015 && parsedDate.Year > 1940) dobString = parsedDate.ToString("yyyy-MM-dd");
                            }
                            // 2. Check if it's Gender (Must be exact match)
                            else if (cellStr.Equals("Nam", StringComparison.OrdinalIgnoreCase) || cellStr.Equals("Nữ", StringComparison.OrdinalIgnoreCase))
                            {
                                if (string.IsNullOrEmpty(gender)) gender = cellStr;
                            }
                            // 3. Check if it's a typical ID
                            else if (cellStr.StartsWith("DV", StringComparison.OrdinalIgnoreCase) && cellStr.Length > 2)
                            {
                                memberId = cellStr;
                            }
                            // 4. Check if it's a Unit Name (Only if NOT gender and length > 3)
                            else if (cellStr.Length > 3 && 
                                    !cellStr.Equals("Nam", StringComparison.OrdinalIgnoreCase) && 
                                    !cellStr.Equals("Nữ", StringComparison.OrdinalIgnoreCase))
                            {
                                var unitMatch = units.FirstOrDefault(u => 
                                    (u.Name.Equals(cellStr, StringComparison.OrdinalIgnoreCase) || u.Name.Contains(cellStr)) &&
                                    !u.Name.Equals("Nam", StringComparison.OrdinalIgnoreCase) &&
                                    !u.Name.Equals("Nữ", StringComparison.OrdinalIgnoreCase));
                                    
                                if (unitMatch != null && string.IsNullOrEmpty(unitNameFromExcel))
                                {
                                    unitNameFromExcel = unitMatch.Name;
                                }
                            }
                            // 5. Check if it's Status
                            else if (cellStr.Contains("sinh hoạt") || cellStr.Contains("trưởng thành") || cellStr.Contains("chuyển"))
                            {
                                status = cellStr;
                            }
                            // 6. Check if it's Achievement
                            else if (cellStr.Contains("Xuất sắc") || cellStr.Contains("Khá") || cellStr.Contains("Trung bình"))
                            {
                                achievement = cellStr;
                            }
                        }

                        // Heuristic cleanup
                        if (string.IsNullOrEmpty(memberId)) memberId = "DV" + new Random().Next(1000, 9999);
                        if (string.IsNullOrEmpty(gender))
                        {
                            if (fullName.Contains(" Thị ") || fullName.Contains(" Hồng ") || fullName.Contains(" Ngọc ")) gender = "Nữ";
                            else gender = "Nam";
                        }
                        
                        var finalUnitId = units.FirstOrDefault(u => u.Name.Equals(unitNameFromExcel, StringComparison.OrdinalIgnoreCase))?.Id 
                                    ?? units.FirstOrDefault(u => u.Name.Contains(unitNameFromExcel ?? "---"))?.Id 
                                    ?? defaultUnit?.Id ?? "U001";

                        var member = new Member
                        {
                            Id = Guid.NewGuid().ToString(),
                            FullName = fullName,
                            MemberId = memberId,
                            DOB = dobString,
                            Gender = gender,
                            UnitId = finalUnitId,
                            Status = string.IsNullOrEmpty(status) ? "Đang sinh hoạt" : status,
                            AchievementLevel = string.IsNullOrEmpty(achievement) ? "Chưa xếp loại" : achievement,
                            Ethnic = string.IsNullOrEmpty(ethnic) ? "Kinh" : ethnic,
                            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                        };

                        await _memberService.CreateMemberAsync(member);
                        importedCount++;
                    }

                    TempData["SuccessMessage"] = $"Đã nhập thành công {importedCount} đoàn viên từ file Excel.";
                }
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Lỗi khi xử lý file: {ex.Message}";
            }

            return RedirectToAction("Index");
        }
    }

    [Authorize(Roles = "Admin")]
    public class LogsController : Controller
    {
        private readonly ILogService _logService;

        public LogsController(ILogService logService)
        {
            _logService = logService;
        }

        public async Task<IActionResult> Index(int take = 100)
        {
            var logs = await _logService.GetLogsAsync(take);
            return View(logs);
        }

        public async Task<IActionResult> Details(string id)
        {
            // Assuming we need a way to get a single log by ID. 
            // I'll check ILogService first.
            var logs = await _logService.GetLogsAsync(1000);
            var log = logs.FirstOrDefault(l => l.Id == id);
            if (log == null)
                return NotFound();

            return View(log);
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(int take = 100)
        {
            var logs = await _logService.GetLogsAsync(take);
            return Json(logs);
        }
    }

    public class MovementStatsViewModel
    {
        public Movement Movement { get; set; } = null!;
        public int TotalUnits { get; set; }
        public int ReportedCount { get; set; }
        public int TotalSubmissions { get; set; }
        public double CompletionPercentage { get; set; }
    }
}

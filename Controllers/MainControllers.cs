using Microsoft.AspNetCore.Mvc;
using QLDV.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using QLDV.Models;

namespace QLDV.Controllers
{
    [Authorize]
    public class DashboardController : Controller
    {
        private readonly IStatisticsService _statisticsService;
        private readonly IMemberService _memberService;
        private readonly IActivityService _activityService;
        private readonly ILogService _logService;
        private readonly IUnitService _unitService;

        public DashboardController(
            IStatisticsService statisticsService,
            IMemberService memberService,
            IActivityService activityService,
            ILogService logService,
            IUnitService unitService)
        {
            _statisticsService = statisticsService;
            _memberService = memberService;
            _activityService = activityService;
            _logService = logService;
            _unitService = unitService;
        }

        public async Task<IActionResult> Index()
        {
            var totalMembers = await _statisticsService.GetTotalMembersAsync();
            var membersByStatus = await _statisticsService.GetMemberCountByStatusAsync();
            var membersByGender = await _statisticsService.GetMemberCountByGenderAsync();
            var membersByAchievement = await _statisticsService.GetMemberCountByAchievementAsync();
            var recentLogs = await _logService.GetLogsAsync(10);
            
            // Additional data for new UI
            var allUnits = await _unitService.GetAllUnitsAsync();
            var allActivities = await _activityService.GetAllActivitiesAsync();
            var allMembers = await _memberService.GetAllMembersAsync();

            ViewBag.TotalMembers = totalMembers;
            ViewBag.MembersByStatus = membersByStatus;
            ViewBag.MembersByGender = membersByGender;
            ViewBag.MembersByAchievement = membersByAchievement;
            ViewBag.RecentLogs = recentLogs;
            
            ViewBag.TotalUnits = allUnits.Count;
            ViewBag.UpcomingActivitiesCount = allActivities.Count(a => {
                if (DateTime.TryParse(a.Date, out var date))
                    return date >= DateTime.Now;
                return false;
            });
            ViewBag.OutstandingMembersCount = allMembers.Count(m => m.IsOutstanding);
            
            ViewBag.UpcomingActivities = allActivities
                .Where(a => {
                    if (DateTime.TryParse(a.Date, out var date))
                        return date >= DateTime.Now;
                    return false;
                })
                .OrderBy(a => a.Date)
                .Take(3)
                .ToList();
                
            ViewBag.NewMembers = allMembers
                .OrderByDescending(m => m.CreatedAt)
                .Take(5)
                .ToList();

            return View();
        }
    }

    [Authorize]
    public class MembersController : Controller
    {
        private readonly IMemberService _memberService;
        private readonly IUnitService _unitService;
        private readonly ILogService _logService;

        public MembersController(
            IMemberService memberService,
            IUnitService unitService,
            ILogService logService)
        {
            _memberService = memberService;
            _unitService = unitService;
            _logService = logService;
        }

        public async Task<IActionResult> Index(int page = 1, string sortOrder = "", string search = "", string unit = "", string year = "", string achievement = "", string status = "", string gender = "", string hometown = "")
        {
            int pageSize = 10;
            var allMembers = await _memberService.GetAllMembersAsync();
            
            // Apply Filters (Server-side)
            var filteredMembers = allMembers.Where(m => 
                (string.IsNullOrEmpty(search) || m.FullName.Contains(search, StringComparison.OrdinalIgnoreCase) || m.MemberId.Contains(search, StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrEmpty(unit) || (m.Unit != null && m.Unit.Name.Equals(unit, StringComparison.OrdinalIgnoreCase))) &&
                (string.IsNullOrEmpty(status) || m.Status.Equals(status, StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrEmpty(achievement) || m.AchievementLevel.Equals(achievement, StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrEmpty(year) || m.AcademicYear == year || (m.FullName != null && m.FullName.Contains(year))) &&
                (string.IsNullOrEmpty(gender) || m.Gender.Equals(gender, StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrEmpty(hometown) || (m.FullName != null && m.FullName.Contains(hometown, StringComparison.OrdinalIgnoreCase)))
            );

            // Sorting Logic
            IEnumerable<Models.Member> sortedMembers;
            switch (sortOrder)
            {
                case "name_asc":
                    sortedMembers = filteredMembers.OrderBy(m => m.FullName.Split(' ').Last());
                    break;
                case "name_desc":
                    sortedMembers = filteredMembers.OrderByDescending(m => m.FullName.Split(' ').Last());
                    break;
                default:
                    sortedMembers = filteredMembers.OrderByDescending(m => m.CreatedAt);
                    break;
            }

            var totalMembers = sortedMembers.Count();
            var totalPages = (int)Math.Ceiling(totalMembers / (double)pageSize);
            
            var paginatedMembers = sortedMembers
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            
            ViewBag.CurrentPage = page;
            ViewBag.TotalPages = totalPages;
            ViewBag.TotalMembers = totalMembers;
            ViewBag.SortOrder = sortOrder;

            // Preserve Filter State
            ViewBag.Search = search;
            ViewBag.SelectedUnit = unit;
            ViewBag.SelectedYear = year;
            ViewBag.SelectedAchievement = achievement;
            ViewBag.SelectedStatus = status;
            ViewBag.SelectedGender = gender;
            ViewBag.SelectedHometown = hometown;
            
            return View(paginatedMembers);
        }

        public async Task<IActionResult> Details(string id)
        {
            var member = await _memberService.GetMemberByIdAsync(id);
            if (member == null)
                return NotFound();

            return View(member);
        }

        public async Task<IActionResult> Create()
        {
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Create(Models.Member member)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    await _memberService.CreateMemberAsync(member);
                    TempData["Success"] = "Member created successfully!";
                    return RedirectToAction(nameof(Details), new { id = member.Id });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error creating member: {ex.Message}");
                }
            }
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View(member);
        }

        public async Task<IActionResult> Edit(string id)
        {
            var member = await _memberService.GetMemberByIdAsync(id);
            if (member == null)
                return NotFound();

            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View(member);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(string id, Models.Member member)
        {
            if (id != member.Id)
                return BadRequest();

            bool isAjax = Request.Headers["X-Requested-With"] == "XMLHttpRequest";

            if (ModelState.IsValid)
            {
                try
                {
                    await _memberService.UpdateMemberAsync(member);
                    
                    if (isAjax)
                    {
                        return Ok(new { success = true, id = member.Id });
                    }

                    TempData["Success"] = "Member updated successfully!";
                    return RedirectToAction(nameof(Details), new { id = member.Id });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error updating member: {ex.Message}");
                }
            }

            if (isAjax)
            {
                return BadRequest(new { success = false, errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
            }

            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View(member);
        }

        public async Task<IActionResult> Delete(string id)
        {
            var member = await _memberService.GetMemberByIdAsync(id);
            if (member == null)
                return NotFound();

            return View(member);
        }

        [HttpPost, ActionName("Delete")]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
            try
            {
                await _memberService.DeleteMemberAsync(id);
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Error deleting member: {ex.Message}");
                var member = await _memberService.GetMemberByIdAsync(id);
                return View(member);
            }
        }

        [HttpPost]
        public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteRequest request)
        {
            if (request == null)
                return BadRequest(new { success = false, message = "Invalid request" });

            try
            {
                List<Models.Member> membersToDelete = new List<Models.Member>();

                if (request.SelectAllGlobal)
                {
                    membersToDelete = await _memberService.GetAllMembersAsync();
                }
                else if (request.DeleteFiltered)
                {
                    var allMembers = await _memberService.GetAllMembersAsync();
                    membersToDelete = allMembers.Where(m => 
                        (string.IsNullOrEmpty(request.Search) || m.FullName.Contains(request.Search, StringComparison.OrdinalIgnoreCase) || m.MemberId.Contains(request.Search, StringComparison.OrdinalIgnoreCase)) &&
                        (string.IsNullOrEmpty(request.Unit) || (m.Unit != null && m.Unit.Name.Contains(request.Unit, StringComparison.OrdinalIgnoreCase))) &&
                        (string.IsNullOrEmpty(request.Status) || m.Status.Contains(request.Status, StringComparison.OrdinalIgnoreCase)) &&
                        (string.IsNullOrEmpty(request.Achievement) || m.AchievementLevel.Contains(request.Achievement, StringComparison.OrdinalIgnoreCase)) &&
                        (string.IsNullOrEmpty(request.Year) || m.AcademicYear == request.Year || (m.FullName != null && m.FullName.Contains(request.Year))) &&
                        (string.IsNullOrEmpty(request.Gender) || m.Gender.Equals(request.Gender, StringComparison.OrdinalIgnoreCase)) &&
                        (string.IsNullOrEmpty(request.Hometown) || (m.FullName != null && m.FullName.Contains(request.Hometown, StringComparison.OrdinalIgnoreCase))) // Simple heuristic for hometown if not in model
                    ).ToList();
                }
                else if (request.Ids != null && request.Ids.Any())
                {
                    foreach (var id in request.Ids)
                    {
                        var member = await _memberService.GetMemberByIdAsync(id);
                        if (member != null) membersToDelete.Add(member);
                    }
                }

                int count = 0;
                foreach (var m in membersToDelete)
                {
                    await _memberService.DeleteMemberAsync(m.Id);
                    count++;
                }

                return Ok(new { success = true, count = count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        public class BulkDeleteRequest
        {
            public List<string>? Ids { get; set; }
            public bool SelectAllGlobal { get; set; }
            public bool DeleteFiltered { get; set; }
            
            // Filter criteria
            public string? Search { get; set; }
            public string? Unit { get; set; }
            public string? Year { get; set; }
            public string? Achievement { get; set; }
            public string? Status { get; set; }
            public string? Gender { get; set; }
            public string? Hometown { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> ChangeStatus(string id, string newStatus, string? reason = null)
        {
            try
            {
                await _memberService.ChangeMemberStatusAsync(id, newStatus, reason);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> ExportExcel()
        {
            var members = await _memberService.GetAllMembersAsync();
            
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using (var package = new ExcelPackage())
            {
                var worksheet = package.Workbook.Worksheets.Add("Danh sách đoàn viên");
                
                // Add headers
                worksheet.Cells[1, 1].Value = "STT";
                worksheet.Cells[1, 2].Value = "HỌ VÀ TÊN";
                worksheet.Cells[1, 3].Value = "MÃ ĐỊNH DANH";
                worksheet.Cells[1, 4].Value = "NGÀY SINH";
                worksheet.Cells[1, 5].Value = "GIỚI TÍNH";
                worksheet.Cells[1, 6].Value = "CHI ĐOÀN";
                worksheet.Cells[1, 7].Value = "TRẠNG THÁI";
                worksheet.Cells[1, 8].Value = "XẾP LOẠI";
                worksheet.Cells[1, 9].Value = "DÂN TỘC";

                // Style headers
                using (var range = worksheet.Cells[1, 1, 1, 9])
                {
                    range.Style.Font.Bold = true;
                    range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(26, 115, 232));
                    range.Style.Font.Color.SetColor(System.Drawing.Color.White);
                    range.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                }

                // Add data
                for (int i = 0; i < members.Count; i++)
                {
                    var m = members[i];
                    worksheet.Cells[i + 2, 1].Value = i + 1;
                    worksheet.Cells[i + 2, 2].Value = m.FullName;
                    worksheet.Cells[i + 2, 3].Value = m.MemberId;
                    worksheet.Cells[i + 2, 4].Value = m.DOB;
                    worksheet.Cells[i + 2, 5].Value = m.Gender;
                    worksheet.Cells[i + 2, 6].Value = m.Unit?.Name ?? "N/A";
                    worksheet.Cells[i + 2, 7].Value = m.Status;
                    worksheet.Cells[i + 2, 8].Value = m.AchievementLevel;
                    worksheet.Cells[i + 2, 9].Value = m.Ethnic;
                }

                worksheet.Cells.AutoFitColumns();
                
                var stream = new MemoryStream();
                package.SaveAs(stream);
                stream.Position = 0;

                string fileName = $"DanhSachDoanVien_{DateTime.Now:yyyyMMdd}.xlsx";
                return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
        }

        [HttpPost]
        public async Task<IActionResult> ToggleOutstanding(string id)
        {
            try
            {
                var member = await _memberService.GetMemberByIdAsync(id);
                if (member == null) return NotFound(new { success = false, message = "Không tìm thấy đoàn viên" });

                member.IsOutstanding = !member.IsOutstanding;
                await _memberService.UpdateMemberAsync(member);
                return Ok(new { success = true, isOutstanding = member.IsOutstanding });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateAchievement(string id, string achievement)
        {
            try
            {
                var member = await _memberService.GetMemberByIdAsync(id);
                if (member == null) return NotFound(new { success = false, message = "Không tìm thấy đoàn viên" });

                member.AchievementLevel = achievement;
                await _memberService.UpdateMemberAsync(member);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
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

                    TempData["Success"] = $"Đã nhập thành công {importedCount} đoàn viên từ file Excel.";
                }
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Lỗi khi xử lý file: {ex.Message}";
            }

            return RedirectToAction("Index");
        }
    }

    [Authorize]
    public class UnitsController : Controller
    {
        private readonly IUnitService _unitService;
        private readonly UserManager<ApplicationUser> _userManager;

        public UnitsController(IUnitService unitService, UserManager<ApplicationUser> userManager)
        {
            _unitService = unitService;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null && user.Role == "Secretary" && !string.IsNullOrEmpty(user.UnitId))
            {
                var userUnit = await _unitService.GetUnitByIdAsync(user.UnitId);
                return View(new List<Unit> { userUnit! });
            }

            var units = await _unitService.GetRootUnitsAsync();
            return View(units);
        }

        public async Task<IActionResult> Details(string id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null && user.Role == "Secretary" && user.UnitId != id)
            {
                return Forbid();
            }

            var unit = await _unitService.GetUnitByIdAsync(id);
            if (unit == null)
                return NotFound();

            return View(unit);
        }

        public async Task<IActionResult> Create()
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.ParentUnits = units;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Create(Models.Unit unit)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            if (ModelState.IsValid)
            {
                try
                {
                    await _unitService.CreateUnitAsync(unit);
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error creating unit: {ex.Message}");
                }
            }
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.ParentUnits = units;
            return View(unit);
        }

        public async Task<IActionResult> Edit(string id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null && user.Role == "Secretary" && user.UnitId != id)
            {
                return Forbid();
            }

            var unit = await _unitService.GetUnitByIdAsync(id);
            if (unit == null)
                return NotFound();

            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.ParentUnits = units;
            return View(unit);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(string id, Models.Unit unit)
        {
            if (id != unit.Id)
                return BadRequest();

            var user = await _userManager.GetUserAsync(User);
            if (user != null && user.Role == "Secretary" && user.UnitId != id)
            {
                return Forbid();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    await _unitService.UpdateUnitAsync(unit);
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error updating unit: {ex.Message}");
                }
            }
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.ParentUnits = units;
            return View(unit);
        }

        public async Task<IActionResult> Delete(string id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var unit = await _unitService.GetUnitByIdAsync(id);
            if (unit == null)
                return NotFound();

            return View(unit);
        }

        [HttpPost, ActionName("Delete")]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            try
            {
                await _unitService.DeleteUnitAsync(id);
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Error deleting unit: {ex.Message}");
                var unit = await _unitService.GetUnitByIdAsync(id);
                return View(unit);
            }
        }
    }
}

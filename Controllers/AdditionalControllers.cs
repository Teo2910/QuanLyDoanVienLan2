using Microsoft.AspNetCore.Mvc;
using QLDV.Services;
using QLDV.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace QLDV.Controllers
{
    [Authorize]
    public class ActivitiesController : Controller
    {
        private readonly IActivityService _activityService;

        public ActivitiesController(IActivityService activityService)
        {
            _activityService = activityService;
        }

        public async Task<IActionResult> Index()
        {
            var activities = await _activityService.GetAllActivitiesAsync();
            return View(activities);
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
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
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
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
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
    }

    [Authorize]
    public class MovementsController : Controller
    {
        private readonly IMovementService _movementService;
        private readonly IUnitService _unitService;
        private readonly IFileService _fileService;

        public MovementsController(IMovementService movementService, IUnitService unitService, IFileService fileService)
        {
            _movementService = movementService;
            _unitService = unitService;
            _fileService = fileService;
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

        public async Task<IActionResult> Details(string id)
        {
            var movement = await _movementService.GetMovementByIdAsync(id);
            if (movement == null)
                return NotFound();

            var reports = await _movementService.GetReportsByMovementAsync(id);
            ViewBag.Reports = reports;
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
                    return RedirectToAction(nameof(Index));
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

            if (ModelState.IsValid)
            {
                try
                {
                    await _movementService.UpdateMovementAsync(movement);
                    return RedirectToAction(nameof(Index));
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

        public async Task<IActionResult> SubmitReport(string movementId)
        {
            ViewBag.MovementId = movementId;
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> SubmitReport(string movementId, MovementReport report, List<IFormFile> attachments)
        {
            report.MovementId = movementId;
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
                    TempData["Success"] = "Report submitted successfully!";
                    return RedirectToAction(nameof(Details), new { id = movementId });
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error submitting report: {ex.Message}");
                }
            }
            ViewBag.MovementId = movementId;
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.Units = units;
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
                    return RedirectToAction(nameof(Index));
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
                    return RedirectToAction(nameof(Index));
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

        public StatisticsController(IStatisticsService statisticsService)
        {
            _statisticsService = statisticsService;
        }

        public async Task<IActionResult> Index()
        {
            var totalMembers = await _statisticsService.GetTotalMembersAsync();
            var membersByStatus = await _statisticsService.GetMemberCountByStatusAsync();
            var membersByGender = await _statisticsService.GetMemberCountByGenderAsync();
            var membersByAchievement = await _statisticsService.GetMemberCountByAchievementAsync();
            var membersByUnit = await _statisticsService.GetMembersByUnitAsync();

            ViewBag.TotalMembers = totalMembers;
            ViewBag.MembersByStatus = membersByStatus;
            ViewBag.MembersByGender = membersByGender;
            ViewBag.MembersByAchievement = membersByAchievement;
            ViewBag.MembersByUnit = membersByUnit;

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

using Microsoft.AspNetCore.Mvc;
using QLDV.Services;
using Microsoft.AspNetCore.Authorization;

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

        public async Task<IActionResult> Index()
        {
            var members = await _memberService.GetAllMembersAsync();
            return View(members);
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
                    return RedirectToAction(nameof(Index));
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

            if (ModelState.IsValid)
            {
                try
                {
                    await _memberService.UpdateMemberAsync(member);
                    TempData["Success"] = "Member updated successfully!";
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Error updating member: {ex.Message}");
                }
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
    }

    [Authorize]
    public class UnitsController : Controller
    {
        private readonly IUnitService _unitService;

        public UnitsController(IUnitService unitService)
        {
            _unitService = unitService;
        }

        public async Task<IActionResult> Index()
        {
            var units = await _unitService.GetRootUnitsAsync();
            return View(units);
        }

        public async Task<IActionResult> Details(string id)
        {
            var unit = await _unitService.GetUnitByIdAsync(id);
            if (unit == null)
                return NotFound();

            return View(unit);
        }

        public async Task<IActionResult> Create()
        {
            var units = await _unitService.GetAllUnitsAsync();
            ViewBag.ParentUnits = units;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Create(Models.Unit unit)
        {
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
            var unit = await _unitService.GetUnitByIdAsync(id);
            if (unit == null)
                return NotFound();

            return View(unit);
        }

        [HttpPost, ActionName("Delete")]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
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

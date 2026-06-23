using Microsoft.AspNetCore.Mvc;
using QLDV.Services;
using QLDV.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace QLDV.Controllers
{
    [Authorize]
    public class InitiativesController : Controller
    {
        private readonly IInitiativeService _initiativeService;
        private readonly IUnitService _unitService;
        private readonly IMemberService _memberService;
        private readonly ILogService _logService;
        private readonly UserManager<ApplicationUser> _userManager;

        public InitiativesController(
            IInitiativeService initiativeService,
            IUnitService unitService,
            IMemberService memberService,
            ILogService logService,
            UserManager<ApplicationUser> userManager)
        {
            _initiativeService = initiativeService;
            _unitService = unitService;
            _memberService = memberService;
            _logService = logService;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index(string search = "", string unit = "", string field = "", string status = "")
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            List<Initiative> allInitiatives;
            if (isSecretary && !isAdmin && !string.IsNullOrEmpty(currentUser?.UnitId))
            {
                allInitiatives = await _initiativeService.GetInitiativesByUnitAsync(currentUser.UnitId);
            }
            else
            {
                allInitiatives = await _initiativeService.GetAllInitiativesAsync();
            }

            // Filtering
            var filtered = allInitiatives.Where(i =>
                (string.IsNullOrEmpty(search) || i.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                 (i.Author != null && i.Author.FullName.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                 (!string.IsNullOrEmpty(i.CoAuthors) && i.CoAuthors.Contains(search, StringComparison.OrdinalIgnoreCase))) &&
                (string.IsNullOrEmpty(unit) || (i.Unit != null && i.Unit.Name.Equals(unit, StringComparison.OrdinalIgnoreCase))) &&
                (string.IsNullOrEmpty(field) || i.Field.Equals(field, StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrEmpty(status) || i.Status.Equals(status, StringComparison.OrdinalIgnoreCase))
            ).ToList();

            // Populate Filter dropdown lists
            List<Unit> units;
            if (isSecretary && !isAdmin && !string.IsNullOrEmpty(currentUser?.UnitId))
            {
                var userUnit = await _unitService.GetUnitByIdAsync(currentUser.UnitId);
                units = userUnit != null ? new List<Unit> { userUnit } : new List<Unit>();
            }
            else
            {
                units = await _unitService.GetAllUnitsAsync();
            }

            ViewBag.Units = units;
            ViewBag.Fields = new List<string> { "Học tập", "Nghiên cứu khoa học", "Hoạt động Đoàn", "Chuyên môn", "Khác" };
            ViewBag.Statuses = new List<string> { "Ý tưởng", "Đang thử nghiệm", "Đang triển khai", "Đã áp dụng" };

            // Stats calculation for display
            var fieldStats = await _initiativeService.GetInitiativeCountByFieldAsync(isSecretary && !isAdmin ? currentUser?.UnitId : null);
            var unitStats = await _initiativeService.GetInitiativeCountByUnitAsync();

            ViewBag.FieldStats = fieldStats;
            ViewBag.UnitStats = unitStats;
            ViewBag.TotalCount = allInitiatives.Count;
            ViewBag.AppliedCount = allInitiatives.Count(i => i.Status == "Đã áp dụng");
            ViewBag.InDevelopmentCount = allInitiatives.Count(i => i.Status == "Đang triển khai" || i.Status == "Đang thử nghiệm");
            ViewBag.IdeaCount = allInitiatives.Count(i => i.Status == "Ý tưởng");

            // Filter state preservation
            ViewBag.Search = search;
            ViewBag.SelectedUnit = unit;
            ViewBag.SelectedField = field;
            ViewBag.SelectedStatus = status;
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(filtered);
        }

        public async Task<IActionResult> Details(string id)
        {
            var initiative = await _initiativeService.GetInitiativeByIdAsync(id);
            if (initiative == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && initiative.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            return View(initiative);
        }

        public async Task<IActionResult> Create()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            List<Unit> units;
            List<Member> members;

            if (isSecretary && !isAdmin && !string.IsNullOrEmpty(currentUser?.UnitId))
            {
                var userUnit = await _unitService.GetUnitByIdAsync(currentUser.UnitId);
                units = userUnit != null ? new List<Unit> { userUnit } : new List<Unit>();
                members = await _memberService.GetMembersByUnitAsync(currentUser.UnitId);
            }
            else
            {
                units = await _unitService.GetAllUnitsAsync();
                members = await _memberService.GetAllMembersAsync();
            }

            ViewBag.Units = units;
            ViewBag.Members = members;
            ViewBag.Fields = new List<string> { "Học tập", "Nghiên cứu khoa học", "Hoạt động Đoàn", "Chuyên môn", "Khác" };
            ViewBag.Statuses = new List<string> { "Ý tưởng", "Đang thử nghiệm", "Đang triển khai", "Đã áp dụng" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Initiative initiative)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin)
            {
                initiative.UnitId = currentUser?.UnitId ?? string.Empty;
            }

            if (ModelState.IsValid)
            {
                await _initiativeService.CreateInitiativeAsync(initiative);
                TempData["Success"] = "Đăng ký sáng kiến/ý tưởng thành công!";
                return RedirectToAction(nameof(Index));
            }

            List<Unit> units;
            List<Member> members;
            if (isSecretary && !isAdmin && !string.IsNullOrEmpty(currentUser?.UnitId))
            {
                var userUnit = await _unitService.GetUnitByIdAsync(currentUser.UnitId);
                units = userUnit != null ? new List<Unit> { userUnit } : new List<Unit>();
                members = await _memberService.GetMembersByUnitAsync(currentUser.UnitId);
            }
            else
            {
                units = await _unitService.GetAllUnitsAsync();
                members = await _memberService.GetAllMembersAsync();
            }

            ViewBag.Units = units;
            ViewBag.Members = members;
            ViewBag.Fields = new List<string> { "Học tập", "Nghiên cứu khoa học", "Hoạt động Đoàn", "Chuyên môn", "Khác" };
            ViewBag.Statuses = new List<string> { "Ý tưởng", "Đang thử nghiệm", "Đang triển khai", "Đã áp dụng" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(initiative);
        }

        public async Task<IActionResult> Edit(string id)
        {
            var initiative = await _initiativeService.GetInitiativeByIdAsync(id);
            if (initiative == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && initiative.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            List<Unit> units;
            List<Member> members;
            if (isSecretary && !isAdmin && !string.IsNullOrEmpty(currentUser?.UnitId))
            {
                var userUnit = await _unitService.GetUnitByIdAsync(currentUser.UnitId);
                units = userUnit != null ? new List<Unit> { userUnit } : new List<Unit>();
                members = await _memberService.GetMembersByUnitAsync(currentUser.UnitId);
            }
            else
            {
                units = await _unitService.GetAllUnitsAsync();
                members = await _memberService.GetAllMembersAsync();
            }

            ViewBag.Units = units;
            ViewBag.Members = members;
            ViewBag.Fields = new List<string> { "Học tập", "Nghiên cứu khoa học", "Hoạt động Đoàn", "Chuyên môn", "Khác" };
            ViewBag.Statuses = new List<string> { "Ý tưởng", "Đang thử nghiệm", "Đang triển khai", "Đã áp dụng" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(initiative);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, Initiative initiative)
        {
            if (id != initiative.Id) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && initiative.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    await _initiativeService.UpdateInitiativeAsync(initiative);
                    TempData["Success"] = "Cập nhật sáng kiến/ý tưởng thành công!";
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", $"Lỗi khi cập nhật: {ex.Message}");
                }
            }

            List<Unit> units;
            List<Member> members;
            if (isSecretary && !isAdmin && !string.IsNullOrEmpty(currentUser?.UnitId))
            {
                var userUnit = await _unitService.GetUnitByIdAsync(currentUser.UnitId);
                units = userUnit != null ? new List<Unit> { userUnit } : new List<Unit>();
                members = await _memberService.GetMembersByUnitAsync(currentUser.UnitId);
            }
            else
            {
                units = await _unitService.GetAllUnitsAsync();
                members = await _memberService.GetAllMembersAsync();
            }

            ViewBag.Units = units;
            ViewBag.Members = members;
            ViewBag.Fields = new List<string> { "Học tập", "Nghiên cứu khoa học", "Hoạt động Đoàn", "Chuyên môn", "Khác" };
            ViewBag.Statuses = new List<string> { "Ý tưởng", "Đang thử nghiệm", "Đang triển khai", "Đã áp dụng" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(initiative);
        }

        public async Task<IActionResult> Delete(string id)
        {
            var initiative = await _initiativeService.GetInitiativeByIdAsync(id);
            if (initiative == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && initiative.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            return View(initiative);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
            var initiative = await _initiativeService.GetInitiativeByIdAsync(id);
            if (initiative == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && initiative.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            await _initiativeService.DeleteInitiativeAsync(id);
            TempData["Success"] = "Xóa sáng kiến/ý tưởng thành công!";
            return RedirectToAction(nameof(Index));
        }
    }
}

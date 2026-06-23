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
    public class AwardsController : Controller
    {
        private readonly IAwardService _awardService;
        private readonly IUnitService _unitService;
        private readonly IMemberService _memberService;
        private readonly ILogService _logService;
        private readonly UserManager<ApplicationUser> _userManager;

        public AwardsController(
            IAwardService awardService,
            IUnitService unitService,
            IMemberService memberService,
            ILogService logService,
            UserManager<ApplicationUser> userManager)
        {
            _awardService = awardService;
            _unitService = unitService;
            _memberService = memberService;
            _logService = logService;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index(string search = "", string unit = "", string targetType = "", string level = "")
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            List<Award> allAwards;
            if (isSecretary && !isAdmin && !string.IsNullOrEmpty(currentUser?.UnitId))
            {
                allAwards = await _awardService.GetAwardsByUnitAsync(currentUser.UnitId);
            }
            else
            {
                allAwards = await _awardService.GetAllAwardsAsync();
            }

            // Filtering
            var filtered = allAwards.Where(a =>
                (string.IsNullOrEmpty(search) || a.Content.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                 (a.Member != null && a.Member.FullName.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                 a.Form.Contains(search, StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrEmpty(unit) || (a.Unit != null && a.Unit.Name.Equals(unit, StringComparison.OrdinalIgnoreCase))) &&
                (string.IsNullOrEmpty(targetType) || a.TargetType.Equals(targetType, StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrEmpty(level) || a.Level.Equals(level, StringComparison.OrdinalIgnoreCase))
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
            ViewBag.Levels = new List<string> { "Cấp Trung ương", "Cấp Tỉnh/Thành phố", "Cấp Huyện/Trường", "Cấp Cơ sở/Chi đoàn" };
            ViewBag.TargetTypes = new List<string> { "Cá nhân", "Đơn vị" };

            // Stats calculation: count by Unit
            var unitStats = await _awardService.GetAwardCountByUnitAsync();
            ViewBag.UnitStats = unitStats;
            
            ViewBag.TotalCount = allInitiativesCount(allAwards); // Helper or custom
            ViewBag.UnitAwardsCount = allAwards.Count(a => a.TargetType == "Đơn vị");
            ViewBag.MemberAwardsCount = allAwards.Count(a => a.TargetType == "Cá nhân");
            
            // Pass values back to view
            ViewBag.Search = search;
            ViewBag.SelectedUnit = unit;
            ViewBag.SelectedTargetType = targetType;
            ViewBag.SelectedLevel = level;
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(filtered);
        }

        private int allInitiativesCount(List<Award> list)
        {
            return list.Count;
        }

        public async Task<IActionResult> Details(string id)
        {
            var award = await _awardService.GetAwardByIdAsync(id);
            if (award == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && award.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            return View(award);
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
            ViewBag.Levels = new List<string> { "Cấp Trung ương", "Cấp Tỉnh/Thành phố", "Cấp Huyện/Trường", "Cấp Cơ sở/Chi đoàn" };
            ViewBag.TargetTypes = new List<string> { "Cá nhân", "Đơn vị" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Award award)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin)
            {
                award.UnitId = currentUser?.UnitId ?? string.Empty;
            }

            // Adjust values depending on TargetType
            if (award.TargetType == "Đơn vị")
            {
                award.MemberId = null;
                // Clear validation errors for MemberId if any
                ModelState.Remove("MemberId");
            }

            if (ModelState.IsValid)
            {
                await _awardService.CreateAwardAsync(award);
                TempData["Success"] = "Đăng ký khen thưởng thành công!";
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
            ViewBag.Levels = new List<string> { "Cấp Trung ương", "Cấp Tỉnh/Thành phố", "Cấp Huyện/Trường", "Cấp Cơ sở/Chi đoàn" };
            ViewBag.TargetTypes = new List<string> { "Cá nhân", "Đơn vị" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(award);
        }

        public async Task<IActionResult> Edit(string id)
        {
            var award = await _awardService.GetAwardByIdAsync(id);
            if (award == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && award.UnitId != currentUser?.UnitId)
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
            ViewBag.Levels = new List<string> { "Cấp Trung ương", "Cấp Tỉnh/Thành phố", "Cấp Huyện/Trường", "Cấp Cơ sở/Chi đoàn" };
            ViewBag.TargetTypes = new List<string> { "Cá nhân", "Đơn vị" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(award);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, Award award)
        {
            if (id != award.Id) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && award.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            if (award.TargetType == "Đơn vị")
            {
                award.MemberId = null;
                ModelState.Remove("MemberId");
            }

            if (ModelState.IsValid)
            {
                try
                {
                    await _awardService.UpdateAwardAsync(award);
                    TempData["Success"] = "Cập nhật khen thưởng thành công!";
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
            ViewBag.Levels = new List<string> { "Cấp Trung ương", "Cấp Tỉnh/Thành phố", "Cấp Huyện/Trường", "Cấp Cơ sở/Chi đoàn" };
            ViewBag.TargetTypes = new List<string> { "Cá nhân", "Đơn vị" };
            ViewBag.IsAdmin = isAdmin;
            ViewBag.IsSecretary = isSecretary;

            return View(award);
        }

        public async Task<IActionResult> Delete(string id)
        {
            var award = await _awardService.GetAwardByIdAsync(id);
            if (award == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && award.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            return View(award);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
            var award = await _awardService.GetAwardByIdAsync(id);
            if (award == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            var isSecretary = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Secretary") || currentUser.Role == "Secretary");

            if (isSecretary && !isAdmin && award.UnitId != currentUser?.UnitId)
            {
                return Forbid();
            }

            await _awardService.DeleteAwardAsync(id);
            TempData["Success"] = "Xóa khen thưởng thành công!";
            return RedirectToAction(nameof(Index));
        }
    }
}

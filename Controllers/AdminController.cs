using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using QLDV.Models;
using Microsoft.AspNetCore.Authorization;
using QLDV.Services;
using Microsoft.EntityFrameworkCore;

namespace QLDV.Controllers
{
    [Authorize(Roles = "Admin")]
    public class AdminController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IUnitService _unitService;
        private readonly IFileService _fileService;
        private readonly ILogService _logService;

        public AdminController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IUnitService unitService,
            IFileService fileService,
            ILogService logService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _unitService = unitService;
            _fileService = fileService;
            _logService = logService;
        }

        public async Task<IActionResult> Users()
        {
            var users = await _userManager.Users.ToListAsync();
            
            // Populate the Role property for each user if not already set or to ensure it's correct from Identity
            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                user.Role = roles.FirstOrDefault() ?? "User";
            }

            ViewBag.Units = await _unitService.GetAllUnitsAsync();
            return View(users);
        }

        [HttpGet]
        public async Task<IActionResult> CreateSecretary()
        {
            ViewBag.Units = await _unitService.GetAllUnitsAsync();
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateSecretary(CreateSecretaryViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = new ApplicationUser
                {
                    UserName = model.Email,
                    Email = model.Email,
                    FullName = model.FullName,
                    UnitId = model.Role == "Admin" ? null : model.UnitId,
                    Role = model.Role,
                    IsSecretary = model.Role == "Secretary",
                    CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };

                if (model.Avatar != null)
                {
                    var fileName = await _fileService.SaveFileAsync(model.Avatar, "avatars");
                    user.AvatarUrl = _fileService.GetFileUrl(fileName, "avatars");
                }

                var result = await _userManager.CreateAsync(user, model.Password);
                if (result.Succeeded)
                {
                    if (!await _roleManager.RoleExistsAsync(model.Role))
                    {
                        await _roleManager.CreateAsync(new IdentityRole(model.Role));
                    }

                    await _userManager.AddToRoleAsync(user, model.Role);
                    
                    var currentUser = await _userManager.GetUserAsync(User);
                    await _logService.LogActivityAsync(
                        currentUser?.Id ?? "system",
                        currentUser?.FullName ?? "Admin",
                        "CREATE",
                        "User",
                        user.Id,
                        $"Created {model.Role.ToLower()} account for {user.FullName} ({user.Email})"
                    );

                    TempData["Success"] = $"Đã tạo tài khoản {model.Role} thành công!";
                    return RedirectToAction(nameof(Users));
                }

                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError("", error.Description);
                }
            }

            ViewBag.Units = await _unitService.GetAllUnitsAsync();
            return View(model);
        }

        [HttpGet]
        public async Task<IActionResult> EditUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            var roles = await _userManager.GetRolesAsync(user);
            var model = new EditUserViewModel
            {
                Id = user.Id,
                Email = user.Email!,
                FullName = user.FullName ?? "",
                UnitId = user.UnitId,
                PhoneNumber = user.PhoneNumber,
                Role = roles.FirstOrDefault() ?? "User"
            };

            ViewBag.Units = await _unitService.GetAllUnitsAsync();
            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditUser(EditUserViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await _userManager.FindByIdAsync(model.Id);
                if (user == null) return NotFound();

                user.FullName = model.FullName;
                user.UnitId = model.Role == "Admin" ? null : model.UnitId;
                user.PhoneNumber = model.PhoneNumber;
                user.Role = model.Role;
                user.IsSecretary = model.Role == "Secretary";
                
                if (user.Email != model.Email)
                {
                    user.Email = model.Email;
                    user.UserName = model.Email;
                }

                if (model.Avatar != null)
                {
                    var fileName = await _fileService.SaveFileAsync(model.Avatar, "avatars");
                    user.AvatarUrl = _fileService.GetFileUrl(fileName, "avatars");
                }

                var result = await _userManager.UpdateAsync(user);
                if (result.Succeeded)
                {
                    // Update Role
                    var currentRoles = await _userManager.GetRolesAsync(user);
                    if (!currentRoles.Contains(model.Role))
                    {
                        await _userManager.RemoveFromRolesAsync(user, currentRoles);
                        if (!await _roleManager.RoleExistsAsync(model.Role))
                        {
                            await _roleManager.CreateAsync(new IdentityRole(model.Role));
                        }
                        await _userManager.AddToRoleAsync(user, model.Role);
                    }

                    if (!string.IsNullOrEmpty(model.NewPassword))
                    {
                        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                        await _userManager.ResetPasswordAsync(user, token, model.NewPassword);
                    }

                    var currentUser = await _userManager.GetUserAsync(User);
                    await _logService.LogActivityAsync(
                        currentUser?.Id ?? "system",
                        currentUser?.FullName ?? "Admin",
                        "UPDATE",
                        "User",
                        user.Id,
                        $"Updated account for {user.FullName} ({user.Email}) - Role: {model.Role}"
                    );

                    TempData["Success"] = "Cập nhật tài khoản thành công!";
                    return RedirectToAction(nameof(Users));
                }

                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError("", error.Description);
                }
            }

            ViewBag.Units = await _unitService.GetAllUnitsAsync();
            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, "123456");

            if (result.Succeeded)
            {
                var currentUser = await _userManager.GetUserAsync(User);
                await _logService.LogActivityAsync(
                    currentUser?.Id ?? "system",
                    currentUser?.FullName ?? "Admin",
                    "UPDATE",
                    "User",
                    user.Id,
                    $"Reset password to default (123456) for {user.FullName} ({user.Email})"
                );

                return Ok(new { success = true, message = "Đã đặt lại mật khẩu về mặc định (123456)." });
            }

            return BadRequest(new { success = false, message = "Lỗi khi đặt lại mật khẩu." });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Prevent deleting self
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser?.Id == id)
            {
                return BadRequest("Bạn không thể tự xóa tài khoản của chính mình.");
            }

            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded)
            {
                await _logService.LogActivityAsync(
                    currentUser?.Id ?? "system",
                    currentUser?.FullName ?? "Admin",
                    "DELETE",
                    "User",
                    user.Id,
                    $"Deleted account for {user.FullName} ({user.Email})"
                );

                return Ok(new { success = true });
            }

            return BadRequest(new { success = false, message = "Lỗi khi xóa tài khoản." });
        }
    }

    public class CreateSecretaryViewModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "Secretary";
        public string? UnitId { get; set; }
        public IFormFile? Avatar { get; set; }
    }

    public class EditUserViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "Secretary";
        public string? UnitId { get; set; }
        public string? PhoneNumber { get; set; }
        public string? NewPassword { get; set; }
        public IFormFile? Avatar { get; set; }
    }
}

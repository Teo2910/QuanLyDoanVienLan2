using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using QLDV.Models;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using QLDV.Services;

namespace QLDV.Controllers
{
    public class AccountController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IFileService _fileService;

        public AccountController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<IdentityRole> roleManager,
            IFileService fileService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _fileService = fileService;
        }

        [HttpGet]
        public IActionResult Login(string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model, string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;
            if (ModelState.IsValid)
            {
                var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, model.RememberMe, lockoutOnFailure: false);
                if (result.Succeeded)
                {
                    return RedirectToLocal(returnUrl);
                }
                ModelState.AddModelError(string.Empty, "Invalid login attempt.");
            }
            return View(model);
        }

        [HttpGet]
        public async Task<IActionResult> Register()
        {
            using var scope = HttpContext.RequestServices.CreateScope();
            var unitService = scope.ServiceProvider.GetRequiredService<IUnitService>();
            ViewBag.Units = await unitService.GetAllUnitsAsync();
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = new ApplicationUser 
                { 
                    UserName = model.Email, 
                    Email = model.Email,
                    FullName = model.FullName,
                    UnitId = model.UnitId,
                    Role = "Secretary",
                    IsSecretary = true,
                    CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };

                if (model.Avatar != null)
                {
                    try
                    {
                        var fileName = await _fileService.SaveFileAsync(model.Avatar, "avatars");
                        user.AvatarUrl = _fileService.GetFileUrl(fileName, "avatars");
                    }
                    catch (Exception ex)
                    {
                        ModelState.AddModelError("", "Error uploading avatar: " + ex.Message);
                        await FetchUnitsForViewBag();
                        return View(model);
                    }
                }

                var result = await _userManager.CreateAsync(user, model.Password);
                if (result.Succeeded)
                {
                    // Ensure Secretary role exists
                    if (!await _roleManager.RoleExistsAsync("Secretary"))
                        await _roleManager.CreateAsync(new IdentityRole("Secretary"));

                    await _userManager.AddToRoleAsync(user, "Secretary");
                    await _userManager.UpdateAsync(user);

                    await _signInManager.SignInAsync(user, isPersistent: false);
                    return RedirectToAction("Index", "Dashboard");
                }
                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
            }
            
            await FetchUnitsForViewBag();
            return View(model);
        }

        private async Task FetchUnitsForViewBag()
        {
            using var scope = HttpContext.RequestServices.CreateScope();
            var unitService = scope.ServiceProvider.GetRequiredService<IUnitService>();
            ViewBag.Units = await unitService.GetAllUnitsAsync();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return RedirectToAction("Index", "Dashboard");
        }

        [HttpGet]
        public IActionResult AccessDenied()
        {
            return View();
        }

        [HttpGet]
        [Authorize]
        public IActionResult Profile()
        {
            return View();
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateProfile(UpdateProfileViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await _userManager.GetUserAsync(User);
                if (user == null) return NotFound();

                user.FullName = model.FullName;
                user.PhoneNumber = model.PhoneNumber;

                if (model.Avatar != null)
                {
                    try
                    {
                        var fileName = await _fileService.SaveFileAsync(model.Avatar, "avatars");
                        user.AvatarUrl = _fileService.GetFileUrl(fileName, "avatars");
                    }
                    catch (Exception ex)
                    {
                        return Json(new { success = false, message = "Error uploading avatar: " + ex.Message });
                    }
                }

                // Handle password change if requested
                if (!string.IsNullOrEmpty(model.CurrentPassword) && !string.IsNullOrEmpty(model.NewPassword))
                {
                    var changePasswordResult = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
                    if (!changePasswordResult.Succeeded)
                    {
                        return Json(new { success = false, message = "Mật khẩu hiện tại không chính xác hoặc mật khẩu mới không hợp lệ." });
                    }
                }

                var result = await _userManager.UpdateAsync(user);
                if (result.Succeeded)
                {
                    return Json(new { success = true, message = "Cập nhật thông tin thành công!", user = new { fullName = user.FullName, avatarUrl = user.AvatarUrl, phoneNumber = user.PhoneNumber } });
                }
                
                return Json(new { success = false, message = string.Join(", ", result.Errors.Select(e => e.Description)) });
            }
            return Json(new { success = false, message = "Dữ liệu không hợp lệ." });
        }

        private IActionResult RedirectToLocal(string? returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }
            else
            {
                return RedirectToAction(nameof(DashboardController.Index), "Dashboard");
            }
        }
    }

    public class LoginViewModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool RememberMe { get; set; }
    }

    public class RegisterViewModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? UnitId { get; set; }
        public IFormFile? Avatar { get; set; }
    }

    public class UpdateProfileViewModel
    {
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public IFormFile? Avatar { get; set; }
        public string? CurrentPassword { get; set; }
        public string? NewPassword { get; set; }
        public string? ConfirmNewPassword { get; set; }
    }
}

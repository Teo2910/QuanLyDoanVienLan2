using Microsoft.AspNetCore.Mvc;
using QLDV.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using QLDV.Models;
using Microsoft.AspNetCore.Http;

namespace QLDV.Controllers
{
    [Authorize]
    public class DocumentsController : Controller
    {
        private readonly IDocumentService _documentService;
        private readonly IUnitService _unitService;
        private readonly IFileService _fileService;
        private readonly UserManager<ApplicationUser> _userManager;

        public DocumentsController(
            IDocumentService documentService,
            IUnitService unitService,
            IFileService fileService,
            UserManager<ApplicationUser> userManager)
        {
            _documentService = documentService;
            _unitService = unitService;
            _fileService = fileService;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index(string? categoryId, string? status, string? search)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");
            
            List<Document> documents;
            if (isAdmin)
            {
                documents = await _documentService.GetAllDocumentsAsync();
            }
            else
            {
                documents = await _documentService.GetDocumentsForUnitAsync(currentUser?.UnitId ?? "");
            }

            // Filtering
            if (!string.IsNullOrEmpty(categoryId))
            {
                documents = documents.Where(d => d.CategoryId == categoryId).ToList();
            }
            if (!string.IsNullOrEmpty(search))
            {
                documents = documents.Where(d => d.Title.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            ViewBag.Categories = await _documentService.GetCategoriesAsync();
            ViewBag.IsAdmin = isAdmin;
            ViewBag.SelectedCategory = categoryId;
            ViewBag.Search = search;

            return View(documents);
        }

        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create()
        {
            ViewBag.Categories = await _documentService.GetCategoriesAsync();
            ViewBag.Units = await _unitService.GetAllUnitsAsync();
            return View();
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Document document, List<string> targetUnitIds, IFormFile? file, string? deadlineDate)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            document.SenderId = currentUser?.Id ?? "";

            if (file != null)
            {
                document.FileUrl = await _fileService.SaveFileAsync(file, "documents");
                document.FileName = file.FileName;
            }

            if (DateTime.TryParse(deadlineDate, out var deadline))
            {
                document.Deadline = new DateTimeOffset(deadline).ToUnixTimeMilliseconds();
            }

            if (targetUnitIds == null || !targetUnitIds.Any())
            {
                // If no specific units selected, send to all subordinate units
                var allUnits = await _unitService.GetAllUnitsAsync();
                targetUnitIds = allUnits.Select(u => u.Id).ToList();
            }

            await _documentService.CreateDocumentAsync(document, targetUnitIds);
            return RedirectToAction(nameof(Index));
        }

        public async Task<IActionResult> Details(string id)
        {
            var document = await _documentService.GetDocumentByIdAsync(id);
            if (document == null) return NotFound();

            var currentUser = await _userManager.GetUserAsync(User);
            var isAdmin = currentUser != null && (await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin");

            if (!isAdmin)
            {
                // Update status to 'Seen' if it was 'Sent' or 'Received'
                var distribution = document.Distributions.FirstOrDefault(dd => dd.UnitId == currentUser?.UnitId);
                if (distribution != null && (distribution.Status == "Sent" || distribution.Status == "Received"))
                {
                    await _documentService.UpdateDocumentStatusAsync(id, currentUser!.UnitId!, "Seen");
                }
            }

            ViewBag.IsAdmin = isAdmin;
            ViewBag.Stats = await _documentService.GetDocumentStatsAsync(id);
            return View(document);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateStatus(string documentId, string status, string? feedback)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (string.IsNullOrEmpty(currentUser?.UnitId)) return BadRequest();

            await _documentService.UpdateDocumentStatusAsync(documentId, currentUser.UnitId, status, feedback);
            return RedirectToAction(nameof(Details), new { id = documentId });
        }

        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(string id)
        {
            var document = await _documentService.GetDocumentByIdAsync(id);
            if (document == null) return NotFound();

            ViewBag.Categories = await _documentService.GetCategoriesAsync();
            ViewBag.Units = await _unitService.GetAllUnitsAsync();
            return View(document);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, Document document, List<string> targetUnitIds, IFormFile? file, string? deadlineDate)
        {
            // Ensure document.Id is set to the id from the route if it's not bound correctly
            if (string.IsNullOrEmpty(document.Id) || document.Id != id)
            {
                document.Id = id;
            }

            if (file != null)
            {
                document.FileUrl = await _fileService.SaveFileAsync(file, "documents");
                document.FileName = file.FileName;
            }

            if (DateTime.TryParse(deadlineDate, out var deadline))
            {
                document.Deadline = new DateTimeOffset(deadline).ToUnixTimeMilliseconds();
            }
            else if (string.IsNullOrEmpty(deadlineDate))
            {
                document.Deadline = null;
            }

            if (targetUnitIds == null || !targetUnitIds.Any())
            {
                var allUnits = await _unitService.GetAllUnitsAsync();
                targetUnitIds = allUnits.Select(u => u.Id).ToList();
            }

            await _documentService.UpdateDocumentAsync(document, targetUnitIds);
            return RedirectToAction(nameof(Details), new { id = document.Id });
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateCategory(string name, string? description)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var isAdmin = await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin";
            if (!isAdmin) return Forbid();

            if (string.IsNullOrWhiteSpace(name)) return BadRequest("Tên lĩnh vực không được để trống.");

            var category = new DocumentCategory { Name = name, Description = description };
            await _documentService.CreateCategoryAsync(category);
            return Json(new { success = true, category });
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteCategory(string id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var isAdmin = await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin";
            if (!isAdmin) return Forbid();

            await _documentService.DeleteCategoryAsync(id);
            return Json(new { success = true });
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(string id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var isAdmin = await _userManager.IsInRoleAsync(currentUser, "Admin") || currentUser.Role == "Admin";
            if (!isAdmin) return Forbid();

            await _documentService.DeleteDocumentAsync(id);
            return Ok();
        }
    }
}

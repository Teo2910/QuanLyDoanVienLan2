using Microsoft.AspNetCore.Mvc;
using QLDV.Services;
using QLDV.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace QLDV.Controllers
{
    [Authorize]
    public class AIAssistantController : Controller
    {
        private readonly IGoogleAIService _aiService;

        public AIAssistantController(IGoogleAIService aiService)
        {
            _aiService = aiService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
                var response = await _aiService.ProcessSmartCommandAsync(userId, request.Message);
                return Json(new { response = response });
            }
            catch (Exception ex)
            {
                return Json(new { response = $"Error: {ex.Message}" });
            }
        }
    }

    public class ChatRequest
    {
        public required string Message { get; set; }
    }
}

using QLDV.Models;
using Microsoft.AspNetCore.Http;

namespace QLDV.Services
{
    public interface IFileService
    {
        Task<string> SaveFileAsync(IFormFile file, string subFolder);
        bool DeleteFile(string filePath);
        string GetFileUrl(string fileName, string subFolder);
    }

    public interface IActivityService
    {
        Task<List<Activity>> GetAllActivitiesAsync();
        Task<Activity?> GetActivityByIdAsync(string id);
        Task<Activity> CreateActivityAsync(Activity activity);
        Task UpdateActivityAsync(Activity activity);
        Task DeleteActivityAsync(string id);
    }

    public interface IMemberService
    {
        Task<List<Member>> GetAllMembersAsync();
        Task<List<Member>> GetMembersByUnitAsync(string unitId);
        Task<Member?> GetMemberByIdAsync(string id);
        Task<Member> CreateMemberAsync(Member member);
        Task UpdateMemberAsync(Member member);
        Task DeleteMemberAsync(string id);
        Task<List<Member>> SearchMembersAsync(string searchTerm, string? unitId = null, string? status = null);
        Task ChangeMemberStatusAsync(string memberId, string newStatus, string? reason = null);
        Task<bool> IsCCCDExistsAsync(string cccd, string? excludeMemberId = null);
    }

    public interface IUnitService
    {
        Task<List<Unit>> GetAllUnitsAsync();
        Task<Unit?> GetUnitByIdAsync(string id);
        Task<List<Unit>> GetRootUnitsAsync();
        Task<List<Unit>> GetChildrenAsync(string parentId);
        Task<Unit> CreateUnitAsync(Unit unit);
        Task UpdateUnitAsync(Unit unit);
        Task DeleteUnitAsync(string id);
    }

    public interface IMovementService
    {
        Task<List<Movement>> GetAllMovementsAsync();
        Task<Movement?> GetMovementByIdAsync(string id);
        Task<Movement> CreateMovementAsync(Movement movement);
        Task UpdateMovementAsync(Movement movement);
        Task DeleteMovementAsync(string id);
        Task<List<MovementReport>> GetReportsByMovementAsync(string movementId);
        Task<MovementReport?> GetReportByIdAsync(string id);
        Task<MovementReport> SubmitReportAsync(MovementReport report);
        Task UpdateReportAsync(MovementReport report);
    }

    public interface IKnowledgeBaseService
    {
        Task<List<KnowledgeItem>> GetAllItemsAsync();
        Task<KnowledgeItem?> GetItemByIdAsync(string id);
        Task<List<KnowledgeItem>> SearchItemsAsync(string searchTerm);
        Task<KnowledgeItem> CreateItemAsync(KnowledgeItem item);
        Task UpdateItemAsync(KnowledgeItem item);
        Task DeleteItemAsync(string id);
    }

    public interface IStatisticsService
    {
        Task<Dictionary<string, int>> GetMemberCountByStatusAsync();
        Task<Dictionary<string, int>> GetMemberCountByGenderAsync();
        Task<Dictionary<string, int>> GetMemberCountByAchievementAsync();
        Task<Dictionary<string, int>> GetMemberCountByEthnicAsync();
        Task<int> GetTotalMembersAsync();
        Task<List<dynamic>> GetMembersByUnitAsync();
        Task<List<UnitStatisticsViewModel>> GetDetailedUnitStatisticsAsync();
        Task<int> GetTotalOutstandingCountAsync();
    }

    public interface ILogService
    {
        Task<List<SystemLog>> GetLogsAsync(int take = 100);
        Task<List<SystemLog>> GetLogsByActionAsync(string action, int take = 100);
        Task<List<SystemLog>> GetLogsByUserAsync(string userId, int take = 100);
        Task LogActivityAsync(string userId, string userName, string action, string entityType, string entityId, string details);
    }

    public interface IGoogleAIService
    {
        Task<string> GenerateResponseAsync(string prompt);
        Task<string> AnalyzeDataAsync(string data, string query);
        Task<string> ProcessSmartCommandAsync(string userId, string message);
    }

    public interface IDocumentService
    {
        // Category management
        Task<List<DocumentCategory>> GetCategoriesAsync();
        Task<DocumentCategory> CreateCategoryAsync(DocumentCategory category);
        Task DeleteCategoryAsync(string id);

        // Document management
        Task<List<Document>> GetAllDocumentsAsync();
        Task<List<Document>> GetDocumentsForUnitAsync(string unitId);
        Task<Document?> GetDocumentByIdAsync(string id);
        Task<Document> CreateDocumentAsync(Document document, List<string> targetUnitIds);
        Task UpdateDocumentStatusAsync(string documentId, string unitId, string status, string? feedback = null);
        Task DeleteDocumentAsync(string id);

        // Statistics
        Task<Dictionary<string, int>> GetDocumentStatsAsync(string documentId);
    }
}

using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;

namespace QLDV.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string Role { get; set; } = "User"; // admin, secretary, user
        public bool IsSecretary { get; set; }
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public string? UnitId { get; set; }
        public long CreatedAt { get; set; }
    }

    public class Unit
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? ParentId { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public long CreatedAt { get; set; }

        // Navigation properties
        public Unit? Parent { get; set; }
        public ICollection<Unit> Children { get; set; } = new List<Unit>();
        public ICollection<Member> Members { get; set; } = new List<Member>();
    }

    public class Member
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FullName { get; set; } = string.Empty;
        public string MemberId { get; set; } = string.Empty;
        public string? CCCD { get; set; }
        public string DOB { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty; // Nam, Nữ, Khác
        public string? Ethnic { get; set; }
        public string? Religion { get; set; }
        public string? PlaceOfBirth { get; set; }
        public string? Hometown { get; set; }
        public string? PermanentAddress { get; set; }
        public string? JoinDate { get; set; }
        public string UnitId { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? AcademicYear { get; set; }
        public string? ProfessionalLevel { get; set; }
        public string? Position { get; set; }
        public string AchievementLevel { get; set; } = "Chưa xếp loại"; // Xuất sắc, Khá, Trung bình, Chưa xếp loại
        public string Status { get; set; } = "Đang sinh hoạt"; // Đang sinh hoạt, Đã chuyển sinh hoạt, Đã trưởng thành, Bị kỷ luật
        public bool IsOutstanding { get; set; }
        public long CreatedAt { get; set; }

        // Navigation properties
        public Unit? Unit { get; set; }
        public ICollection<StatusChange> StatusHistory { get; set; } = new List<StatusChange>();
    }

    public class StatusChange
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string MemberId { get; set; } = string.Empty;
        public string OldStatus { get; set; } = string.Empty;
        public string NewStatus { get; set; } = string.Empty;
        public long Date { get; set; }
        public string? Reason { get; set; }

        // Navigation properties
        public Member? Member { get; set; }
    }

    public class Activity
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng nhập tiêu đề hoạt động")]
        public string Title { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn ngày tổ chức")]
        public string Date { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng nhập địa điểm")]
        public string Location { get; set; } = string.Empty;
        public string? Description { get; set; }
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn phân loại hoạt động")]
        public string Type { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? ImagesJson { get; set; }
        public string? UnitId { get; set; }
        public long CreatedAt { get; set; }
    }

    public class Movement
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng nhập tiêu đề phong trào")]
        public string Title { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Description { get; set; }
        public string? TargetUnit { get; set; }
        public string Status { get; set; } = "Active"; // Active, Completed, Cancelled
        public string? AttachmentsJson { get; set; } // JSON stored as string
        public string? ParticipatingUnitIdsJson { get; set; } // JSON stored as string
        public string CreatorId { get; set; } = string.Empty;
        public long CreatedAt { get; set; }

        // Navigation properties
        public ICollection<MovementReport> Reports { get; set; } = new List<MovementReport>();
    }

    public class MovementReport
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string MovementId { get; set; } = string.Empty;
        public string UnitId { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? AttachmentsJson { get; set; } // JSON stored as string
        public long SubmittedAt { get; set; }
        public int SubmissionCount { get; set; }

        // Navigation properties
        public Movement? Movement { get; set; }
        public Unit? Unit { get; set; }
    }

    public class KnowledgeItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? Category { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long UpdatedAt { get; set; }
    }

    public class SystemLog
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public long Timestamp { get; set; }
    }

    public class UserProfile
    {
        public string Uid { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // admin, secretary
        public bool IsSecretary { get; set; }
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Phone { get; set; }
        public string? UnitId { get; set; }
    }

    public class UnitStatisticsViewModel
    {
        public string UnitName { get; set; } = string.Empty;
        public int Total { get; set; }
        public int Male { get; set; }
        public int Female { get; set; }
        public int Kinh { get; set; }
        public int OtherEthnic { get; set; }
        public int HasReligion { get; set; }
        public int NoReligion { get; set; }
        public int Active { get; set; }
        public int Transferred { get; set; }
        public int Graduated { get; set; }
        public int Excellent { get; set; }
        public int Good { get; set; }
        public int Average { get; set; }
        public int Outstanding { get; set; }
    }

    public class Attachment
    {
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    public class ChatMessage
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ThreadId { get; set; } = string.Empty;
        public string SenderId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string SenderRole { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public long CreatedAt { get; set; }
    }

    public class ChatThread
    {
        public string ThreadId { get; set; } = string.Empty;
        public long LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
    }

    /* --- DOCUMENT MANAGEMENT MODELS --- */

    public class DocumentCategory
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public long CreatedAt { get; set; }
    }

    public class Document
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public string CategoryId { get; set; } = string.Empty;
        public string SenderId { get; set; } = string.Empty;
        public long CreatedAt { get; set; }
        public long? Deadline { get; set; }
        
        // Navigation properties
        public DocumentCategory? Category { get; set; }
        public ApplicationUser? Sender { get; set; }
        public ICollection<DocumentDistribution> Distributions { get; set; } = new List<DocumentDistribution>();
    }

    public class DocumentDistribution
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string DocumentId { get; set; } = string.Empty;
        public string UnitId { get; set; } = string.Empty;
        
        // Status: Sent, Received, Seen, Processed
        public string Status { get; set; } = "Sent"; 
        public long? ReceivedAt { get; set; }
        public long? SeenAt { get; set; }
        public long? ProcessedAt { get; set; }
        public string? Feedback { get; set; }
        
        // Navigation properties
        public Document? Document { get; set; }
        public Unit? Unit { get; set; }
    }

    public class Initiative
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng nhập tên sáng kiến/ý tưởng")]
        public string Name { get; set; } = string.Empty;
        
        public string? AuthorId { get; set; }
        public string? CoAuthors { get; set; }
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn đơn vị")]
        public string UnitId { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn tình trạng triển khai")]
        public string Status { get; set; } = "Ý tưởng"; // Ý tưởng, Đang triển khai, Đã áp dụng
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn lĩnh vực")]
        public string Field { get; set; } = "Khác"; // Học tập, Nghiên cứu khoa học, Hoạt động Đoàn, Chuyên môn, Khác
        
        public long CreatedAt { get; set; }

        // Navigation properties
        public Member? Author { get; set; }
        public Unit? Unit { get; set; }
    }

    public class Award
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn loại đối tượng khen thưởng")]
        public string TargetType { get; set; } = "Cá nhân"; // Cá nhân, Đơn vị
        
        public string? MemberId { get; set; }
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn đơn vị")]
        public string UnitId { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng nhập nội dung khen thưởng")]
        public string Content { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng nhập hình thức khen thưởng")]
        public string Form { get; set; } = string.Empty; // Bằng khen, Giấy khen, Danh hiệu,...
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng chọn thời gian khen thưởng")]
        public string Date { get; set; } = string.Empty; // yyyy-MM-dd
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Vui lòng nhập cấp khen thưởng")]
        public string Level { get; set; } = string.Empty; // Cấp Trung ương, Cấp Tỉnh, Cấp Huyện/Trường, Cấp Cơ sở
        
        public long CreatedAt { get; set; }

        // Navigation properties
        public Member? Member { get; set; }
        public Unit? Unit { get; set; }
    }
}

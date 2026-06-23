using Microsoft.EntityFrameworkCore;
using QLDV.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace QLDV.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Unit> Units { get; set; }
        public DbSet<Member> Members { get; set; }
        public DbSet<StatusChange> StatusChanges { get; set; }
        public DbSet<Activity> Activities { get; set; }
        public DbSet<Movement> Movements { get; set; }
        public DbSet<MovementReport> MovementReports { get; set; }
        public DbSet<KnowledgeItem> KnowledgeItems { get; set; }
        public DbSet<SystemLog> SystemLogs { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<Document> Documents { get; set; }
        public DbSet<DocumentCategory> DocumentCategories { get; set; }
        public DbSet<DocumentDistribution> DocumentDistributions { get; set; }
        public DbSet<Initiative> Initiatives { get; set; }
        public DbSet<Award> Awards { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Document configuration
            modelBuilder.Entity<Document>()
                .HasKey(d => d.Id);
            
            modelBuilder.Entity<Document>()
                .HasOne(d => d.Category)
                .WithMany()
                .HasForeignKey(d => d.CategoryId);
            
            modelBuilder.Entity<Document>()
                .HasOne(d => d.Sender)
                .WithMany()
                .HasForeignKey(d => d.SenderId);

            // DocumentCategory configuration
            modelBuilder.Entity<DocumentCategory>()
                .HasKey(c => c.Id);

            // DocumentDistribution configuration
            modelBuilder.Entity<DocumentDistribution>()
                .HasKey(dd => dd.Id);

            modelBuilder.Entity<DocumentDistribution>()
                .HasOne(dd => dd.Document)
                .WithMany(d => d.Distributions)
                .HasForeignKey(dd => dd.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DocumentDistribution>()
                .HasOne(dd => dd.Unit)
                .WithMany()
                .HasForeignKey(dd => dd.UnitId)
                .OnDelete(DeleteBehavior.Cascade);

            // ChatMessage configuration
            modelBuilder.Entity<ChatMessage>()
                .HasKey(c => c.Id);

            modelBuilder.Entity<ChatMessage>()
                .HasIndex(c => c.ThreadId);

            modelBuilder.Entity<ChatMessage>()
                .HasIndex(c => c.CreatedAt);

            // Unit configuration
            modelBuilder.Entity<Unit>()
                .HasKey(u => u.Id);

            modelBuilder.Entity<Unit>()
                .HasMany(u => u.Members)
                .WithOne(m => m.Unit)
                .HasForeignKey(m => m.UnitId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Unit>()
                .HasMany(u => u.Children)
                .WithOne(u => u.Parent)
                .HasForeignKey(u => u.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Member configuration
            modelBuilder.Entity<Member>()
                .HasKey(m => m.Id);

            modelBuilder.Entity<Member>()
                .HasMany(m => m.StatusHistory)
                .WithOne(s => s.Member)
                .HasForeignKey(s => s.MemberId)
                .OnDelete(DeleteBehavior.Cascade);

            // StatusChange configuration
            modelBuilder.Entity<StatusChange>()
                .HasKey(s => s.Id);

            // Activity configuration
            modelBuilder.Entity<Activity>()
                .HasKey(a => a.Id);

            // Movement configuration
            modelBuilder.Entity<Movement>()
                .HasKey(m => m.Id);

            modelBuilder.Entity<Movement>()
                .HasMany(m => m.Reports)
                .WithOne(r => r.Movement)
                .HasForeignKey(r => r.MovementId)
                .OnDelete(DeleteBehavior.Cascade);

            // MovementReport configuration
            modelBuilder.Entity<MovementReport>()
                .HasKey(r => r.Id);

            modelBuilder.Entity<MovementReport>()
                .HasOne(r => r.Unit)
                .WithMany()
                .HasForeignKey(r => r.UnitId)
                .OnDelete(DeleteBehavior.Restrict);

            // KnowledgeItem configuration
            modelBuilder.Entity<KnowledgeItem>()
                .HasKey(k => k.Id);

            // SystemLog configuration
            modelBuilder.Entity<SystemLog>()
                .HasKey(l => l.Id);

            // Add indexes for common queries
            modelBuilder.Entity<Member>()
                .HasIndex(m => m.UnitId);

            modelBuilder.Entity<Member>()
                .HasIndex(m => m.Status);

            modelBuilder.Entity<Member>()
                .HasIndex(m => m.CCCD)
                .IsUnique()
                .HasFilter("[CCCD] IS NOT NULL");

            modelBuilder.Entity<Movement>()
                .HasIndex(m => m.CreatorId);

            modelBuilder.Entity<MovementReport>()
                .HasIndex(r => r.MovementId);

            modelBuilder.Entity<MovementReport>()
                .HasIndex(r => r.UnitId);

            modelBuilder.Entity<SystemLog>()
                .HasIndex(l => l.Timestamp);

            modelBuilder.Entity<SystemLog>()
                .HasIndex(l => l.UserId);

            // Initiative configuration
            modelBuilder.Entity<Initiative>()
                .HasKey(i => i.Id);
            modelBuilder.Entity<Initiative>()
                .HasOne(i => i.Author)
                .WithMany()
                .HasForeignKey(i => i.AuthorId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Initiative>()
                .HasOne(i => i.Unit)
                .WithMany()
                .HasForeignKey(i => i.UnitId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Initiative>()
                .HasIndex(i => i.UnitId);
            modelBuilder.Entity<Initiative>()
                .HasIndex(i => i.Field);

            // Award configuration
            modelBuilder.Entity<Award>()
                .HasKey(a => a.Id);
            modelBuilder.Entity<Award>()
                .HasOne(a => a.Member)
                .WithMany()
                .HasForeignKey(a => a.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Award>()
                .HasOne(a => a.Unit)
                .WithMany()
                .HasForeignKey(a => a.UnitId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Award>()
                .HasIndex(a => a.UnitId);
            modelBuilder.Entity<Award>()
                .HasIndex(a => a.MemberId);
        }
    }
}

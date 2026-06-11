using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLDV.Migrations
{
    /// <inheritdoc />
    public partial class AddAttachmentToKnowledgeItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Members_Units_UnitId",
                table: "Members");

            migrationBuilder.AddColumn<string>(
                name: "AttachmentName",
                table: "KnowledgeItems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrl",
                table: "KnowledgeItems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Members_Units_UnitId",
                table: "Members",
                column: "UnitId",
                principalTable: "Units",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Members_Units_UnitId",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "AttachmentName",
                table: "KnowledgeItems");

            migrationBuilder.DropColumn(
                name: "AttachmentUrl",
                table: "KnowledgeItems");

            migrationBuilder.AddForeignKey(
                name: "FK_Members_Units_UnitId",
                table: "Members",
                column: "UnitId",
                principalTable: "Units",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}

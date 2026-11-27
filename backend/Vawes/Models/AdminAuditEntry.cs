namespace Vawes.Models;

public sealed class AdminAuditEntry
{
    public int Id { get; set; }
    public string ActorEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime CreatedAt { get; set; }
}

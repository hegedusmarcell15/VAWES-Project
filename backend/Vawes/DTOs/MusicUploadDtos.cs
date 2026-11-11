using System.ComponentModel.DataAnnotations;

namespace Vawes.DTOs;

public sealed class UpdateSongRequest
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required, StringLength(150, MinimumLength = 1)]
    public string Artist { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Album { get; set; }

    [StringLength(100)]
    public string? Genre { get; set; }
}

public sealed record MusicUploadResponse(SongResponse Song, string MetadataSource);

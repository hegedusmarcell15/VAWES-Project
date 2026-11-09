using System.Text.Json.Serialization;

namespace Vawes.DTOs;

public sealed record PageResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public sealed record SongResponse(
    string Id,
    string Title,
    string Album,
    string Artist,
    [property: JsonPropertyName("artist_id")] string ArtistId,
    [property: JsonPropertyName("album_id")] string? AlbumId,
    [property: JsonPropertyName("duration_sec")] int DurationSec,
    [property: JsonPropertyName("cover_url")] string? CoverUrl,
    string? Playlist,
    [property: JsonPropertyName("file_path")] string FilePath);

public sealed record AlbumSummaryResponse(
    string Id,
    string Title,
    [property: JsonPropertyName("duration_sec")] int DurationSec,
    [property: JsonPropertyName("cover_url")] string? CoverUrl);

public sealed record ArtistResponse(
    string Id,
    string Name,
    string? Bio,
    [property: JsonPropertyName("cover_url")] string? CoverUrl,
    IReadOnlyList<AlbumSummaryResponse> Albums);

public sealed record AlbumResponse(
    string Id,
    string Title,
    string Artist,
    [property: JsonPropertyName("artist_id")] string ArtistId,
    [property: JsonPropertyName("cover_url")] string? CoverUrl,
    [property: JsonPropertyName("duration_sec")] int DurationSec,
    int Tracks);

public sealed record PlaylistResponse(
    string Id,
    string Name,
    string Color,
    int Tracks,
    int Minutes,
    string Type,
    int Recent,
    [property: JsonPropertyName("cover_url")] string? CoverUrl,
    [property: JsonPropertyName("song_ids")] IReadOnlyList<string> SongIds);

using Vawes.DTOs;
using Vawes.Models;

namespace Vawes.Controllers;

internal static class CatalogPaging
{
    public static (int Page, int PageSize) Normalize(int page, int pageSize) =>
        (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));

    public static SongResponse MapSong(Song song) => new(
        song.Slug ?? song.Id.ToString(),
        song.Title,
        song.Album?.Title ?? string.Empty,
        song.Artist.Name,
        song.Artist.Slug ?? song.Artist.Id.ToString(),
        song.Album?.Slug,
        song.DurationSec,
        song.Album?.CoverUrl ?? song.Artist.CoverUrl,
        song.Playlists.OrderBy(playlist => playlist.Id)
            .Select(playlist => playlist.Slug ?? playlist.Id.ToString())
            .FirstOrDefault(),
        song.FilePath);
}

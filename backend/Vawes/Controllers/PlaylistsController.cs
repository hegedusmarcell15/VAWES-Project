using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.DTOs;
using Vawes.Models;

namespace Vawes.Controllers;

[ApiController]
[Route("api/playlists")]
public sealed class PlaylistsController(VaweContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageResult<PlaylistResponse>>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var playlists = context.Playlists.AsNoTracking()
            .Include(playlist => playlist.Songs)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            playlists = playlists.Where(playlist => playlist.Name.Contains(search));

        var total = await playlists.CountAsync(cancellationToken);
        var items = await playlists.OrderBy(playlist => playlist.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return Ok(new PageResult<PlaylistResponse>(items.Select(MapPlaylist).ToArray(), page, pageSize, total));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PlaylistResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var playlist = await context.Playlists.AsNoTracking()
            .Include(item => item.Songs)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (playlist is null) return NotFound();
        return Ok(MapPlaylist(playlist));
    }

    private static PlaylistResponse MapPlaylist(Playlist playlist) => new(
        playlist.Slug ?? playlist.Id.ToString(),
        playlist.Name,
        playlist.Color,
        playlist.Tracks,
        playlist.Minutes,
        playlist.Type,
        playlist.Recent,
        playlist.CoverUrl,
        playlist.Songs.OrderBy(song => song.Id)
            .Select(song => song.Slug ?? song.Id.ToString())
            .ToArray());
}

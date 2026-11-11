using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
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
            .Where(playlist => playlist.Type != "mine")
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            playlists = playlists.Where(playlist => playlist.Name.Contains(search));

        var total = await playlists.CountAsync(cancellationToken);
        var items = await playlists.OrderBy(playlist => playlist.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return Ok(new PageResult<PlaylistResponse>(items.Select(item => MapPlaylist(item)).ToArray(), page, pageSize, total));
    }

    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> Mine(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var playlists = await context.Playlists.AsNoTracking()
            .Include(playlist => playlist.Songs)
            .Where(playlist => playlist.UserId == userId && playlist.Type == "mine")
            .OrderBy(playlist => playlist.Id)
            .ToListAsync(cancellationToken);
        var result = new List<PlaylistResponse>(playlists.Count);
        foreach (var playlist in playlists)
        {
            var orderedSongIds = await context.PlaylistSongs.AsNoTracking()
                .Where(link => link.PlaylistId == playlist.Id)
                .OrderBy(link => link.Position)
                .ThenBy(link => link.SongId)
                .Select(link => link.Song.Slug ?? link.SongId.ToString())
                .ToArrayAsync(cancellationToken);
            result.Add(MapPlaylist(playlist, orderedSongIds));
        }
        return Ok(result);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<PlaylistResponse>> Create(
        [FromBody] CreatePlaylistRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var playlist = new Playlist
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Slug = $"mine-{Guid.NewGuid():N}",
            Color = "violet",
            Type = "mine",
            Recent = 0,
            Tracks = 0,
            Minutes = 0,
        };
        context.Playlists.Add(playlist);
        await context.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = playlist.Slug }, MapPlaylist(playlist));
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<PlaylistResponse>> UpdateMine(
        string id,
        [FromBody] UpdatePlaylistRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var playlist = await FindOwnedPlaylist(id, userId, cancellationToken);
        if (playlist is null) return NotFound();
        var requestedSongIds = request.SongIds.Distinct(StringComparer.Ordinal).ToArray();
        var numericSongIds = requestedSongIds
            .Select(songId => int.TryParse(songId, out var numericId) ? numericId : -1)
            .Where(songId => songId > 0)
            .ToArray();
        var songs = await context.Songs.Where(song =>
                numericSongIds.Contains(song.Id) ||
                (song.Slug != null && requestedSongIds.Contains(song.Slug)))
            .ToListAsync(cancellationToken);
        var songsByPublicId = songs.ToDictionary(
            song => song.Slug ?? song.Id.ToString(),
            StringComparer.Ordinal);
        foreach (var song in songs.Where(song => numericSongIds.Contains(song.Id)))
            songsByPublicId.TryAdd(song.Id.ToString(), song);
        if (requestedSongIds.Any(songId => !songsByPublicId.ContainsKey(songId)))
            return BadRequest(new ProblemDetails { Title = "One or more selected songs do not exist." });

        playlist.Name = request.Name.Trim();
        playlist.Songs.Clear();
        var orderedSongs = requestedSongIds.Select(songId => songsByPublicId[songId]).ToArray();
        foreach (var song in orderedSongs) playlist.Songs.Add(song);
        playlist.Tracks = orderedSongs.Length;
        playlist.Minutes = (int)Math.Round(orderedSongs.Sum(song => song.DurationSec) / 60d);
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        var links = await context.PlaylistSongs
            .Where(link => link.PlaylistId == playlist.Id)
            .ToListAsync(cancellationToken);
        var positionBySongId = orderedSongs
            .Select((song, position) => (song.Id, position))
            .ToDictionary(item => item.Id, item => item.position);
        foreach (var link in links)
            link.Position = positionBySongId[link.SongId];
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(MapPlaylist(playlist, orderedSongs.Select(song => song.Slug ?? song.Id.ToString()).ToArray()));
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteMine(string id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var playlist = await FindOwnedPlaylist(id, userId, cancellationToken);
        if (playlist is null) return NotFound();
        context.Playlists.Remove(playlist);
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PlaylistResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var playlist = await context.Playlists.AsNoTracking()
            .Include(item => item.Songs)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (playlist?.Type == "mine" &&
            (!TryGetUserId(out var userId) || playlist.UserId != userId))
            return NotFound();
        if (playlist is null) return NotFound();
        if (playlist.Type == "mine")
        {
            var orderedSongIds = await context.PlaylistSongs.AsNoTracking()
                .Where(link => link.PlaylistId == playlist.Id)
                .OrderBy(link => link.Position)
                .ThenBy(link => link.SongId)
                .Select(link => link.Song.Slug ?? link.SongId.ToString())
                .ToArrayAsync(cancellationToken);
            return Ok(MapPlaylist(playlist, orderedSongIds));
        }
        return Ok(MapPlaylist(playlist));
    }

    private async Task<Playlist?> FindOwnedPlaylist(string id, int userId, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        return await context.Playlists.Include(playlist => playlist.Songs)
            .FirstOrDefaultAsync(playlist =>
                playlist.UserId == userId &&
                playlist.Type == "mine" &&
                (playlist.Slug == id || (numericId.HasValue && playlist.Id == numericId.Value)),
                cancellationToken);
    }

    private bool TryGetUserId(out int userId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static PlaylistResponse MapPlaylist(Playlist playlist, IReadOnlyList<string>? orderedSongIds = null) => new(
        playlist.Slug ?? playlist.Id.ToString(),
        playlist.Name,
        playlist.Color,
        playlist.Tracks,
        playlist.Minutes,
        playlist.Type,
        playlist.Recent,
        playlist.CoverUrl,
        orderedSongIds ?? playlist.Songs.OrderBy(song => song.Id)
            .Select(song => song.Slug ?? song.Id.ToString())
            .ToArray());
}

public sealed class CreatePlaylistRequest
{
    [Required, StringLength(150, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}

public sealed class UpdatePlaylistRequest
{
    [Required, StringLength(150, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public IReadOnlyList<string> SongIds { get; set; } = Array.Empty<string>();
}

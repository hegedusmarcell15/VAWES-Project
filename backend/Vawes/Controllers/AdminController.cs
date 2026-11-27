using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.DTOs;
using Vawes.Models;
using Vawes.Security;
using Vawes.Services;

namespace Vawes.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = AdminEmailAllowlist.PolicyName)]
public sealed class AdminController(
    VaweContext context,
    AdminEmailAllowlist adminEmailAllowlist,
    MusicStorage musicStorage,
    DeezerArtworkLookup artworkLookup,
    IConfiguration configuration) : ControllerBase
{
    private static readonly Regex InvalidSlugCharacters = new("[^a-z0-9]+", RegexOptions.Compiled);
    private const int AuditDetailLength = 500;

    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken cancellationToken)
    {
        var users = await context.Users.AsNoTracking()
            .OrderBy(user => user.Id)
            .ToListAsync(cancellationToken);

        return Ok(users.Select(MapUser));
    }

    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> UserById(int id, CancellationToken cancellationToken)
    {
        var user = await context.Users.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        return Ok(MapUser(user));
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(
        int id,
        [FromBody] AdminUserUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var user = await context.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        if (request.IsAdmin == adminEmailAllowlist.IsAllowed(user))
            return Ok(MapUser(user));

        if (!request.IsAdmin && string.Equals(user.Email, ActorEmail, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "You cannot remove your own administrator access." });

        user.IsAdmin = request.IsAdmin;
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync(
            request.IsAdmin ? "user.promote" : "user.demote",
            user.Email,
            user.Username,
            cancellationToken);

        return Ok(MapUser(user));
    }

    [HttpPost("users/{id:int}/reset-password")]
    public async Task<IActionResult> IssuePasswordReset(
        int id,
        CancellationToken cancellationToken)
    {
        var user = await context.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        var existing = await context.PasswordResetTokens
            .Where(token => token.UserId == user.Id)
            .ToListAsync(cancellationToken);
        context.PasswordResetTokens.RemoveRange(existing);

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var tokenHash = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();
        var expiresAt = DateTime.UtcNow.AddMinutes(30);
        context.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
        });
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("user.reset-password", user.Email, null, cancellationToken);

        var resetUrl = configuration["Frontend:PasswordResetUrl"];
        var link = string.IsNullOrWhiteSpace(resetUrl)
            ? null
            : $"{resetUrl}?token={Uri.EscapeDataString(rawToken)}";

        return Ok(new { token = rawToken, expiresAt, link });
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id, CancellationToken cancellationToken)
    {
        var user = await context.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        if (string.Equals(user.Email, ActorEmail, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "You cannot delete your own account." });

        var email = user.Email;
        context.Users.Remove(user);
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("user.delete", email, user.Username, cancellationToken);

        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        var songs = await context.Songs.AsNoTracking().ToListAsync(cancellationToken);
        var playable = songs.Count(song => HasAudio(song.FilePath));

        return Ok(new
        {
            tracks = songs.Count,
            playableTracks = playable,
            missingAudio = songs.Count - playable,
            albums = await context.Albums.CountAsync(cancellationToken),
            artists = await context.Artists.CountAsync(cancellationToken),
            users = await context.Users.CountAsync(cancellationToken),
            playlists = await context.Playlists.CountAsync(cancellationToken),
            pendingResets = await context.PasswordResetTokens
                .CountAsync(token => token.ExpiresAt > DateTime.UtcNow, cancellationToken),
            auditEntries = await context.AdminAuditLog.CountAsync(cancellationToken),
        });
    }

    [HttpGet("health")]
    public async Task<IActionResult> Health(CancellationToken cancellationToken)
    {
        var databaseConnected = await context.Database.CanConnectAsync(cancellationToken);
        return Ok(new
        {
            databaseConnected,
            smtpConfigured = !string.IsNullOrWhiteSpace(configuration["Email:SmtpHost"]),
            resetUrlConfigured = !string.IsNullOrWhiteSpace(configuration["Frontend:PasswordResetUrl"]),
            storageReady = Directory.Exists(musicStorage.RootPath),
            allowedAdmins = adminEmailAllowlist.AllowedEmailCount,
            apiDocsEnabled = true,
        });
    }

    [HttpGet("songs")]
    public async Task<IActionResult> Songs(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var songs = context.Songs.AsNoTracking()
            .Include(song => song.Artist)
            .Include(song => song.Album)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            songs = songs.Where(song => song.Title.Contains(search) ||
                                        song.Artist.Name.Contains(search) ||
                                        (song.Album != null && song.Album.Title.Contains(search)));
        }

        var total = await songs.CountAsync(cancellationToken);
        var items = await songs.OrderByDescending(song => song.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PageResult<AdminSongResponse>(items.Select(song => new AdminSongResponse(
            song.Slug ?? song.Id.ToString(),
            song.Title,
            song.Artist.Name,
            song.Album?.Title ?? string.Empty,
            song.Genre,
            song.DurationSec,
            song.FilePath,
            HasAudio(song.FilePath),
            song.UploadedAt)).ToArray(), page, pageSize, total));
    }

    [HttpPut("songs/{id}")]
    public async Task<IActionResult> UpdateSong(
        string id,
        [FromBody] AdminSongUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var song = await FindSong(id, cancellationToken);
        if (song is null) return NotFound();

        var title = request.Title?.Trim() ?? string.Empty;
        var artistName = request.Artist?.Trim() ?? string.Empty;
        var albumTitle = request.Album?.Trim();
        var genre = request.Genre?.Trim();
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(artistName))
            return BadRequest(new ProblemDetails { Title = "A title and artist are required." });
        if (title.Length > 200 || artistName.Length > 150 ||
            albumTitle?.Length > 200 || genre?.Length > 100)
            return BadRequest(new ProblemDetails { Title = "One or more fields are too long." });

        var artist = await FindOrCreateArtist(artistName, cancellationToken);
        var album = await FindOrCreateAlbum(albumTitle, artist, cancellationToken);
        int? albumId = album?.Id;
        var duplicate = await context.Songs.AnyAsync(item =>
            item.Id != song.Id &&
            item.ArtistId == artist.Id &&
            item.Title == title &&
            item.AlbumId == albumId, cancellationToken);
        if (duplicate)
            return Conflict(new ProblemDetails { Title = "This song is already in the catalog." });

        song.Title = title;
        song.Artist = artist;
        song.Album = album;
        song.Genre = string.IsNullOrWhiteSpace(genre) ? null : genre;
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("song.update", song.Slug ?? song.Id.ToString(), title, cancellationToken);

        return Ok(new { id = song.Slug ?? song.Id.ToString(), message = "Song updated." });
    }

    [HttpDelete("songs/{id}")]
    public async Task<IActionResult> DeleteSong(string id, CancellationToken cancellationToken)
    {
        var song = await FindSong(id, cancellationToken);
        if (song is null) return NotFound();

        var uploadedFile = musicStorage.TryResolveUploadedPath(song.FilePath, out var filePath)
            ? filePath
            : null;
        var label = song.Slug ?? song.Id.ToString();
        context.Songs.Remove(song);
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("song.delete", label, song.Title, cancellationToken);

        if (uploadedFile is not null)
        {
            try
            {
                System.IO.File.Delete(uploadedFile);
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                return Problem(
                    title: "The song was removed, but its audio file could not be deleted.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        }

        return NoContent();
    }

    [HttpGet("albums")]
    public async Task<IActionResult> Albums(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var albums = context.Albums.AsNoTracking()
            .Include(album => album.Artist)
            .Include(album => album.Songs)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            albums = albums.Where(album => album.Title.Contains(search) ||
                                           album.Artist.Name.Contains(search));
        }

        var total = await albums.CountAsync(cancellationToken);
        var items = await albums.OrderBy(album => album.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PageResult<AdminAlbumResponse>(items.Select(album => new AdminAlbumResponse(
            album.Slug ?? album.Id.ToString(),
            album.Title,
            album.Artist.Name,
            album.CoverUrl,
            album.ReleaseYear,
            album.Songs.Count,
            album.Songs.Sum(song => song.DurationSec))).ToArray(), page, pageSize, total));
    }

    [HttpPut("albums/{id}")]
    public async Task<IActionResult> UpdateAlbum(
        string id,
        [FromBody] AdminAlbumUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var album = await FindAlbum(id, cancellationToken);
        if (album is null) return NotFound();

        var title = request.Title?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title) || title.Length > 200)
            return BadRequest(new ProblemDetails { Title = "Enter an album title of up to 200 characters." });
        if (!IsValidHttpUrl(request.CoverUrl))
            return BadRequest(new ProblemDetails { Title = "Enter a valid HTTP(S) cover image URL." });
        if (request.ReleaseYear is < 1900 or > 2100)
            return BadRequest(new ProblemDetails { Title = "Enter a valid release year." });

        album.Title = title;
        album.CoverUrl = string.IsNullOrWhiteSpace(request.CoverUrl) ? null : request.CoverUrl.Trim();
        album.ReleaseYear = (short?)request.ReleaseYear;
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("album.update", album.Slug ?? album.Id.ToString(), title, cancellationToken);

        return Ok(new { id = album.Slug ?? album.Id.ToString(), message = "Album updated." });
    }

    [HttpPost("albums/{id}/artwork")]
    public async Task<IActionResult> RefreshAlbumArtwork(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var album = await context.Albums.Include(item => item.Artist)
            .FirstOrDefaultAsync(item => item.Slug == id ||
                (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (album is null) return NotFound();

        var coverUrl = await artworkLookup.FindAlbumCoverAsync(
            album.Title, album.Artist.Name, cancellationToken);
        if (string.IsNullOrWhiteSpace(coverUrl))
            return NotFound(new ProblemDetails { Title = "No artwork was found for this album." });

        album.CoverUrl = coverUrl;
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("album.artwork", album.Slug ?? album.Id.ToString(), coverUrl, cancellationToken);
        return Ok(new { coverUrl });
    }

    [HttpPost("artists/{id}/artwork")]
    public async Task<IActionResult> RefreshArtistArtwork(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var artist = await context.Artists.Include(item => item.Albums)
            .FirstOrDefaultAsync(item => item.Slug == id ||
                (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (artist is null) return NotFound();

        var albumTitle = artist.Albums.OrderBy(album => album.Id).FirstOrDefault()?.Title ?? artist.Name;
        var coverUrl = await artworkLookup.FindAlbumCoverAsync(albumTitle, artist.Name, cancellationToken);
        if (string.IsNullOrWhiteSpace(coverUrl))
            return NotFound(new ProblemDetails { Title = "No artwork was found for this artist." });

        artist.CoverUrl = coverUrl;
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("artist.artwork", artist.Slug ?? artist.Id.ToString(), coverUrl, cancellationToken);
        return Ok(new { coverUrl });
    }

    [HttpGet("playlists")]
    public async Task<IActionResult> Playlists(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var playlists = context.Playlists.AsNoTracking()
            .Include(playlist => playlist.User)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            playlists = playlists.Where(playlist => playlist.Name.Contains(search) ||
                                                   playlist.User.Username.Contains(search));

        var total = await playlists.CountAsync(cancellationToken);
        var items = await playlists.OrderByDescending(playlist => playlist.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PageResult<AdminPlaylistResponse>(items.Select(playlist =>
            new AdminPlaylistResponse(
                playlist.Slug ?? playlist.Id.ToString(),
                playlist.Name,
                playlist.User.Username,
                playlist.Color,
                playlist.Tracks,
                playlist.Minutes,
                playlist.Type,
                playlist.CoverUrl)).ToArray(), page, pageSize, total));
    }

    [HttpDelete("playlists/{id}")]
    public async Task<IActionResult> DeletePlaylist(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var playlist = await context.Playlists
            .FirstOrDefaultAsync(item => item.Slug == id ||
                (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (playlist is null) return NotFound();

        var label = playlist.Slug ?? playlist.Id.ToString();
        context.Playlists.Remove(playlist);
        await context.SaveChangesAsync(cancellationToken);
        await LogAsync("playlist.delete", label, playlist.Name, cancellationToken);
        return NoContent();
    }

    [HttpGet("audit")]
    public async Task<IActionResult> Audit(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var total = await context.AdminAuditLog.CountAsync(cancellationToken);
        var entries = await context.AdminAuditLog.AsNoTracking()
            .OrderByDescending(entry => entry.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PageResult<AdminAuditResponse>(entries.Select(entry => new AdminAuditResponse(
            entry.Id,
            entry.ActorEmail,
            entry.Action,
            entry.Target,
            entry.Detail,
            entry.CreatedAt)).ToArray(), page, pageSize, total));
    }

    private object MapUser(User user) => new
    {
        user.Id,
        user.Username,
        user.Email,
        isAdmin = adminEmailAllowlist.IsAllowed(user),
        user.CreatedAt,
        user.LastLoginAt,
    };

    private string ActorEmail =>
        User.FindFirst(ClaimTypes.Email)?.Value ??
        User.Identity?.Name ??
        "unknown";

    private bool HasAudio(string? filePath) =>
        musicStorage.TryResolveUploadedPath(filePath, out var fullPath) && System.IO.File.Exists(fullPath);

    private async Task LogAsync(
        string action,
        string target,
        string? detail,
        CancellationToken cancellationToken)
    {
        context.AdminAuditLog.Add(new AdminAuditEntry
        {
            ActorEmail = ActorEmail,
            Action = action,
            Target = target.Length <= 200 ? target : target[..200],
            Detail = detail is null
                ? null
                : detail.Length <= AuditDetailLength ? detail : detail[..AuditDetailLength],
            CreatedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task<Song?> FindSong(string id, CancellationToken cancellationToken)
    {
        var numericId = int.TryParse(id, out var parsedId) ? parsedId : (int?)null;
        return await context.Songs
            .Include(song => song.Artist)
            .Include(song => song.Album)
            .FirstOrDefaultAsync(song =>
                song.Slug == id || (numericId.HasValue && song.Id == numericId.Value), cancellationToken);
    }

    private async Task<Album?> FindAlbum(string id, CancellationToken cancellationToken)
    {
        var numericId = int.TryParse(id, out var parsedId) ? parsedId : (int?)null;
        return await context.Albums
            .FirstOrDefaultAsync(album =>
                album.Slug == id || (numericId.HasValue && album.Id == numericId.Value), cancellationToken);
    }

    private async Task<Artist> FindOrCreateArtist(string name, CancellationToken cancellationToken)
    {
        var artist = await context.Artists.FirstOrDefaultAsync(
            item => item.Name == name, cancellationToken);
        if (artist is not null) return artist;

        artist = new Artist
        {
            Name = name,
            Slug = await UniqueArtistSlug(name, cancellationToken),
            CreatedAt = DateTime.UtcNow,
        };
        context.Artists.Add(artist);
        await context.SaveChangesAsync(cancellationToken);
        return artist;
    }

    private async Task<Album?> FindOrCreateAlbum(
        string? title,
        Artist artist,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;

        var album = await context.Albums.FirstOrDefaultAsync(
            item => item.ArtistId == artist.Id && item.Title == title, cancellationToken);
        if (album is not null) return album;

        album = new Album
        {
            Title = title,
            Artist = artist,
            Slug = await UniqueAlbumSlug(title, artist.Id, cancellationToken),
            CreatedAt = DateTime.UtcNow,
        };
        context.Albums.Add(album);
        await context.SaveChangesAsync(cancellationToken);
        return album;
    }

    private async Task<string> UniqueArtistSlug(string name, CancellationToken cancellationToken)
    {
        var root = Slugify(name);
        var candidate = root;
        var suffix = 2;
        while (await context.Artists.AnyAsync(item => item.Slug == candidate, cancellationToken))
            candidate = $"{root}-{suffix++}";
        return candidate;
    }

    private async Task<string> UniqueAlbumSlug(
        string title,
        int artistId,
        CancellationToken cancellationToken)
    {
        var root = Slugify($"{artistId}-{title}");
        var candidate = root;
        var suffix = 2;
        while (await context.Albums.AnyAsync(item => item.Slug == candidate, cancellationToken))
            candidate = $"{root}-{suffix++}";
        return candidate;
    }

    private static bool IsValidHttpUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        return Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static string Slugify(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var ascii = new string(normalized.Where(character =>
                System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character) !=
                System.Globalization.UnicodeCategory.NonSpacingMark)
            .ToArray()).Normalize(NormalizationForm.FormC).ToLowerInvariant();
        var slug = InvalidSlugCharacters.Replace(ascii, "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "item" : slug;
    }

    public sealed record AdminSongResponse(
        string Id,
        string Title,
        string Artist,
        string Album,
        string? Genre,
        int DurationSec,
        string FilePath,
        bool HasAudio,
        DateTime UploadedAt);

    public sealed record AdminAlbumResponse(
        string Id,
        string Title,
        string Artist,
        string? CoverUrl,
        int? ReleaseYear,
        int Tracks,
        int DurationSec);

    public sealed record AdminPlaylistResponse(
        string Id,
        string Name,
        string Owner,
        string Color,
        int Tracks,
        int Minutes,
        string Type,
        string? CoverUrl);

    public sealed record AdminAuditResponse(
        int Id,
        string ActorEmail,
        string Action,
        string Target,
        string? Detail,
        DateTime CreatedAt);

    public sealed class AdminUserUpdateRequest
    {
        public bool IsAdmin { get; set; }
    }

    public sealed class AdminSongUpdateRequest
    {
        public string? Title { get; set; }
        public string? Artist { get; set; }
        public string? Album { get; set; }
        public string? Genre { get; set; }
    }

    public sealed class AdminAlbumUpdateRequest
    {
        public string? Title { get; set; }
        public string? CoverUrl { get; set; }
        public int? ReleaseYear { get; set; }
    }
}

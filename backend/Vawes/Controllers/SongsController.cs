using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.RegularExpressions;
using Vawes.DTOs;
using Vawes.Models;
using Vawes.Security;
using Vawes.Services;

namespace Vawes.Controllers;

[ApiController]
[Route("api/songs")]
public sealed class SongsController(
    VaweContext context,
    MusicStorage musicStorage,
    DeezerArtworkLookup artworkLookup,
    ILogger<SongsController> logger) : ControllerBase
{
    private const long MaximumUploadBytes = 50 * 1024 * 1024;
    private const long MaximumRequestBytes = MaximumUploadBytes + 1024 * 1024;
    private static readonly Regex InvalidSlugCharacters = new("[^a-z0-9]+", RegexOptions.Compiled);

    [HttpGet]
    public async Task<ActionResult<PageResult<SongResponse>>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var songs = context.Songs.AsNoTracking()
            .Include(song => song.Artist)
            .Include(song => song.Album)
            .Include(song => song.Playlists)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            songs = songs.Where(song => song.Title.Contains(search) ||
                                        song.Artist.Name.Contains(search) ||
                                        (song.Album != null && song.Album.Title.Contains(search)));
        }

        var total = await songs.CountAsync(cancellationToken);
        var items = await songs.OrderBy(song => song.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return Ok(new PageResult<SongResponse>(items.Select(CatalogPaging.MapSong).ToArray(), page, pageSize, total));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SongResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var song = await context.Songs.AsNoTracking()
            .Include(item => item.Artist)
            .Include(item => item.Album)
            .Include(item => item.Playlists)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (song is null) return NotFound();
        return Ok(CatalogPaging.MapSong(song));
    }

    [HttpGet("{id}/stream")]
    public async Task<IActionResult> Stream(string id, CancellationToken cancellationToken)
    {
        var song = await FindSong(id, cancellationToken);
        if (song is null) return NotFound();
        if (!musicStorage.TryResolveUploadedPath(song.FilePath, out var filePath) || !System.IO.File.Exists(filePath))
            return NotFound();

        return PhysicalFile(filePath, "audio/mpeg", enableRangeProcessing: true);
    }

    [HttpPost]
    [ServiceFilter(typeof(AdminApiKeyFilter))]
    [RequestSizeLimit(MaximumRequestBytes)]
    public async Task<ActionResult<MusicUploadResponse>> Upload(
        IFormFile? file,
        [FromForm] string? title,
        [FromForm] string? artist,
        [FromForm] string? album,
        [FromForm] string? genre,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new ProblemDetails { Title = "Choose a non-empty MP3 file." });
        if (file.Length > MaximumUploadBytes)
            return StatusCode(StatusCodes.Status413PayloadTooLarge,
                new ProblemDetails { Title = "The maximum MP3 file size is 50 MB." });
        if (title?.Length > 200 || artist?.Length > 150 || album?.Length > 200 || genre?.Length > 100)
            return BadRequest(new ProblemDetails { Title = "One or more metadata fields exceed the allowed length." });
        if (!string.Equals(Path.GetExtension(file.FileName), ".mp3", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "Only MP3 files are supported." });
        if (!string.IsNullOrEmpty(file.ContentType) &&
            !new[] { "audio/mpeg", "audio/mp3", "application/octet-stream" }
                .Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "The uploaded file must be an MP3." });

        var fullPath = musicStorage.CreateUploadPath();
        var savedToDisk = false;
        var songPersisted = false;
        try
        {
            await using (var destination = new FileStream(
                fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            {
                savedToDisk = true;
                await file.CopyToAsync(destination, cancellationToken);
            }

            string metadataTitle;
            string metadataArtist;
            string? metadataAlbum;
            string? metadataGenre;
            int durationSeconds;
            try
            {
                using var audioFile = TagLib.File.Create(fullPath);
                metadataTitle = audioFile.Tag.Title?.Trim() ?? string.Empty;
                metadataArtist = audioFile.Tag.Performers?.FirstOrDefault()?.Trim() ?? string.Empty;
                metadataAlbum = audioFile.Tag.Album?.Trim();
                metadataGenre = audioFile.Tag.Genres?.FirstOrDefault()?.Trim();
                durationSeconds = (int)Math.Round(audioFile.Properties.Duration.TotalSeconds);
            }
            catch (Exception exception) when (exception is TagLib.CorruptFileException or TagLib.UnsupportedFormatException)
            {
                return BadRequest(new ProblemDetails { Title = "The uploaded MP3 file is invalid or damaged." });
            }

            var cleanTitle = FirstNonEmpty(title, metadataTitle);
            var cleanArtist = FirstNonEmpty(artist, metadataArtist);
            var cleanAlbum = FirstNonEmpty(album, metadataAlbum);
            var cleanGenre = FirstNonEmpty(genre, metadataGenre);
            if (string.IsNullOrWhiteSpace(cleanTitle) || string.IsNullOrWhiteSpace(cleanArtist))
                return BadRequest(new ProblemDetails
                {
                    Title = "The MP3 must contain a title and artist, or provide both in the form.",
                });
            if (durationSeconds <= 0)
                return BadRequest(new ProblemDetails { Title = "The MP3 duration could not be read." });
            if (cleanTitle.Length > 200 || cleanArtist.Length > 150 ||
                cleanAlbum?.Length > 200 || cleanGenre?.Length > 100)
                return BadRequest(new ProblemDetails { Title = "MP3 metadata exceeds the allowed field lengths." });

            var artistEntity = await FindOrCreateArtist(cleanArtist, cancellationToken);
            var albumEntity = await FindOrCreateAlbum(cleanAlbum, artistEntity, cancellationToken);
            int? albumId = albumEntity?.Id;
            var duplicate = await context.Songs.AnyAsync(song =>
                song.ArtistId == artistEntity.Id &&
                song.Title == cleanTitle &&
                song.AlbumId == albumId, cancellationToken);
            if (duplicate)
                return Conflict(new ProblemDetails { Title = "This song is already in the catalog." });

            if (albumEntity is not null && string.IsNullOrWhiteSpace(albumEntity.CoverUrl))
            {
                var coverUrl = await artworkLookup.FindAlbumCoverAsync(
                    albumEntity.Title, artistEntity.Name, cancellationToken);
                if (!string.IsNullOrWhiteSpace(coverUrl))
                {
                    albumEntity.CoverUrl = coverUrl;
                    await context.SaveChangesAsync(cancellationToken);
                }
            }

            var song = new Song
            {
                Title = cleanTitle,
                Slug = await CreateUniqueSongSlug(cleanTitle, artistEntity.Name, cancellationToken),
                Artist = artistEntity,
                Album = albumEntity,
                DurationSec = durationSeconds,
                Genre = cleanGenre,
                FilePath = musicStorage.GetDatabasePath(fullPath),
                UploadedAt = DateTime.UtcNow,
            };
            context.Songs.Add(song);
            await context.SaveChangesAsync(cancellationToken);
            songPersisted = true;
            var responseSong = await GetSongResponse(song.Id, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = song.Slug },
                new MusicUploadResponse(responseSong,
                    string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(artist) ? "tags" : "form"));
        }
        finally
        {
            if (savedToDisk && !songPersisted)
                System.IO.File.Delete(fullPath);
        }
    }

    [HttpPut("{id}")]
    [ServiceFilter(typeof(AdminApiKeyFilter))]
    public async Task<ActionResult<SongResponse>> Update(
        string id,
        [FromBody] UpdateSongRequest request,
        CancellationToken cancellationToken)
    {
        var numericId = int.TryParse(id, out var parsedId) ? parsedId : (int?)null;
        var song = await context.Songs.FirstOrDefaultAsync(
            item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value),
            cancellationToken);
        if (song is null) return NotFound();

        var title = request.Title.Trim();
        var artistName = request.Artist.Trim();
        var albumTitle = request.Album?.Trim();
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(artistName))
            return BadRequest(new ProblemDetails { Title = "A title and artist are required." });

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
        song.Genre = string.IsNullOrWhiteSpace(request.Genre) ? null : request.Genre.Trim();
        await context.SaveChangesAsync(cancellationToken);
        return Ok(await GetSongResponse(song.Id, cancellationToken));
    }

    [HttpDelete("{id}")]
    [ServiceFilter(typeof(AdminApiKeyFilter))]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var song = await FindSong(id, cancellationToken);
        if (song is null) return NotFound();
        var uploadedFile = musicStorage.TryResolveUploadedPath(song.FilePath, out var filePath)
            ? filePath
            : null;

        context.Songs.Remove(song);
        await context.SaveChangesAsync(cancellationToken);
        if (uploadedFile is not null)
        {
            try
            {
                System.IO.File.Delete(uploadedFile);
            }
            catch (IOException exception)
            {
                logger.LogError(exception, "Could not remove uploaded audio for song {SongId}.", song.Id);
                return Problem(
                    title: "The song was removed, but its audio file could not be deleted.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }
            catch (UnauthorizedAccessException exception)
            {
                logger.LogError(exception, "Could not remove uploaded audio for song {SongId}.", song.Id);
                return Problem(
                    title: "The song was removed, but its audio file could not be deleted.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        }

        return NoContent();
    }

    private async Task<Song?> FindSong(string id, CancellationToken cancellationToken)
    {
        var numericId = int.TryParse(id, out var parsedId) ? parsedId : (int?)null;
        return await context.Songs
            .Include(item => item.Artist)
            .Include(item => item.Album)
            .Include(item => item.Playlists)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value),
                cancellationToken);
    }

    private async Task<SongResponse> GetSongResponse(int id, CancellationToken cancellationToken)
    {
        var song = await context.Songs.AsNoTracking()
            .Include(item => item.Artist)
            .Include(item => item.Album)
            .Include(item => item.Playlists)
            .SingleAsync(item => item.Id == id, cancellationToken);
        return CatalogPaging.MapSong(song);
    }

    private async Task<Artist> FindOrCreateArtist(string name, CancellationToken cancellationToken)
    {
        var normalizedName = name.Trim();
        var artist = await context.Artists.FirstOrDefaultAsync(
            item => item.Name == normalizedName, cancellationToken);
        if (artist is not null) return artist;

        artist = new Artist
        {
            Name = normalizedName,
            Slug = await CreateUniqueArtistSlug(normalizedName, cancellationToken),
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
        var normalizedTitle = title.Trim();
        var album = await context.Albums.FirstOrDefaultAsync(
            item => item.ArtistId == artist.Id && item.Title == normalizedTitle, cancellationToken);
        if (album is not null) return album;

        album = new Album
        {
            Title = normalizedTitle,
            ArtistId = artist.Id,
            Slug = await CreateUniqueAlbumSlug(normalizedTitle, artist.Id, cancellationToken),
            CreatedAt = DateTime.UtcNow,
        };
        context.Albums.Add(album);
        await context.SaveChangesAsync(cancellationToken);
        return album;
    }

    private async Task<string> CreateUniqueSongSlug(
        string title,
        string artist,
        CancellationToken cancellationToken)
    {
        var root = Slugify($"{artist}-{title}");
        var candidate = root[..Math.Min(root.Length, 255)].TrimEnd('-');
        var suffix = 2;
        while (await context.Songs.AnyAsync(item => item.Slug == candidate, cancellationToken))
        {
            var suffixText = $"-{suffix++}";
            var prefix = root[..Math.Min(root.Length, 255 - suffixText.Length)].TrimEnd('-');
            candidate = $"{prefix}{suffixText}";
        }
        return candidate;
    }

    private async Task<string> CreateUniqueArtistSlug(string name, CancellationToken cancellationToken)
    {
        var root = Slugify(name);
        var candidate = root;
        var suffix = 2;
        while (await context.Artists.AnyAsync(item => item.Slug == candidate, cancellationToken))
            candidate = $"{root}-{suffix++}";
        return candidate;
    }

    private async Task<string> CreateUniqueAlbumSlug(
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

    private static string FirstNonEmpty(string? preferred, string? fallback) =>
        string.IsNullOrWhiteSpace(preferred) ? fallback?.Trim() ?? string.Empty : preferred.Trim();

    private static string Slugify(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var ascii = new string(normalized.Where(character =>
                System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character) !=
                System.Globalization.UnicodeCategory.NonSpacingMark)
            .ToArray()).Normalize(NormalizationForm.FormC).ToLowerInvariant();
        var slug = InvalidSlugCharacters.Replace(ascii, "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "song" : slug;
    }
}

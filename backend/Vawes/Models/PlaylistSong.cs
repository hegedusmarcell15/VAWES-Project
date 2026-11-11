namespace Vawes.Models;

public sealed class PlaylistSong
{
    public int PlaylistId { get; set; }

    public int SongId { get; set; }

    public int Position { get; set; }

    public Playlist Playlist { get; set; } = null!;

    public Song Song { get; set; } = null!;
}

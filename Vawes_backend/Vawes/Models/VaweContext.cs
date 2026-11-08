using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Vawes.Models;

public partial class VaweContext : DbContext
{
    public VaweContext(DbContextOptions<VaweContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Album> Albums { get; set; }

    public virtual DbSet<Artist> Artists { get; set; }

    public virtual DbSet<Playlist> Playlists { get; set; }

    public virtual DbSet<Song> Songs { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Album>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("albums");

            entity.HasIndex(e => e.ArtistId, "artist_id");

            entity.Property(e => e.Id)
                .HasColumnType("int(11)")
                .HasColumnName("id");
            entity.Property(e => e.ArtistId)
                .HasColumnType("int(11)")
                .HasColumnName("artist_id");
            entity.Property(e => e.CoverUrl)
                .HasMaxLength(500)
                .HasDefaultValueSql("'NULL'")
                .HasColumnName("cover_url");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("'current_timestamp()'")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ReleaseYear)
                .HasDefaultValueSql("'NULL'")
                .HasColumnType("smallint(6)")
                .HasColumnName("release_year");
            entity.Property(e => e.Title)
                .HasMaxLength(200)
                .HasColumnName("title");

            entity.HasOne(d => d.Artist).WithMany(p => p.Albums)
                .HasForeignKey(d => d.ArtistId)
                .HasConstraintName("albums_ibfk_1");
        });

        modelBuilder.Entity<Artist>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("artists");

            entity.Property(e => e.Id)
                .HasColumnType("int(11)")
                .HasColumnName("id");
            entity.Property(e => e.Bio)
                .HasDefaultValueSql("'NULL'")
                .HasColumnType("text")
                .HasColumnName("bio");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("'current_timestamp()'")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Name)
                .HasMaxLength(150)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Playlist>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("playlists");

            entity.HasIndex(e => e.UserId, "user_id");

            entity.Property(e => e.Id)
                .HasColumnType("int(11)")
                .HasColumnName("id");
            entity.Property(e => e.Name)
                .HasMaxLength(150)
                .HasColumnName("name");
            entity.Property(e => e.UserId)
                .HasColumnType("int(11)")
                .HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Playlists)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("playlists_ibfk_1");

            entity.HasMany(d => d.Songs).WithMany(p => p.Playlists)
                .UsingEntity<Dictionary<string, object>>(
                    "PlaylistSong",
                    r => r.HasOne<Song>().WithMany()
                        .HasForeignKey("SongId")
                        .HasConstraintName("playlist_songs_ibfk_2"),
                    l => l.HasOne<Playlist>().WithMany()
                        .HasForeignKey("PlaylistId")
                        .HasConstraintName("playlist_songs_ibfk_1"),
                    j =>
                    {
                        j.HasKey("PlaylistId", "SongId").HasName("PRIMARY");
                        j.ToTable("playlist_songs");
                        j.HasIndex(new[] { "SongId" }, "song_id");
                        j.IndexerProperty<int>("PlaylistId")
                            .HasColumnType("int(11)")
                            .HasColumnName("playlist_id");
                        j.IndexerProperty<int>("SongId")
                            .HasColumnType("int(11)")
                            .HasColumnName("song_id");
                    });
        });

        modelBuilder.Entity<Song>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("songs");

            entity.HasIndex(e => e.AlbumId, "album_id");

            entity.HasIndex(e => e.ArtistId, "artist_id");

            entity.Property(e => e.Id)
                .HasColumnType("int(11)")
                .HasColumnName("id");
            entity.Property(e => e.AlbumId)
                .HasDefaultValueSql("'NULL'")
                .HasColumnType("int(11)")
                .HasColumnName("album_id");
            entity.Property(e => e.ArtistId)
                .HasColumnType("int(11)")
                .HasColumnName("artist_id");
            entity.Property(e => e.DurationSec)
                .HasColumnType("int(11)")
                .HasColumnName("duration_sec");
            entity.Property(e => e.FilePath)
                .HasMaxLength(500)
                .HasColumnName("file_path");
            entity.Property(e => e.Genre)
                .HasMaxLength(100)
                .HasDefaultValueSql("'NULL'")
                .HasColumnName("genre");
            entity.Property(e => e.Title)
                .HasMaxLength(200)
                .HasColumnName("title");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("'current_timestamp()'")
                .HasColumnType("datetime")
                .HasColumnName("uploaded_at");

            entity.HasOne(d => d.Album).WithMany(p => p.Songs)
                .HasForeignKey(d => d.AlbumId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("songs_ibfk_2");

            entity.HasOne(d => d.Artist).WithMany(p => p.Songs)
                .HasForeignKey(d => d.ArtistId)
                .HasConstraintName("songs_ibfk_1");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "email").IsUnique();

            entity.HasIndex(e => e.Username, "username").IsUnique();

            entity.Property(e => e.Id)
                .HasColumnType("int(11)")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("'current_timestamp()'")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.IsAdmin).HasColumnName("is_admin");
            entity.Property(e => e.LastLoginAt)
                .HasDefaultValueSql("'NULL'")
                .HasColumnType("datetime")
                .HasColumnName("last_login_at");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");

            entity.HasMany(d => d.Songs).WithMany(p => p.Users)
                .UsingEntity<Dictionary<string, object>>(
                    "Favorite",
                    r => r.HasOne<Song>().WithMany()
                        .HasForeignKey("SongId")
                        .HasConstraintName("favorites_ibfk_2"),
                    l => l.HasOne<User>().WithMany()
                        .HasForeignKey("UserId")
                        .HasConstraintName("favorites_ibfk_1"),
                    j =>
                    {
                        j.HasKey("UserId", "SongId").HasName("PRIMARY");
                        j.ToTable("favorites");
                        j.HasIndex(new[] { "SongId" }, "song_id");
                        j.IndexerProperty<int>("UserId")
                            .HasColumnType("int(11)")
                            .HasColumnName("user_id");
                        j.IndexerProperty<int>("SongId")
                            .HasColumnType("int(11)")
                            .HasColumnName("song_id");
                    });
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

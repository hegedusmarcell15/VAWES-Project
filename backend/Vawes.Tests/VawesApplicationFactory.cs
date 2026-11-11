using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Vawes.Models;

namespace Vawes.Tests;

internal sealed class VawesApplicationFactory : WebApplicationFactory<Vawes.Program>
{
    public const string AdminKey = "vawes-test-upload-key";
    private readonly string databaseName = $"vawes-tests-{Guid.NewGuid():N}";
    private readonly string storageDirectory = Path.Combine(
        Path.GetTempPath(), "vawes-tests", Guid.NewGuid().ToString("N"));

    public string StorageDirectory => storageDirectory;

    static VawesApplicationFactory()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Mysql", "server=localhost;database=vawes_tests");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Upload:ApiKey"] = AdminKey,
                ["MusicStorage:Directory"] = storageDirectory,
                ["Admin:AllowedEmails"] = "fxadamg@vawes.app,fxmarcellg@vawes.app,ricsikicsikonyhaja@vawes.app",
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<VaweContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<IDbContextOptionsConfiguration<VaweContext>>();
            services.RemoveAll<VaweContext>();
            services.AddDbContext<VaweContext>(options =>
                options.UseInMemoryDatabase(databaseName)
                    .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(storageDirectory))
            Directory.Delete(storageDirectory, recursive: true);
    }
}

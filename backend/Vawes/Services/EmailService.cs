using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Vawes.Services;

public sealed class EmailService(IConfiguration configuration)
{
    public async Task SendPasswordResetEmailAsync(
        string recipient,
        string resetUrl,
        CancellationToken cancellationToken)
    {
        var smtpHost = configuration["Email:SmtpHost"]
            ?? throw new InvalidOperationException("SMTP host is not configured.");

        var smtpPort = configuration.GetValue<int>("Email:SmtpPort");
        var username = configuration["Email:Username"]
            ?? throw new InvalidOperationException("SMTP username is not configured.");

        var password = configuration["Email:Password"]
            ?? throw new InvalidOperationException("SMTP password is not configured.");

        var fromAddress = configuration["Email:FromAddress"]
            ?? throw new InvalidOperationException("Email sender is not configured.");

        var fromName = configuration["Email:FromName"] ?? "VAWES";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(MailboxAddress.Parse(recipient));
        message.Subject = "Reset your VAWES password";

        message.Body = new TextPart("plain")
        {
            Text = $"""
                Hello,

                We received a request to reset your VAWES password.

                Use the link below to choose a new password:

                {resetUrl}

                This link expires in 30 minutes and can only be used once.

                If you did not request this, you can safely ignore this email.

                VAWES Team
                """
        };

        var useStartTls = configuration.GetValue<bool?>("Email:UseStartTls") ?? true;
        var socketOptions = useStartTls
            ? SecureSocketOptions.StartTls
            : SecureSocketOptions.Auto;

        using var client = new SmtpClient();

        await client.ConnectAsync(
            smtpHost,
            smtpPort,
            socketOptions,
            cancellationToken);

        await client.AuthenticateAsync(
            username,
            password,
            cancellationToken);

        await client.SendAsync(
            FormatOptions.Default,
            message,
            new MailboxAddress(fromName, fromAddress),
            new[] { MailboxAddress.Parse(recipient) },
            cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
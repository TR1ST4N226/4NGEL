using System;
using System.Diagnostics;
using System.IO;

internal static class PortableLauncher
{
    private static int Main()
    {
        string installDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string batchPath = Path.Combine(installDirectory, "4ngel.bat");
        if (!File.Exists(batchPath))
        {
            Console.Error.WriteLine("4ngel.bat was not found beside this launcher.");
            return 1;
        }

        string commandPrompt = Environment.GetEnvironmentVariable("ComSpec");
        if (String.IsNullOrEmpty(commandPrompt))
        {
            commandPrompt = Path.Combine(Environment.SystemDirectory, "cmd.exe");
        }

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = commandPrompt,
            Arguments = "/d /c call \"" + batchPath + "\"",
            WorkingDirectory = installDirectory,
            UseShellExecute = false,
            CreateNoWindow = false
        };

        using (Process process = Process.Start(startInfo))
        {
            if (process == null)
            {
                Console.Error.WriteLine("Could not start 4ngel.bat.");
                return 1;
            }

            process.WaitForExit();
            return process.ExitCode;
        }
    }
}

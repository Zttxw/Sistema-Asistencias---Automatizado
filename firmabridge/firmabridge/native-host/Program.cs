using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading;

/// <summary>
/// FirmaBridge Native Messaging Host
/// 
/// Recibe mensajes JSON del protocolo Chrome Native Messaging (4-byte length prefix + UTF-8 JSON),
/// valida el puerto, y lanza el Firmador de FirmaPeru vía ClickOnce (rundll32 + dfshim) o mediante
/// la ejecución directa del JAR con la JRE OpenJDK detectada dinámicamente.
/// </summary>
namespace FirmaBridge
{
    class Program
    {
        private const string ClickOnceUrlBase =
            "https://resources.firmaperu.gob.pe/app/clickonce/clienteweb/FirmaPeruWeb.application";

        private const string Version = "1.2.0";

        static void Main(string[] args)
        {
            try
            {
                string inputJson = ReadNativeMessage();

                if (string.IsNullOrEmpty(inputJson))
                {
                    SendResponse("error", "No se recibió mensaje");
                    return;
                }

                string action = ExtractJsonString(inputJson, "action");

                if (action == "ping")
                {
                    SendRaw("{\"status\":\"pong\",\"version\":\"" + Version + "\"}");
                    return;
                }

                if (action != "launch")
                {
                    SendResponse("error", "Acción no reconocida: " + (action ?? "null"));
                    return;
                }

                int port = ExtractJsonInt(inputJson, "port");

                if (port < 1024 || port > 65535)
                {
                    SendResponse("error", "Puerto fuera de rango válido (1024-65535): " + port);
                    return;
                }

                // Detección dinámica del directorio JRE de OpenJDK de PCM en la PC cliente
                string pcmJreBin = GetPcmJreBin();
                string pcmJreHome = !string.IsNullOrEmpty(pcmJreBin) ? Path.GetDirectoryName(pcmJreBin) : null;

                if (!string.IsNullOrEmpty(pcmJreBin) && Directory.Exists(pcmJreBin))
                {
                    string sysPath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Process) ?? "";
                    if (!sysPath.Contains(pcmJreBin))
                    {
                        Environment.SetEnvironmentVariable("PATH", pcmJreBin + ";" + sysPath, EnvironmentVariableTarget.Process);
                    }
                    if (!string.IsNullOrEmpty(pcmJreHome))
                    {
                        Environment.SetEnvironmentVariable("JAVA_HOME", pcmJreHome, EnvironmentVariableTarget.Process);
                    }
                }

                // 1. Verificar si el puerto ya está escuchando
                if (IsPortListening(port, 300))
                {
                    SendResponse("launched", null);
                    return;
                }

                string javaExePath = (!string.IsNullOrEmpty(pcmJreBin) && File.Exists(Path.Combine(pcmJreBin, "java.exe")))
                    ? Path.Combine(pcmJreBin, "java.exe")
                    : "java.exe";

                string jarPath = FindFirmadorJar();

                // 2. Si se encuentra el JAR de Firma Perú localmente, lanzarlo directamente con Java
                if (!string.IsNullOrEmpty(jarPath) && File.Exists(jarPath))
                {
                    try
                    {
                        string workDir = Path.GetDirectoryName(jarPath);
                        string libJar = Path.Combine(workDir, "firmaperulib-1.1.0.jar");
                        string javaArgs = File.Exists(libJar)
                            ? "-cp \"" + jarPath + ";" + libJar + "\" pe.gob.pcm.sgtd.firmaperu.clienteweb.main.Main " + port
                            : "-jar \"" + jarPath + "\" " + port;

                        ProcessStartInfo psiJava = new ProcessStartInfo
                        {
                            FileName = javaExePath,
                            Arguments = javaArgs,
                            UseShellExecute = false,
                            CreateNoWindow = true,
                            WorkingDirectory = workDir
                        };
                        Process.Start(psiJava);
                    }
                    catch { }
                }
                else
                {
                    // Fallback a ClickOnce solo si no existe el JAR local
                    string url = ClickOnceUrlBase + "?port=" + port;
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo
                        {
                            FileName = url,
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                    }
                    catch { }
                }

                SendResponse("launched", null);
            }
            catch (Exception ex)
            {
                try
                {
                    SendResponse("error", "Excepción: " + ex.Message);
                }
                catch { }
            }
        }

        private static string GetPcmJreBin()
        {
            try
            {
                string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                string openJdkDir = Path.Combine(userProfile, @"PCM\OpenJDK");
                if (Directory.Exists(openJdkDir))
                {
                    string[] subdirs = Directory.GetDirectories(openJdkDir);
                    foreach (string d in subdirs)
                    {
                        string binPath = Path.Combine(d, "bin");
                        if (File.Exists(Path.Combine(binPath, "java.exe")))
                        {
                            return binPath;
                        }
                    }
                }

                // Fallback: verificar JAVA_HOME del sistema si ya existe
                string envJavaHome = Environment.GetEnvironmentVariable("JAVA_HOME");
                if (!string.IsNullOrEmpty(envJavaHome) && Directory.Exists(envJavaHome))
                {
                    string envBin = Path.Combine(envJavaHome, "bin");
                    if (File.Exists(Path.Combine(envBin, "java.exe")))
                    {
                        return envBin;
                    }
                }
            }
            catch { }
            return null;
        }

        private static bool IsPortListening(int port, int timeoutMs)
        {
            int elapsed = 0;
            int step = 250;
            while (elapsed < timeoutMs)
            {
                try
                {
                    using (TcpClient client = new TcpClient())
                    {
                        IAsyncResult ar = client.BeginConnect("127.0.0.1", port, null, null);
                        bool success = ar.AsyncWaitHandle.WaitOne(200);
                        if (success && client.Connected)
                        {
                            return true;
                        }
                    }
                }
                catch { }
                Thread.Sleep(step);
                elapsed += step;
            }
            return false;
        }

        private static string FindFirmadorJar()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

                // 1. Buscar en %LOCALAPPDATA%\FirmaBridge\firmaperuclienteweb.jar
                string fbJar = Path.Combine(localAppData, @"FirmaBridge\firmaperuclienteweb.jar");
                if (File.Exists(fbJar))
                {
                    return fbJar;
                }

                // 2. Buscar en %LOCALAPPDATA%\Apps\2.0
                string appsDir = Path.Combine(localAppData, @"Apps\2.0");
                if (Directory.Exists(appsDir))
                {
                    string[] files = Directory.GetFiles(appsDir, "firmaperuclienteweb.jar", SearchOption.AllDirectories);
                    if (files.Length > 0)
                    {
                        return files[0];
                    }
                }
            }
            catch { }
            return null;
        }

        static string ReadNativeMessage()
        {
            Stream stdin = Console.OpenStandardInput();
            byte[] lengthBytes = new byte[4];
            int bytesRead = stdin.Read(lengthBytes, 0, 4);
            if (bytesRead < 4) return null;

            uint length = BitConverter.ToUInt32(lengthBytes, 0);
            if (length > 1024 * 1024) return null;

            byte[] messageBytes = new byte[length];
            uint totalRead = 0;
            while (totalRead < length)
            {
                int read = stdin.Read(messageBytes, (int)totalRead, (int)(length - totalRead));
                if (read == 0) break;
                totalRead += (uint)read;
            }

            return Encoding.UTF8.GetString(messageBytes, 0, (int)totalRead);
        }

        static void SendNativeMessage(string json)
        {
            byte[] messageBytes = Encoding.UTF8.GetBytes(json);
            byte[] lengthBytes = BitConverter.GetBytes((uint)messageBytes.Length);

            Stream stdout = Console.OpenStandardOutput();
            stdout.Write(lengthBytes, 0, 4);
            stdout.Write(messageBytes, 0, messageBytes.Length);
            stdout.Flush();
        }

        static void SendResponse(string status, string message)
        {
            string json;
            if (message != null)
            {
                json = "{\"status\":\"" + EscapeJson(status) + "\",\"message\":\"" + EscapeJson(message) + "\"}";
            }
            else
            {
                json = "{\"status\":\"" + EscapeJson(status) + "\"}";
            }
            SendNativeMessage(json);
        }

        static void SendRaw(string json)
        {
            SendNativeMessage(json);
        }

        static string ExtractJsonString(string json, string key)
        {
            string searchKey = "\"" + key + "\"";
            int keyIndex = json.IndexOf(searchKey, StringComparison.Ordinal);
            if (keyIndex < 0) return null;

            int colonIndex = json.IndexOf(':', keyIndex + searchKey.Length);
            if (colonIndex < 0) return null;

            int quoteStart = json.IndexOf('"', colonIndex + 1);
            if (quoteStart < 0) return null;

            int quoteEnd = json.IndexOf('"', quoteStart + 1);
            if (quoteEnd < 0) return null;

            return json.Substring(quoteStart + 1, quoteEnd - quoteStart - 1);
        }

        static int ExtractJsonInt(string json, string key)
        {
            string searchKey = "\"" + key + "\"";
            int keyIndex = json.IndexOf(searchKey, StringComparison.Ordinal);
            if (keyIndex < 0) return -1;

            int colonIndex = json.IndexOf(':', keyIndex + searchKey.Length);
            if (colonIndex < 0) return -1;

            int start = colonIndex + 1;
            while (start < json.Length && (json[start] == ' ' || json[start] == '\t'))
                start++;

            int end = start;
            while (end < json.Length && json[end] >= '0' && json[end] <= '9')
                end++;

            if (end == start) return -1;

            string numStr = json.Substring(start, end - start);
            int result;
            if (int.TryParse(numStr, out result))
                return result;

            return -1;
        }

        static string EscapeJson(string s)
        {
            if (s == null) return "";
            return s
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
        }
    }
}

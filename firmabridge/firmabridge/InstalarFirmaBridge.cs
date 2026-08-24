using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using Microsoft.Win32;

namespace FirmaBridgeInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, "FirmaBridge");
                string extensionDir = Path.Combine(installDir, "extension");
                string hostName = "pe.gob.pcm.firmabridge";
                string extensionId = "ejljadcinpcipbfnfmllipodmnnjfncd";

                Directory.CreateDirectory(installDir);
                Directory.CreateDirectory(extensionDir);

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string sourceExe = Path.Combine(baseDir, "native-host", "FirmaBridge.exe");
                if (!File.Exists(sourceExe))
                {
                    sourceExe = Path.Combine(baseDir, "FirmaBridge.exe");
                }
                if (!File.Exists(sourceExe))
                {
                    sourceExe = @"C:\Users\jeanpier\Documents\FIRMAPERU\native-host\FirmaBridge.exe";
                }

                string sourceExt = Path.Combine(baseDir, "extension");
                if (!Directory.Exists(sourceExt))
                {
                    sourceExt = @"C:\Users\jeanpier\Documents\FIRMAPERU\extension";
                }

                // 1. Copiar FirmaBridge.exe
                if (File.Exists(sourceExe))
                {
                    File.Copy(sourceExe, Path.Combine(installDir, "FirmaBridge.exe"), true);
                }

                // 2. Copiar carpeta extension
                if (Directory.Exists(sourceExt))
                {
                    CopyDirectory(sourceExt, extensionDir);
                }

                // 3. Crear manifest NativeHost JSON
                string targetExePath = Path.Combine(installDir, "FirmaBridge.exe").Replace("\\", "\\\\");
                string manifestPath = Path.Combine(installDir, hostName + ".json");
                string manifestJson = "{\n" +
                    "  \"name\": \"" + hostName + "\",\n" +
                    "  \"description\": \"FirmaBridge - Lanzador de FirmaPeru para Chrome\",\n" +
                    "  \"path\": \"" + targetExePath + "\",\n" +
                    "  \"type\": \"stdio\",\n" +
                    "  \"allowed_origins\": [\n" +
                    "    \"chrome-extension://" + extensionId + "/\"\n" +
                    "  ]\n" +
                    "}";

                File.WriteAllText(manifestPath, manifestJson);

                // 4. Registrar en HKCU
                string regPath = @"Software\Google\Chrome\NativeMessagingHosts\" + hostName;
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(regPath))
                {
                    if (key != null)
                    {
                        key.SetValue("", manifestPath);
                    }
                }

                // 5. Abrir Chrome en chrome://extensions
                try
                {
                    Process.Start("chrome.exe", "chrome://extensions");
                }
                catch
                {
                    Process.Start("chrome://extensions");
                }

                // 6. Lanzar Formulario de Instrucciones (Ultra Minimalista)
                Application.Run(new InstallerForm(installDir, extensionDir, manifestPath, regPath));
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error durante la instalación de FirmaBridge:\n" + ex.Message, "FirmaBridge Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void CopyDirectory(string sourceDir, string destinationDir)
        {
            Directory.CreateDirectory(destinationDir);
            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string dest = Path.Combine(destinationDir, Path.GetFileName(file));
                File.Copy(file, dest, true);
            }
            foreach (string subDir in Directory.GetDirectories(sourceDir))
            {
                string destSub = Path.Combine(destinationDir, Path.GetFileName(subDir));
                CopyDirectory(subDir, destSub);
            }
        }
    }

    public class InstallerForm : Form
    {
        private string installDir;
        private string extensionDir;
        private string manifestPath;
        private string regPath;

        private Label statusLabel;

        public InstallerForm(string installDir, string extensionDir, string manifestPath, string regPath)
        {
            this.installDir = installDir;
            this.extensionDir = extensionDir;
            this.manifestPath = manifestPath;
            this.regPath = regPath;

            InitializeComponents();
        }

        private void InitializeComponents()
        {
            this.Text = "FirmaBridge — Instalación de Componentes";
            this.Size = new Size(600, 500);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.BackColor = Color.FromArgb(255, 255, 255);

            // Título Ultra Minimalista
            Label titleLabel = new Label();
            titleLabel.Text = "FirmaBridge";
            titleLabel.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            titleLabel.ForeColor = Color.FromArgb(15, 23, 42); // Slate 900
            titleLabel.Location = new Point(25, 22);
            titleLabel.Size = new Size(530, 32);
            this.Controls.Add(titleLabel);

            Label subLabel = new Label();
            subLabel.Text = "Componentes nativos registrados. Sigue los 3 pasos en Google Chrome:";
            subLabel.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            subLabel.ForeColor = Color.FromArgb(100, 116, 139); // Slate 500
            subLabel.Location = new Point(25, 56);
            subLabel.Size = new Size(530, 24);
            this.Controls.Add(subLabel);

            // Contenedor de Pasos
            GroupBox stepsGroup = new GroupBox();
            stepsGroup.Text = "Pasos finales en Chrome";
            stepsGroup.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            stepsGroup.Location = new Point(25, 88);
            stepsGroup.Size = new Size(530, 210);
            stepsGroup.ForeColor = Color.FromArgb(30, 41, 59); // Slate 800
            this.Controls.Add(stepsGroup);

            string stepText = "1. En la esquina superior derecha de Chrome, activa 'Modo de desarrollador'.\n\n" +
                              "2. Haz clic en el botón 'Cargar descomprimida' (arriba a la izquierda).\n\n" +
                              "3. Selecciona la siguiente ruta de instalación:";

            Label stepLabel = new Label();
            stepLabel.Text = stepText;
            stepLabel.Font = new Font("Segoe UI", 9.25f, FontStyle.Regular);
            stepLabel.ForeColor = Color.FromArgb(51, 65, 85);
            stepLabel.Location = new Point(16, 26);
            stepLabel.Size = new Size(500, 105);
            stepsGroup.Controls.Add(stepLabel);

            TextBox pathTextBox = new TextBox();
            pathTextBox.Text = extensionDir;
            pathTextBox.ReadOnly = true;
            pathTextBox.Font = new Font("Consolas", 8.75f, FontStyle.Regular);
            pathTextBox.BackColor = Color.FromArgb(248, 250, 252);
            pathTextBox.ForeColor = Color.FromArgb(15, 23, 42);
            pathTextBox.BorderStyle = BorderStyle.FixedSingle;
            pathTextBox.Location = new Point(16, 136);
            pathTextBox.Size = new Size(498, 23);
            stepsGroup.Controls.Add(pathTextBox);

            Button copyBtn = new Button();
            copyBtn.Text = "Copiar Ruta";
            copyBtn.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            copyBtn.Location = new Point(16, 168);
            copyBtn.Size = new Size(150, 30);
            copyBtn.BackColor = Color.FromArgb(14, 116, 144); // Cyan 700
            copyBtn.ForeColor = Color.White;
            copyBtn.FlatStyle = FlatStyle.Flat;
            copyBtn.FlatAppearance.BorderSize = 0;
            copyBtn.Cursor = Cursors.Hand;
            copyBtn.Click += (s, e) =>
            {
                Clipboard.SetText(extensionDir);
                MessageBox.Show("Ruta copiada al portapapeles. Pégala en el cuadro de diálogo de Chrome.", "FirmaBridge", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };
            stepsGroup.Controls.Add(copyBtn);

            Button openFolderBtn = new Button();
            openFolderBtn.Text = "Abrir Carpeta";
            openFolderBtn.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            openFolderBtn.Location = new Point(176, 168);
            openFolderBtn.Size = new Size(150, 30);
            openFolderBtn.BackColor = Color.FromArgb(241, 245, 249);
            openFolderBtn.ForeColor = Color.FromArgb(30, 41, 59);
            openFolderBtn.FlatStyle = FlatStyle.Flat;
            openFolderBtn.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            openFolderBtn.Cursor = Cursors.Hand;
            openFolderBtn.Click += (s, e) =>
            {
                Process.Start("explorer.exe", extensionDir);
            };
            stepsGroup.Controls.Add(openFolderBtn);

            Button openChromeBtn = new Button();
            openChromeBtn.Text = "Abrir Chrome";
            openChromeBtn.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            openChromeBtn.Location = new Point(336, 168);
            openChromeBtn.Size = new Size(178, 30);
            openChromeBtn.BackColor = Color.FromArgb(241, 245, 249);
            openChromeBtn.ForeColor = Color.FromArgb(30, 41, 59);
            openChromeBtn.FlatStyle = FlatStyle.Flat;
            openChromeBtn.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            openChromeBtn.Cursor = Cursors.Hand;
            openChromeBtn.Click += (s, e) =>
            {
                try { Process.Start("chrome.exe", "chrome://extensions"); }
                catch { Process.Start("chrome://extensions"); }
            };
            stepsGroup.Controls.Add(openChromeBtn);

            // Grupo de Verificación
            GroupBox verifyGroup = new GroupBox();
            verifyGroup.Text = "Estado del registro";
            verifyGroup.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            verifyGroup.Location = new Point(25, 308);
            verifyGroup.Size = new Size(530, 100);
            verifyGroup.ForeColor = Color.FromArgb(30, 41, 59);
            this.Controls.Add(verifyGroup);

            statusLabel = new Label();
            statusLabel.Text = "Estado: Archivos y registro HKCU configurados.";
            statusLabel.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            statusLabel.ForeColor = Color.FromArgb(16, 185, 129); // Emerald
            statusLabel.Location = new Point(16, 24);
            statusLabel.Size = new Size(498, 24);
            verifyGroup.Controls.Add(statusLabel);

            Button verifyBtn = new Button();
            verifyBtn.Text = "Verificar Registro";
            verifyBtn.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            verifyBtn.Location = new Point(16, 54);
            verifyBtn.Size = new Size(220, 32);
            verifyBtn.BackColor = Color.FromArgb(16, 185, 129); // Emerald 600
            verifyBtn.ForeColor = Color.White;
            verifyBtn.FlatStyle = FlatStyle.Flat;
            verifyBtn.FlatAppearance.BorderSize = 0;
            verifyBtn.Cursor = Cursors.Hand;
            verifyBtn.Click += (s, e) =>
            {
                bool exeExists = File.Exists(Path.Combine(installDir, "FirmaBridge.exe"));
                bool manifestExists = File.Exists(manifestPath);
                bool extExists = File.Exists(Path.Combine(extensionDir, "manifest.json"));
                bool regOk = false;

                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(regPath))
                {
                    if (key != null)
                    {
                        string val = key.GetValue("") as string;
                        if (!string.IsNullOrEmpty(val) && val == manifestPath)
                        {
                            regOk = true;
                        }
                    }
                }

                if (exeExists && manifestExists && extExists && regOk)
                {
                    statusLabel.Text = "[OK] Host nativo y extensión registrados correctamente en el sistema.";
                    statusLabel.ForeColor = Color.FromArgb(16, 185, 129);
                    MessageBox.Show("Componentes verificados exitosamente:\n- Host C#: OK\n- Manifest JSON: OK\n- Registro HKCU: OK\n- Extensión: OK\n\nRecuerda completar la carga en Chrome.", "FirmaBridge Verificación", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                else
                {
                    statusLabel.Text = "[ADVERTENCIA] No se detectó la clave de registro o archivos en %LOCALAPPDATA%\\FirmaBridge.";
                    statusLabel.ForeColor = Color.FromArgb(225, 29, 72);
                    MessageBox.Show("Atención: Falta verificar el registro o los archivos en la carpeta de instalación.", "FirmaBridge Verificación", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            };
            verifyGroup.Controls.Add(verifyBtn);

            // Botón Cierre Minimalista
            Button closeBtn = new Button();
            closeBtn.Text = "Finalizar";
            closeBtn.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            closeBtn.Location = new Point(415, 420);
            closeBtn.Size = new Size(140, 34);
            closeBtn.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            closeBtn.ForeColor = Color.White;
            closeBtn.FlatStyle = FlatStyle.Flat;
            closeBtn.FlatAppearance.BorderSize = 0;
            closeBtn.Cursor = Cursors.Hand;
            closeBtn.Click += (s, e) => { this.Close(); };
            this.Controls.Add(closeBtn);
        }
    }
}

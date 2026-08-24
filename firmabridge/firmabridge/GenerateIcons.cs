using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

namespace IconGenerator
{
    class Program
    {
        static void Main(string[] args)
        {
            string outDir = @"c:\Users\jeanpier\Documents\OTI\instaladores\firmabridge\extension\icons";
            string outDirOriginal = @"C:\Users\jeanpier\Documents\FIRMAPERU\extension\icons";

            Directory.CreateDirectory(outDir);
            if (Directory.Exists(@"C:\Users\jeanpier\Documents\FIRMAPERU\extension"))
            {
                Directory.CreateDirectory(outDirOriginal);
            }

            RenderIcon(128, Path.Combine(outDir, "icon128.png"));
            RenderIcon(48, Path.Combine(outDir, "icon48.png"));
            RenderIcon(16, Path.Combine(outDir, "icon16.png"));

            if (Directory.Exists(outDirOriginal))
            {
                RenderIcon(128, Path.Combine(outDirOriginal, "icon128.png"));
                RenderIcon(48, Path.Combine(outDirOriginal, "icon48.png"));
                RenderIcon(16, Path.Combine(outDirOriginal, "icon16.png"));
            }

            Console.WriteLine("Iconos generados exitosamente en 16x16, 48x48 y 128x128.");
        }

        static void RenderIcon(int size, string outputPath)
        {
            using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                g.Clear(Color.Transparent);

                float s = size / 128.0f;

                // 1. Fondo: Squircle (Cuadrado con bordes redondeados)
                float margin = 4 * s;
                float bgSize = size - 2 * margin;
                float cornerRadius = 26 * s;

                using (GraphicsPath path = GetRoundedRectPath(new RectangleF(margin, margin, bgSize, bgSize), cornerRadius))
                using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                    new PointF(0, 0),
                    new PointF(size, size),
                    Color.FromArgb(255, 15, 23, 42),  // 0F172A Slate oscuro
                    Color.FromArgb(255, 30, 41, 59))) // 1E293B Slate medio
                {
                    g.FillPath(bgBrush, path);
                }

                // 2. Borde sutil brillante
                using (GraphicsPath path = GetRoundedRectPath(new RectangleF(margin, margin, bgSize, bgSize), cornerRadius))
                using (Pen borderPen = new Pen(Color.FromArgb(80, 255, 255, 255), 1.5f * s))
                {
                    g.DrawPath(borderPen, path);
                }

                // 3. Nodos del Puente (Izquierda: Web/Chrome cyan, Derecha: Firmador peruano carmesí)
                float nodeRadius = 13 * s;

                // Nodo A (Izquierda - Chrome/Web)
                PointF nodeA = new PointF(36 * s, 76 * s);
                // Nodo B (Derecha - Host Nativo)
                PointF nodeB = new PointF(92 * s, 76 * s);

                // Arco de Puente (Bridge Arch)
                using (GraphicsPath bridgePath = new GraphicsPath())
                {
                    // Curva Bézier representando la estructura del puente elevándose
                    bridgePath.AddBezier(
                        nodeA,
                        new PointF(48 * s, 36 * s),
                        new PointF(80 * s, 36 * s),
                        nodeB
                    );

                    // Dibujar resplandor exterior del puente
                    using (Pen glowPen = new Pen(Color.FromArgb(60, 14, 165, 233), 14 * s))
                    {
                        glowPen.StartCap = LineCap.Round;
                        glowPen.EndCap = LineCap.Round;
                        g.DrawPath(glowPen, bridgePath);
                    }

                    // Dibujar cuerpo principal del puente (Línea de conexión fuerte)
                    using (LinearGradientBrush bridgeGradient = new LinearGradientBrush(
                        nodeA, nodeB,
                        Color.FromArgb(255, 14, 165, 233), // Sky/Cyan Blue #0EA5E9
                        Color.FromArgb(255, 225, 29, 72)))  // Carmine Red #E11948
                    using (Pen bridgePen = new Pen(bridgeGradient, 7 * s))
                    {
                        bridgePen.StartCap = LineCap.Round;
                        bridgePen.EndCap = LineCap.Round;
                        g.DrawPath(bridgePen, bridgePath);
                    }
                }

                // Tirantes verticales del puente (Bridge Cables/Pillars)
                using (Pen cablePen = new Pen(Color.FromArgb(120, 255, 255, 255), 1.8f * s))
                {
                    cablePen.DashStyle = DashStyle.Dot;
                    g.DrawLine(cablePen, 52 * s, 50 * s, 52 * s, 76 * s);
                    g.DrawLine(cablePen, 64 * s, 44 * s, 64 * s, 76 * s);
                    g.DrawLine(cablePen, 76 * s, 50 * s, 76 * s, 76 * s);
                }

                // Plataforma base horizontal del puente
                using (Pen deckPen = new Pen(Color.FromArgb(200, 241, 245, 249), 3f * s))
                {
                    deckPen.StartCap = LineCap.Round;
                    deckPen.EndCap = LineCap.Round;
                    g.DrawLine(deckPen, nodeA.X, nodeA.Y, nodeB.X, nodeB.Y);
                }

                // Dibujar Nodo A (Cyan)
                using (Brush brushA = new SolidBrush(Color.FromArgb(255, 56, 189, 248))) // Cyan #38BDF8
                using (Pen ringPenA = new Pen(Color.White, 2f * s))
                {
                    g.FillEllipse(brushA, nodeA.X - nodeRadius, nodeA.Y - nodeRadius, nodeRadius * 2, nodeRadius * 2);
                    g.DrawEllipse(ringPenA, nodeA.X - nodeRadius, nodeA.Y - nodeRadius, nodeRadius * 2, nodeRadius * 2);
                }

                // Dibujar Nodo B (Crimson Peru Red)
                using (Brush brushB = new SolidBrush(Color.FromArgb(255, 244, 63, 94))) // Rose/Crimson #F43F5E
                using (Pen ringPenB = new Pen(Color.White, 2f * s))
                {
                    g.FillEllipse(brushB, nodeB.X - nodeRadius, nodeB.Y - nodeRadius, nodeRadius * 2, nodeRadius * 2);
                    g.DrawEllipse(ringPenB, nodeB.X - nodeRadius, nodeB.Y - nodeRadius, nodeRadius * 2, nodeRadius * 2);
                }

                // Centro / Emblema de Confirmación de Conexión (Check de enlace en la cúspide del puente)
                float checkCenterX = 64 * s;
                float checkCenterY = 44 * s;
                float checkRadius = 9 * s;

                using (Brush checkBg = new SolidBrush(Color.FromArgb(255, 16, 185, 129))) // Green Emerald #10B981
                using (Pen checkRing = new Pen(Color.White, 1.5f * s))
                {
                    g.FillEllipse(checkBg, checkCenterX - checkRadius, checkCenterY - checkRadius, checkRadius * 2, checkRadius * 2);
                    g.DrawEllipse(checkRing, checkCenterX - checkRadius, checkCenterY - checkRadius, checkRadius * 2, checkRadius * 2);
                }

                // Dibujar mini check blanco en la cúspide
                if (size >= 48)
                {
                    using (Pen checkPen = new Pen(Color.White, 2f * s))
                    {
                        checkPen.StartCap = LineCap.Round;
                        checkPen.EndCap = LineCap.Round;
                        g.DrawLines(checkPen, new PointF[] {
                            new PointF(checkCenterX - 4 * s, checkCenterY),
                            new PointF(checkCenterX - 1 * s, checkCenterY + 3 * s),
                            new PointF(checkCenterX + 4 * s, checkCenterY - 3 * s)
                        });
                    }
                }

                bmp.Save(outputPath, ImageFormat.Png);
            }
        }

        static GraphicsPath GetRoundedRectPath(RectangleF rect, float radius)
        {
            GraphicsPath path = new GraphicsPath();
            float diameter = radius * 2;

            RectangleF arcRect = new RectangleF(rect.Location, new SizeF(diameter, diameter));

            // Top Left
            path.AddArc(arcRect, 180, 90);

            // Top Right
            arcRect.X = rect.Right - diameter;
            path.AddArc(arcRect, 270, 90);

            // Bottom Right
            arcRect.Y = rect.Bottom - diameter;
            path.AddArc(arcRect, 0, 90);

            // Bottom Left
            arcRect.X = rect.Left;
            path.AddArc(arcRect, 90, 90);

            path.CloseFigure();
            return path;
        }
    }
}

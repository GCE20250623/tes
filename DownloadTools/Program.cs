using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using BencodeNET.Parsing;
using BencodeNET.Torrents;

namespace DownloadTools
{
    class Program
    {
        static readonly HttpClient httpClient = new HttpClient();

        static async Task Main(string[] args)
        {
            Console.WriteLine("=== 多线程下载工具 ===");
            Console.WriteLine("1. 磁力链接下载");
            Console.WriteLine("2. 种子文件下载");
            Console.WriteLine("3. 普通文件下载");
            Console.WriteLine("4. 批量下载");
            Console.Write("请选择功能: ");

            var choice = Console.ReadLine();

            switch (choice)
            {
                case "1":
                    await MagnetDownload();
                    break;
                case "2":
                    await TorrentDownload();
                    break;
                case "3":
                    await NormalDownload();
                    break;
                case "4":
                    await BatchDownload();
                    break;
                default:
                    Console.WriteLine("无效选择");
                    break;
            }
        }

        static async Task MagnetDownload()
        {
            Console.Write("请输入磁力链接: ");
            var magnet = Console.ReadLine();

            if (string.IsNullOrWhiteSpace(magnet) || !magnet.StartsWith("magnet:?"))
            {
                Console.WriteLine("无效的磁力链接");
                return;
            }

            var magnetInfo = ParseMagnet(magnet);
            Console.WriteLine($"文件名称: {magnetInfo.Name}");
            Console.WriteLine($"Tracker数量: {magnetInfo.Trackers.Count}");
            Console.WriteLine($"InfoHash: {magnetInfo.InfoHash}");

            Console.Write("请输入保存路径: ");
            var savePath = Console.ReadLine() ?? ".";

            Console.Write("请输入线程数 (默认8): ");
            var threadsInput = Console.ReadLine();
            var threads = int.TryParse(threadsInput, out var t) ? t : 8;

            Console.WriteLine("提示: 完整的磁力下载需要DHT网络和peer连接");
            Console.WriteLine($"已记录InfoHash: {magnetInfo.InfoHash}");
        }

        static async Task TorrentDownload()
        {
            Console.Write("请输入种子文件路径: ");
            var torrentPath = Console.ReadLine();

            if (string.IsNullOrWhiteSpace(torrentPath) || !File.Exists(torrentPath))
            {
                Console.WriteLine("种子文件不存在");
                return;
            }

            Console.Write("请输入保存路径: ");
            var savePath = Console.ReadLine() ?? ".";

            Console.Write("请输入线程数 (默认8): ");
            var threadsInput = Console.ReadLine();
            var threads = int.TryParse(threadsInput, out var t) ? t : 8;

            try
            {
                var torrent = ParseTorrentFile(torrentPath);
                await DownloadWithTorrent(torrent, savePath, threads);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"种子解析错误: {ex.Message}");
            }
        }

        static async Task NormalDownload()
        {
            Console.Write("请输入下载URL: ");
            var url = Console.ReadLine();

            if (string.IsNullOrWhiteSpace(url))
            {
                Console.WriteLine("URL不能为空");
                return;
            }

            Console.Write("请输入保存路径: ");
            var savePath = Console.ReadLine() ?? ".";

            Console.Write("请输入线程数 (默认8): ");
            var threadsInput = Console.ReadLine();
            var threads = int.TryParse(threadsInput, out var t) ? t : 8;

            try
            {
                var uri = new Uri(url);
                var fileName = Path.GetFileName(uri.LocalPath);
                if (string.IsNullOrEmpty(fileName)) fileName = "download";
                await MultiThreadDownload(url, Path.Combine(savePath, fileName), threads);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"下载错误: {ex.Message}");
            }
        }

        static async Task BatchDownload()
        {
            Console.Write("请输入批量下载文件路径 (每行一个URL): ");
            var filePath = Console.ReadLine();

            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            {
                Console.WriteLine("文件不存在");
                return;
            }

            var urls = await File.ReadAllLinesAsync(filePath ?? "");
            var tasks = urls
                .Where(u => !string.IsNullOrWhiteSpace(u))
                .Select(async url =>
                {
                    try
                    {
                        var uri = new Uri(url.Trim());
                        var fileName = Path.GetFileName(uri.LocalPath);
                        Console.WriteLine($"开始下载: {fileName}");
                        await MultiThreadDownload(url.Trim(), fileName, 4);
                        Console.WriteLine($"完成: {fileName}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"下载失败 {url}: {ex.Message}");
                    }
                });

            await Task.WhenAll(tasks);
            Console.WriteLine("批量下载完成");
        }

        static MagnetInfo ParseMagnet(string magnet)
        {
            var result = new MagnetInfo();

            try
            {
                var dict = magnet.Substring("magnet:?".Length).Split('&')
                    .Select(p => p.Split('='))
                    .Where(p => p.Length == 2)
                    .ToDictionary(
                        p => p[0], 
                        p => Uri.UnescapeDataString(p[1])
                    );

                if (dict.TryGetValue("dn", out var name))
                    result.Name = name;

                if (dict.TryGetValue("xt", out var xt))
                {
                    var parts = xt.Split(':');
                    if (parts.Length >= 4 && parts[0] == "urn" && parts[1] == "btih")
                        result.InfoHash = parts[2];
                }

                foreach (var kvp in dict.Where(k => k.Key == "tr"))
                {
                    if (!result.Trackers.Contains(kvp.Value))
                        result.Trackers.Add(kvp.Value);
                }
            }
            catch { }

            return result;
        }

        static TorrentInfo ParseTorrentFile(string path)
        {
            var parser = new BencodeParser();
            using var stream = File.OpenRead(path);
            var torrent = parser.Parse<Torrent>(stream);

            return new TorrentInfo
            {
                DisplayName = torrent.DisplayName,
                Comment = torrent.Comment,
                CreatedBy = torrent.CreatedBy
            };
        }

        static async Task DownloadWithTorrent(TorrentInfo torrent, string savePath, int threads)
        {
            Console.WriteLine($"种子名称: {torrent.DisplayName}");
            Console.WriteLine($"种子注释: {torrent.Comment ?? "无"}");
            Console.WriteLine($"创建者: {torrent.CreatedBy ?? "未知"}");
            Console.WriteLine("提示: 完整的BT下载需要实现BitTorrent协议");
        }

        static async Task MultiThreadDownload(string url, string savePath, int threads)
        {
            var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            var totalBytes = response.Content.Headers.ContentLength ?? 0;
            var uri = new Uri(url);
            var fileName = Path.GetFileName(uri.LocalPath);
            
            // Handle path correctly
            string fullPath;
            if (Directory.Exists(savePath))
                fullPath = Path.Combine(savePath, string.IsNullOrEmpty(fileName) ? "download" : fileName);
            else
                fullPath = savePath;

            Console.WriteLine($"URL: {url}");
            Console.WriteLine($"总大小: {totalBytes / 1024.0 / 1024.0:F2} MB");
            Console.WriteLine($"保存到: {fullPath}");
            Console.WriteLine($"使用线程数: {threads}");

            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                Directory.CreateDirectory(directory);

            if (totalBytes <= 0 || threads <= 1)
            {
                var data = await httpClient.GetByteArrayAsync(url);
                await File.WriteAllBytesAsync(fullPath, data);
                Console.WriteLine("下载完成 (单线程模式)");
                return;
            }

            var partSize = totalBytes / threads;
            var tasks = new List<Task>();

            for (int i = 0; i < threads; i++)
            {
                var partIndex = i;
                tasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        var start = partIndex * partSize;
                        var end = partIndex == threads - 1 ? totalBytes - 1 : (partIndex + 1) * partSize - 1;

                        using var rangeClient = new HttpClient();
                        rangeClient.DefaultRequestHeaders.Range = new System.Net.Http.Headers.RangeHeaderValue(start, end);

                        var partResponse = await rangeClient.GetAsync(url);
                        var buffer = await partResponse.Content.ReadAsByteArrayAsync();

                        lock (typeof(Program))
                        {
                            using var fs = new FileStream(fullPath, FileMode.OpenOrCreate, FileAccess.Write, FileShare.Write);
                            fs.Seek(start, SeekOrigin.Begin);
                            fs.Write(buffer, 0, buffer.Length);
                            Console.WriteLine($"线程{partIndex + 1}完成 ({(buffer.Length / 1024.0 / 1024.0):F2} MB)");
                        }
                    }
                    catch (Exception ex)
                    {
                        lock (typeof(Program))
                        {
                            Console.WriteLine($"线程{partIndex + 1}失败: {ex.Message}");
                        }
                    }
                }));
            }

            await Task.WhenAll(tasks);
            Console.WriteLine("下载完成!");
        }
    }

    class MagnetInfo
    {
        public string Name { get; set; } = "未知文件";
        public string InfoHash { get; set; } = "";
        public List<string> Trackers { get; set; } = new();
    }

    class TorrentInfo
    {
        public string DisplayName { get; set; } = "";
        public string? Comment { get; set; }
        public string? CreatedBy { get; set; }
    }
}

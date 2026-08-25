# ============================================================
#  汽车零部件包装车间数字孪生 - 阿里云 OSS 一键部署脚本
#  用法:
#    1. 先在阿里云开通 OSS, 创建一个 Bucket (读写权限选"公共读")
#    2. 在 RAM 访问控制创建一个只有 OSS 权限的 AccessKey
#    3. 把下面三个变量改成你自己的值, 然后: 右键 -> 使用 PowerShell 运行
# ============================================================

$endpoint   = "oss-cn-hangzhou.aliyuncs.com"   # 改成你 Bucket 所在地域, 例如 oss-cn-shanghai
$bucket     = "your-bucket-name"                # 改成你的 Bucket 名字
$accessKey  = $env:OSS_ACCESS_KEY_ID            # 推荐用环境变量, 也可直接填字符串
$secretKey  = $env:OSS_ACCESS_KEY_SECRET

$ErrorActionPreference = "Stop"

# 自动下载 ossutil (如果没有)
$ossutil = Join-Path $PSScriptRoot "ossutil64.exe"
if (-not (Test-Path $ossutil)) {
  Write-Host "未检测到 ossutil, 正在下载..." -ForegroundColor Cyan
  $url = "https://gosspublic.alicdn.com/ossutil/v2/prolatest/windows/amd64/ossutilv2.zip"
  $zip = Join-Path $env:TEMP "ossutil.zip"
  Invoke-WebRequest $url -OutFile $zip
  Expand-Archive $zip -DestinationPath $PSScriptRoot -Force
  # v2 版本解压后文件名可能是 ossutil.exe 或 ossutil64.exe
  $found = Get-ChildItem $PSScriptRoot -Filter "ossutil*.exe" | Select-Object -First 1
  if ($found) { Rename-Item $found.FullName $ossutil -Force }
}

# 写入配置 (sts-token 留空)
& $ossutil config --endpoint $endpoint --access-key $accessKey --secret-key $secretKey

# 同步当前目录的站点文件到 OSS, 跳过脚本和压缩包本身
Write-Host "正在上传到 oss://$bucket/ ..." -ForegroundColor Cyan
& $ossutil cp "$PSScriptRoot\index.html" "oss://$bucket/index.html" --force --meta "Cache-Control:no-cache"
& $ossutil cp "$PSScriptRoot\vendor" "oss://$bucket/vendor" --recursive --force

Write-Host ""
Write-Host "上传完成! 接下来在 OSS 控制台做两步:" -ForegroundColor Green
Write-Host "  1. Bucket -> 数据管理 -> 静态页面 -> 默认首页填 index.html, 开启静态网站托管"
Write-Host "  2. 如果要绑定自己的域名, 在 传输管理 -> 域名管理 绑定 (国内域名需先备案)"
Write-Host "默认访问地址形如: http://$bucket.$endpoint/index.html"
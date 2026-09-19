<?php
/**
 * 环境检测页面
 * 上传到虚拟主机后访问：http://你的域名/check.php
 */
header('Content-Type: text/html; charset=utf-8');

$checks = [];
$allOk = true;

// 1. PHP 版本
$phpVersion = PHP_VERSION;
$phpOk = version_compare($phpVersion, '5.6.0', '>=');
$checks[] = ['PHP 版本', $phpVersion, $phpOk ? 'OK' : '需要 PHP 5.6+', $phpOk];
if (!$phpOk) $allOk = false;

// 2. 数据目录
$dataDir = __DIR__ . '/data';
$dataExists = is_dir($dataDir);
if (!$dataExists) {
    $dataExists = @mkdir($dataDir, 0755, true);
}
$dataWritable = $dataExists && is_writable($dataDir);
$checks[] = ['data 目录', $dataExists ? '存在' : '不存在', $dataWritable ? '可写入' : '不可写入（请设为 755）', $dataWritable];
if (!$dataWritable) $allOk = false;

// 3. JSON 扩展
$jsonOk = function_exists('json_encode') && function_exists('json_decode');
$checks[] = ['JSON 扩展', $jsonOk ? '已安装' : '未安装', $jsonOk ? 'OK' : '需要开启', $jsonOk];
if (!$jsonOk) $allOk = false;

// 4. api.php 可访问性
$apiFile = __DIR__ . '/api.php';
$apiExists = file_exists($apiFile);
$checks[] = ['api.php', $apiExists ? '存在' : '不存在', $apiExists ? 'OK' : '请上传 api.php', $apiExists];
if (!$apiExists) $allOk = false;

// 5. 测试写入数据
$testFile = $dataDir . '/_test_write.txt';
$canWrite = @file_put_contents($testFile, 'test') !== false;
if ($canWrite) @unlink($testFile);
$checks[] = ['文件写入测试', $canWrite ? '成功' : '失败', $canWrite ? 'OK' : 'data 目录无写入权限', $canWrite];
if (!$canWrite) $allOk = false;

// 6. 测试 api.php 接口
$apiTestOk = false;
$apiTestMsg = '未测试';
if ($apiExists) {
    $testData = json_encode(['name' => '环境检测']);
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $testData,
            'timeout' => 5
        ]
    ];
    $context = stream_context_create($opts);
    $selfUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/api.php?path=students';
    $result = @file_get_contents($selfUrl, false, $context);
    if ($result) {
        $json = json_decode($result, true);
        if (isset($json['id'])) {
            $apiTestOk = true;
            $apiTestMsg = '接口正常';
        } else {
            $apiTestMsg = '返回: ' . substr($result, 0, 100);
        }
    } else {
        $apiTestMsg = '无法访问 api.php（可能是服务器限制）';
    }
}
$checks[] = ['api.php 接口测试', $apiTestOk ? '通过' : '失败', $apiTestMsg, $apiTestOk];
if (!$apiTestOk) $allOk = false;
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>环境检测 - AI 单词游戏</title>
<style>
body { font-family: -apple-system, "Microsoft YaHei", sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
.box { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
h1 { color: #6c5ce7; margin-top: 0; }
.result { font-size: 18px; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; }
.ok { background: #d4edda; color: #155724; }
.fail { background: #f8d7da; color: #721c24; }
table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f8f9ff; }
.status-ok { color: #28a745; font-weight: bold; }
.status-fail { color: #dc3545; font-weight: bold; }
.tip { background: #fff3cd; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 14px; line-height: 1.8; }
a { color: #6c5ce7; }
</style>
</head>
<body>
<div class="box">
  <h1>🔍 环境检测结果</h1>
  <div class="result <?php echo $allOk ? 'ok' : 'fail'; ?>">
    <?php echo $allOk ? '✅ 环境检测全部通过，可以正常使用' : '❌ 存在问题，请查看下方详情'; ?>
  </div>
  <table>
    <tr><th>检测项</th><th>详情</th><th>结果</th></tr>
    <?php foreach ($checks as $c): ?>
    <tr>
      <td><?php echo htmlspecialchars($c[0]); ?></td>
      <td><?php echo htmlspecialchars($c[1]); ?></td>
      <td class="<?php echo $c[3] ? 'status-ok' : 'status-fail'; ?>"><?php echo htmlspecialchars($c[2]); ?></td>
    </tr>
    <?php endforeach; ?>
  </table>

  <?php if (!$allOk): ?>
  <div class="tip">
    <strong>🛠️ 常见问题解决：</strong><br>
    1. <strong>data 目录不可写</strong>：在虚拟主机文件管理器中将 data 目录权限设为 755 或 777<br>
    2. <strong>api.php 不存在</strong>：确认所有文件已完整上传，特别是 api.php<br>
    3. <strong>PHP 版本过低</strong>：联系主机商升级 PHP 到 5.6 以上<br>
    4. <strong>接口测试失败</strong>：检查虚拟主机是否支持 PHP，或联系主机商
  </div>
  <?php endif; ?>

  <div style="margin-top: 20px; text-align: center; font-size: 14px;">
    <a href="index.html">→ 进入学生端</a> &nbsp;|&nbsp;
    <a href="dashboard.html">→ 教师后台</a>
  </div>
</div>
</body>
</html>

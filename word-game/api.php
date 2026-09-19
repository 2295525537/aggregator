<?php
/**
 * AI 单词游戏 - PHP 后端
 * 适用于虚拟主机（支持 PHP 即可）
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- 配置 ----------
define('DATA_FILE', __DIR__ . '/data/db.json');
define('TEACHER_PASSWORD', '7405211');

// ---------- 单词库 ----------
$WORDS = [
    ['word'=>'head','meaning'=>'头','type'=>'noun','category'=>'body'],
    ['word'=>'eye','meaning'=>'眼睛','type'=>'noun','category'=>'body'],
    ['word'=>'ear','meaning'=>'耳朵','type'=>'noun','category'=>'body'],
    ['word'=>'mouth','meaning'=>'嘴巴','type'=>'noun','category'=>'body'],
    ['word'=>'hair','meaning'=>'头发','type'=>'noun','category'=>'body'],
    ['word'=>'nose','meaning'=>'鼻子','type'=>'noun','category'=>'body'],
    ['word'=>'face','meaning'=>'脸','type'=>'noun','category'=>'body'],
    ['word'=>'haircut','meaning'=>'理发；发型','type'=>'noun','category'=>'appearance'],
    ['word'=>'long','meaning'=>'长的','type'=>'adj','category'=>'appearance'],
    ['word'=>'short','meaning'=>'短的；个子矮的','type'=>'adj','category'=>'appearance'],
    ['word'=>'sit','meaning'=>'坐','type'=>'verb','category'=>'action'],
    ['word'=>'see','meaning'=>'看见','type'=>'verb','category'=>'action'],
    ['word'=>'like','meaning'=>'喜欢','type'=>'verb','category'=>'action'],
    ['word'=>'have','meaning'=>'有','type'=>'verb','category'=>'action'],
    ['word'=>'chair','meaning'=>'椅子','type'=>'noun','category'=>'object'],
    ['word'=>'mum','meaning'=>'妈妈','type'=>'noun','category'=>'people'],
    ['word'=>'please','meaning'=>'请','type'=>'adv','category'=>'function'],
    ['word'=>'but','meaning'=>'但是','type'=>'conj','category'=>'function'],
    ['word'=>'on','meaning'=>'在……上','type'=>'prep','category'=>'function'],
    ['word'=>'your','meaning'=>'你的；你们的','type'=>'pron','category'=>'function'],
    ['word'=>'you','meaning'=>'你；你们','type'=>'pron','category'=>'function'],
    ['word'=>'a','meaning'=>'一；一个','type'=>'art','category'=>'function']
];

// ---------- 数据读写 ----------
function loadDB() {
    if (!file_exists(DATA_FILE)) {
        $db = ['students'=>[]];
        saveDB($db);
        return $db;
    }
    $raw = file_get_contents(DATA_FILE);
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = ['students'=>[]];
    if (!isset($data['students'])) $data['students'] = [];
    return $data;
}

function saveDB($db) {
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(DATA_FILE, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function getInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = [];
    return $data;
}

function json_out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function tierFromRate($rate) {
    if ($rate < 0.6) return 'C';
    if ($rate <= 0.85) return 'B';
    return 'A';
}

function nowISO() {
    return date('c');
}

// ---------- 路由 ----------
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_SERVER['PATH_INFO']) ? trim($_SERVER['PATH_INFO'], '/') : '';
if ($path === '' && isset($_GET['path'])) $path = trim($_GET['path'], '/');
$segments = $path === '' ? [] : explode('/', $path);

// GET /words
if ($method === 'GET' && count($segments) === 1 && $segments[0] === 'words') {
    json_out(['words' => $WORDS]);
}

// POST /students
if ($method === 'POST' && count($segments) === 1 && $segments[0] === 'students') {
    $input = getInput();
    $name = isset($input['name']) ? trim($input['name']) : '';
    if ($name === '') json_out(['error'=>'请输入姓名'], 400);
    $db = loadDB();
    $student = [
        'id' => 'stu_' . time() . '_' . substr(md5(uniqid()), 0, 6),
        'name' => $name,
        'tier' => null,
        'createdAt' => nowISO(),
        'gameResults' => [],
        'taskResults' => [],
        'errorBook' => []
    ];
    $db['students'][] = $student;
    saveDB($db);
    json_out($student);
}

// GET /students/{id}
if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'students') {
    $id = $segments[1];
    $db = loadDB();
    foreach ($db['students'] as $s) {
        if ($s['id'] === $id) json_out($s);
    }
    json_out(['error'=>'未找到学生'], 404);
}

// POST /students/{id}/game
if ($method === 'POST' && count($segments) === 3 && $segments[0] === 'students' && $segments[2] === 'game') {
    $id = $segments[1];
    $input = getInput();
    $correct = isset($input['correct']) ? (int)$input['correct'] : -1;
    $total = isset($input['total']) ? (int)$input['total'] : 0;
    $wrongWords = isset($input['wrongWords']) ? $input['wrongWords'] : [];
    if ($correct < 0 || $total <= 0) json_out(['error'=>'参数错误'], 400);

    $db = loadDB();
    $found = false;
    foreach ($db['students'] as &$s) {
        if ($s['id'] === $id) {
            $rate = $total > 0 ? $correct / $total : 0;
            $tier = tierFromRate($rate);
            $result = [
                'correct' => $correct, 'total' => $total, 'rate' => $rate, 'tier' => $tier,
                'wrongWords' => $wrongWords, 'date' => nowISO()
            ];
            $s['gameResults'][] = $result;
            $s['tier'] = $tier;
            foreach ($wrongWords as $w) {
                if (!in_array($w, $s['errorBook'])) $s['errorBook'][] = $w;
            }
            $found = true;
            saveDB($db);
            json_out(['ok'=>true, 'tier'=>$tier, 'rate'=>$rate, 'student'=>$s]);
        }
    }
    if (!$found) json_out(['error'=>'未找到学生'], 404);
}

// POST /students/{id}/task
if ($method === 'POST' && count($segments) === 3 && $segments[0] === 'students' && $segments[2] === 'task') {
    $id = $segments[1];
    $input = getInput();
    $correct = isset($input['correct']) ? (int)$input['correct'] : -1;
    $total = isset($input['total']) ? (int)$input['total'] : 0;
    if ($correct < 0 || $total <= 0) json_out(['error'=>'参数错误'], 400);

    $db = loadDB();
    $found = false;
    foreach ($db['students'] as &$s) {
        if ($s['id'] === $id) {
            $result = [
                'taskTier' => isset($input['taskTier'])?$input['taskTier']:'',
                'taskType' => isset($input['taskType'])?$input['taskType']:'',
                'correct' => $correct, 'total' => $total,
                'rate' => $total > 0 ? $correct / $total : 0,
                'wrongWords' => isset($input['wrongWords'])?$input['wrongWords']:[],
                'date' => nowISO()
            ];
            $s['taskResults'][] = $result;
            foreach ($result['wrongWords'] as $w) {
                if (!in_array($w, $s['errorBook'])) $s['errorBook'][] = $w;
            }
            $found = true;
            saveDB($db);
            json_out(['ok'=>true, 'result'=>$result, 'errorBook'=>$s['errorBook']]);
        }
    }
    if (!$found) json_out(['error'=>'未找到学生'], 404);
}

// POST /students/{id}/tier
if ($method === 'POST' && count($segments) === 3 && $segments[0] === 'students' && $segments[2] === 'tier') {
    $id = $segments[1];
    $input = getInput();
    $tier = isset($input['tier']) ? $input['tier'] : '';
    if ($tier !== '' && !in_array($tier, ['A','B','C'])) json_out(['error'=>'层级无效'], 400);
    $db = loadDB();
    $found = false;
    foreach ($db['students'] as &$s) {
        if ($s['id'] === $id) {
            $s['tier'] = $tier === '' ? null : $tier;
            $found = true;
            saveDB($db);
            json_out(['ok'=>true, 'student'=>$s]);
        }
    }
    if (!$found) json_out(['error'=>'未找到学生'], 404);
}

// POST /teacher/login
if ($method === 'POST' && count($segments) === 2 && $segments[0] === 'teacher' && $segments[1] === 'login') {
    $input = getInput();
    $password = isset($input['password']) ? $input['password'] : '';
    if ($password === TEACHER_PASSWORD) {
        json_out(['ok'=>true, 'token'=>'teacher_token_'.time()]);
    } else {
        json_out(['error'=>'密码错误'], 401);
    }
}

// 辅助函数：获取 Authorization 头（兼容各种 PHP 环境）
function getAuthHeader() {
    // 1. 标准方式
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) return $_SERVER['HTTP_AUTHORIZATION'];
    // 2. CGI/FastCGI 重定向方式
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    // 3. Apache getallheaders()
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) return $headers['Authorization'];
        if (isset($headers['authorization'])) return $headers['authorization'];
    }
    // 4. 查询参数兜底（?token=xxx）
    if (isset($_GET['token'])) return 'Bearer ' . $_GET['token'];
    return '';
}

// GET /teacher/stats
if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'teacher' && $segments[1] === 'stats') {
    $auth = getAuthHeader();
    if (strpos($auth, 'Bearer teacher_token_') !== 0) {
        json_out(['error'=>'未授权'], 401);
    }
    $db = loadDB();
    $students = $db['students'];
    $tierCount = ['A'=>0,'B'=>0,'C'=>0,'unranked'=>0];
    $totalGames = 0; $totalCorrect = 0; $totalQuestions = 0;

    foreach ($students as $s) {
        if ($s['tier']) $tierCount[$s['tier']] = isset($tierCount[$s['tier']]) ? $tierCount[$s['tier']]+1 : 1;
        else $tierCount['unranked']++;
        foreach ($s['gameResults'] as $r) {
            $totalGames++;
            $totalCorrect += $r['correct'];
            $totalQuestions += $r['total'];
        }
    }
    $overallRate = $totalQuestions > 0 ? $totalCorrect / $totalQuestions : 0;

    $out = [
        'totalStudents' => count($students),
        'tierCount' => $tierCount,
        'overallRate' => $overallRate,
        'totalGames' => $totalGames,
        'students' => array_map(function($s) {
            $lastGame = !empty($s['gameResults']) ? $s['gameResults'][count($s['gameResults'])-1] : null;
            return [
                'id' => $s['id'],
                'name' => $s['name'],
                'tier' => $s['tier'],
                'createdAt' => $s['createdAt'],
                'gameCount' => count($s['gameResults']),
                'taskCount' => count($s['taskResults']),
                'lastGame' => $lastGame ? ['rate'=>$lastGame['rate'],'tier'=>$lastGame['tier'],'date'=>$lastGame['date']] : null,
                'errorBook' => $s['errorBook'],
                'gameResults' => $s['gameResults'],
                'taskResults' => $s['taskResults']
            ];
        }, $students)
    ];
    json_out($out);
}

// 默认
json_out(['error'=>'接口不存在', 'path'=>$path], 404);

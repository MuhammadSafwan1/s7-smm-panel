<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['apiUrl']) || empty($input['apiKey']) || empty($input['action'])) {
    echo json_encode(['success' => false, 'error' => 'Missing fields']);
    exit;
}

$post = ['key' => $input['apiKey'], 'action' => $input['action']];

// Add any extra params
foreach ($input as $k => $v) {
    if (!in_array($k, ['apiUrl', 'apiKey', 'action'])) {
        $post[$k] = $v;
    }
}

$postFields = http_build_query($post);

$ch = curl_init($input['apiUrl']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)');
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$result = curl_exec($ch);
curl_close($ch);

if ($result === false) {
    echo json_encode(['success' => false, 'error' => 'Request failed']);
    exit;
}

$data = json_decode($result, true);
echo json_encode(['success' => true, 'data' => $data]);

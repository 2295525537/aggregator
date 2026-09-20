<?php
// 阻止目录列表访问 - 即使主机开启了 autoindex 也不会列出文件
http_response_code(403);
exit('Forbidden');

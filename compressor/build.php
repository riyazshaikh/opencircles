<?php

$myFile = "../js/compressed.js";
$fh = fopen($myFile, 'w') or die("can't open file");

$stringData = "";
$filelist = array('../js/Actions.js', '../js/Analytics.js', '../js/Authentication.js', '../js/ActivityStore.js', '../js/Constants.js', '../js/jqueryplugins/jquery.cookie.js', '../js/jqueryplugins/jquery.json-2.2.min.js', '../js/jqueryplugins/date.js', '../js/jqueryplugins/htmlparser.js', '../js/jqueryplugins/jquery.editui.js', '../js/jqueryplugins/jquery.history.js', '../js/jqueryplugins/jquery.timeago.js', '../js/Services.js', '../js/Utils.js', '../js/facebook.js', '../js/jqueryplugins/fileuploader.js');
foreach($filelist as $filepath)
{
	$stringData .= file_get_contents($filepath);
}

$stringData .= "Framework.Constants.TEMPLATES.listing = '".addslashes(str_replace("\r\n","",file_get_contents("../html/tmpl_listings.html")))."';";
$stringData .= "Framework.Constants.TEMPLATES.message = '".addslashes(str_replace("\r\n","",file_get_contents("../html/tmpl_messages.html")))."';";
$stringData .= "Framework.Constants.TEMPLATES.users = '".addslashes(str_replace("\r\n","",file_get_contents("../html/tmpl_users.html")))."';";
$stringData .= "Framework.Constants.TEMPLATES.email = '".addslashes(str_replace("\r\n","",file_get_contents("../html/tmpl_email.html")))."';";

fwrite($fh, $stringData);
fclose($fh);
?>
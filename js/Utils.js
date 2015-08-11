Framework.Utils = {
	makeButton: function(obj) {
		obj.addClass("ui-button").addClass("ui-corner-all");
		obj.hover(function(){
			jQuery(this).addClass("ui-state-hover");
		}, function(){
			jQuery(this).removeClass("ui-state-hover");
		});
		return obj;
	},
	
// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
  cache: {},
  tmpl: function(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      this.cache[str] = this.cache[str] ||
        this.tmpl(document.getElementById(str).innerHTML) :
     
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +
       
        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +
       
        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");
   
    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
  },
  
	random_num: function(from, to){
		from = from ? from : 0;
		to = to ? to : 9999999;
		return from + Math.floor(Math.random() * (from + to - 1));
	},

	// Stores current state of app in cookie (as defined in <obj>). 
	store_state: function(obj) {
		$.cookie("state", $.toJSON(obj));
	},
	
	get_state: function(bDontDelete)
	{
		var value = $.cookie("state");
		if( !bDontDelete )
		{
			$.cookie("state",null);
		}
		return $.evalJSON(value);
	},
	
	delete_all_cookies: function()
	{
		var c=document.cookie.split(";");for(var i=0;i<c.length;i++){var e=c[i].indexOf("=");var n=e>-1?c[i].substr(0,e):c[i];document.cookie=n+"=;expires=Thu, 01 Jan 1970 00:00:00 GMT";}
	},
	
	get_as_url_params: function(obj, bRaw)
	{
		if( !obj )
			return '';
		var result = [];
		for( var name in obj)
		{
			if( !name || jQuery.trim(name) == "" || name.match(/__eht/) )
			{
				continue;
			}
			var value = typeof(obj[name]) == 'object' ? JSON.stringify(obj[name]) : obj[name];
			if( bRaw )
			{
				result.push(name+'='+value);
			}
			else
			{
				result.push(name+'='+encodeURIComponent(value));
			}
		}
		return result.join('&');
	},

	go_to_url: function(path, params)
	{
		var url = Framework.SITE_URL + path;
		url = params ? url + '#' + this.get_as_url_params(params) : url;
		window.location = url;
	},
	
	get_age: function(dob)
	{
		return Math.floor((Date.today() - Date.parse(dob,'yyyy-mm-dd'))/(Date.today() - Date.today().addYears(-1)));
	},
	
	parseUrlCache: {},
	parseUrl: function(url)
	{
        var regex = /^((\w+):)?(\/\/((\w+)?(:(\w+))?@)?([^\/\?:]+)(:(\d+))?)?(\/?([^\/\?#][^\?#]*)?)?(\?([^#]+))?(#(.*))?/;
    
        url = url || window.location.href;
        var resp;
        if( !this.parseUrlCache[url] )
        {
          var m = url.match(regex);
  
          this.parseUrlCache[url] = 
            {
              'url'         : m[0],
              'protocol'    : m[2],
              'username'    : m[5],
              'password'    : m[7],
              'host'        : m[8]  || "",
              'port'        : m[10],
              'pathname'    : m[11] || "",
              'querystring' : m[14] || "",
              'fragment'    : m[16] || ""
            };
        }
        resp = this.parseUrlCache[url];
         
        /**
         * Try and find a querystring argument matching sent parameter. 
         *
         */
		
		resp.param = function(p)
		{
			return resp.hashParam(p) || resp.searchParam(p);
		}
		
		// look only in search params
        resp.searchParam = function(p)
        {
            var ex = new RegExp("[?&]" + p + "=([^&]*)?","i").exec('?' + this.querystring);
            return !ex ? null : ex[1];
        }
         
         // Look only in hash
         resp.hashParam = function(p)
         {
            var ex = new RegExp("[#&]" + p + "=([^&]*)?","i").exec('#' + this.fragment);
            return !ex || typeof(ex[1]) != 'string' ? null : decodeURIComponent(ex[1]);
         }

         resp.getAllParams = function()
         {
			var params = resp.getAllSearchParams();
			jQuery.extend(params, resp.getAllHashParams());
			return params;
         }
		 
         resp.getAllHashParams = function()
         {
             var args  = this.fragment.split('&');
             var hashParams = {};
             for (var x = 0; x < args.length; x++) {
                 var s = args[x].split('=');
                 hashParams[s[0]] = decodeURIComponent(s[1]);
             }
             return hashParams;
         }
         resp.getAllSearchParams = function()
         {
             var args  = this.querystring.split('&');
             var params = {};
             for (var x = 0; x < args.length; x++) {
                 var s = args[x].split('=');
                 params[s[0]] = decodeURIComponent(s[1]);
             }
             return params;
         }
         return resp;
	},
	
	updateUrl: function(params, options)
	{
		options = options || {};
		var parsedUrl = Framework.Utils.parseUrl(); 
		var hsh = parsedUrl.fragment;
		
		for(key in params)
		{
			var regex = new RegExp(key + '=.*?($|&)');
			if (hsh.match(regex)) { // replace if parameter exists
				if (params[key] === null) { // remove if null
					hsh = hsh.replace(new RegExp('&?' + key + '=[^$&]*'), '');
				}
				else {
					hsh = hsh.replace(regex, key + '=' + encodeURIComponent(params[key]) + '$1');
				}
			}
			else if(params[key] !== null) { // append
				var separator = hsh.length === 0 ? '' : '&';
				hsh += separator + key + '=' + encodeURIComponent(params[key]);
			}
		}
		
		if( parsedUrl.fragment != hsh )
		{
			var url = parsedUrl.url.split('#')[0] + '#' + hsh;
			window.location.href = url;
		}
	},

	geolocate: function(callback) {
		var geocode_error = function(msg) {
			Framework.Analytics.trackEvent('geolocation', 'error', msg);
		};
		var geocode_recv = function(response) {
			var position = { latitude: response.coords.latitude||response.coords.Latitude, longitude: response.coords.longitude||response.coords.Longitude };
			Framework.Services.get_geocode_details((position.latitude||position.Latitude)+','+(position.longitude||position.longitude), 
			{ 
				callback: function(resp) {
					Framework.Utils.geocode(resp);
					callback(resp);
				} 
			});
		};
		navigator.geolocation.getCurrentPosition(geocode_recv, geocode_error, {timeout: 10000, maximumAge: 60000});//cache it for 10 minutes			
	},
	
	geocode_stored: null,
	// A simple wrapper around geocode cookie
	geocode: function(value)
	{
		if( typeof(value) == 'undefined')
		{
			value = $.evalJSON($.cookie('geocode'));
			if( !value )
			{
				Framework.Analytics.trackEvent('geolocation', 'error', 'no geocode');
				value = this.geocode_stored || Framework.Services.defaultGeocode;
			}
			return value;
		}
		else
		{
			$.cookie('geocode', $.toJSON(value));
			this.geocode_stored = value;
		}
	},
	
	error: function(e, bShow) {
		e = typeof(e) == 'string' ? new Error(e) : e;
		if( window.ExceptionHub )
		{
			ExceptionHub.logStackTrace(e).upload();
		}
		console.error(e);
	},
	
	capitaliseFirstLetter: function(string)
	{
		if( typeof(string) !== 'string' && !isNaN(string.length) ) {
			for( var i=0; i<string.length; i++ ) {
				string[i] = string[i].charAt(0).toUpperCase() + string[i].slice(1);
			}
			return string.join(', ');
		} else {
			string = string || ' ';
			return string.charAt(0).toUpperCase() + string.slice(1);
		}
	},

	shorten: function(string, maxlen)
	{
		maxlen = maxlen || 10;
		return (string && string.length > maxlen) ? string.substring(0,maxlen-3) + '...': string;
	},
	
	strip_stopwords: function(string)
	{
		var regex = [];
		for(var word in Framework.Constants.STOPWORDS)
		{
			regex.push("\\b"+word+"\\b");
		}
		return string.replace(new RegExp(regex.join('|'),'gim'),'').replace(/,\s*,/gim,',').replace(/(^,)|(,$)/gim,'');
	},
	
	findProperty: function(name, obj)
	{
		var propval;
		if( obj && obj.constructor == Array )
		{
			for(var i=0;i<obj.length; i++)
			{
				propval = this.findProperty(name, obj[i]);
				if(typeof(propval) !== 'undefined')
				{
					break;
				}
			}
		}
		else if(typeof(obj) == 'object')
		{
			for( var key in obj )
			{
				if( key == name )
				{
					propval = obj[key];
					break;
				}
				else
				{
					propval = this.findProperty(name, obj[key]);
					if(typeof(propval) !== 'undefined')
					{
						break;
					}
				}
			}
		}
		
		return propval;
	},
	
	F: function() {},

	/**
	 * http://yelotofu.com/2008/08/jquery-shuffle-plugin/
	 * @param {Object} arr
	 */        
	shuffle: function(arr){
		if (arr && arr.length > 1) {
			for (var j, x, i = arr.length; i; j = parseInt(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x) 
				;
		}
		return arr;
	},

	// Aho-Corasick String Search Algorithm
	// @author Jalada http://jalada.co.uk
	// Arguments:
	//   trie - a Trie as per http://is.gd/1Y9FT
	//   s - string to be searched
	ahoCorasick: function(trie, s) {
		// Start at the root.
		var current = trie;
		// Nothing in state at the moment
		var state = "";
		// Split the string
		var split = s.split("");
		var j = 0;
		// We return everywhere in this loop.
		while (1) {
			for (i=j; i<split.length; i++) {
				var r = current.hasChild(split[i]);
				// Does this character exist in the children of where we
				//are in the trie?
				if (r) {
					// If so, append to the state, and traverse to
					// that child
					state += split[i];
					current = r;
					// Have we found a word now?
					if (trie.getWordCount(state) != 0) {
						return true;
					}
				} else {
					// If not, go back to where we started to match,
					//reduce i, and empty the state
					current = trie;
					i = i - state.length;
					state = "";
				}
			}
			// Reached the end of the string
			if (state == "") {
				// Just found nothing
				return false;
			} else {
				// Was in the middle of finding something, so possibly
				//missed something, so go back to check.
				current = trie;
				j = i - state.length + 1;
				state = "";
			}
		}
	},

	get_share_link: function(activity)
	{
		var url = Framework.SITE_URL + '#eventid='+activity.id;
		return '<a href="'+url+'">Link to this</a>'; // '<a class="st-taf" href="http://tellafriend.socialtwist.com:80" onclick="return false;" style="border:0;padding:0;margin:0;"><img alt="SocialTwist Tell-a-Friend" style="border:0;padding:0;margin:0;" src="http://images.socialtwist.com/2010121147685/button.png" onmouseout="STTAFFUNC.hideHoverMap(this)" onmouseover="STTAFFUNC.showHoverMap(this, \'2010121147685\', \''+url+'\', \''+activity.name+'\')" onclick="STTAFFUNC.cw(this, {id:\'2010121147685\', link: \''+url+'\', title: \''+activity.name+'\' });"/></a>';
	},
	
	get_datetime_formatted: function(start)
	{
		var time = new Date(start);
		var toReturn = {};
		if( time.toString('htt') == '0AM' )
		{
			toReturn.time = ''; // this means its all day
		}
		else 
		{
			toReturn.time = time.toString('htt');
		}
		toReturn.day = time.toString('d');
		toReturn.dayofweek = time.toString('ddd').toLowerCase();
		return toReturn;
	},
	
	get_datetime_formatted_email: function(time)
	{
		return new Date(time).toString('dddd, MMMM d, yyyy h:mm tt');
	},
	
	parseXml: function(str) {
	  if (window.ActiveXObject) {
		var doc = new ActiveXObject('Microsoft.XMLDOM');
		doc.loadXML(str);
		return doc;
	  } else if (window.DOMParser) {
		return (new DOMParser).parseFromString(str, 'text/xml');
	  } else
		return "";
	},

	inArray: function(needle, haystack){
		if ( !haystack || typeof(haystack.length) == 'undefined' ) {
			return false;
		}
		for (var i = 0; i < haystack.length; i++) {
			if( needle instanceof RegExp && haystack[i].match(needle) )
			{
				return true;
			}
			else if( haystack[i] instanceof RegExp && needle.match(haystack[i]) )
			{
				return true;
			}
			else if (haystack[i] == needle) { // whatever type they are...
				return true;
			}
		}
		return false;
	},
	
	in_newyork: function(lat,lon) {
		if( Framework.Utils.inArray(parseInt(lat), [39, 40]) &&  Framework.Utils.inArray(parseInt(lon), [-73, -74]) )
		{
			return true;
		}
		else
		{
			return false;
		}
	},
	
	get_time_12am: function(dateTime) {
		dateTime = dateTime || new Date();
		if( typeof(dateTime) == 'number' )
			dateTime = new Date(dateTime);
		return Date.parseExact(dateTime.toString('yyyy/MM/dd'),'yyyy/MM/dd').getTime();
	},
	
	get_formatted_users: function(users) {
		var format_func = function(user) {
			if( !user.pic ) {
				user.pic = Framework.SITE_URL + 'images/anonymous.jpg';
			}
			if( !user.url ) {
				user.url = 'http://www.facebook.com/profile.php?id=100002119287850';
			}
			if( !user.name ) {
				user.name = 'Anonymous';
			}
			user.name = user.name.split(' ')[0];
			if( !user.activities ) {
				user.activities = [];
			}
			return user;
		};

		if( !users.length )
		{ // single user
			return format_func(users);
		}	
		for( var i=0; i<users.length; i++ )
		{
			users[i] = format_func(users[i]);
		}
		return users;
	},
	
	chompSlash: function(url) {
		return url.replace(/[\/\\]*$/, '');
	},
	
	inFacebook: function() {
		return window != window.top ? true: false;
	}
};
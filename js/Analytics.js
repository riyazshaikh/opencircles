Framework.Analytics = new function () {
    var self = this;
	self.gametrics = null;
    self.startTime = (new Date()).getTime();
		
    self.trackAction = function () {
        try {
            if (self.gametrics) {
                var arrHolder = []; // since arguments cant be operated on directly
                for (var i = 0; i < arguments.length; i++) {
					if( !arguments[i] ) continue;
                    arrHolder.push(arguments[i].replace('/',''));
                }
                self.gametrics._trackPageview(arrHolder.join('/'));
            }
	    else
		{
		    var temp = arguments;
		    setTimeout(function() { self.trackAction.apply(self,temp); }, 5000);
		}
        } catch (e) {
            console.error('Problem tracking action',e);
        }
    };

    // if category is set to null, page name will be used
    self.trackEvent = function (category, action, obj) {
        try {
            obj = obj ? obj : {};
            if (self.gametrics) {
                var jsonStr = JSON.stringify(obj);
                if (jsonStr.length < 255) // dont track extra long analytics
                self.gametrics._trackEvent(category, action, jsonStr);
            }
			else
			{
				var temp = arguments;
				setTimeout(function() { self.trackEvent.apply(self,temp); }, 5000);
			}
        } catch (e) {
            console.error( 'Problem tracking event', e);
        }
    };

    /**
     * Set up handler to track all clicks on page
     * @param page - The path we want to categorize all clicks under
     */
    self.trackAllClicks = function (page) {
            jQuery(document).click(function (event) {
                try {
                    var isValid = function (text) {
                        return (typeof(text) == 'undefined' || text === null || jQuery.trim(text) === "") ? false : true;
                    };
                    var btn = jQuery(event.target);
                    if (!isValid(btn.attr('title')) && !isValid(btn.attr('id')) && !isValid(btn.text()) && !isValid(btn.attr('src'))) {
                        btn = btn.parent();
                    }
                    var btnDetails = {
                        title: btn.attr('title'),
                        id: btn.attr('id'),
                        className: btn.attr('className'),
                        text: jQuery.trim(btn.text()),
                        type: btn.attr('tagName'),
                        src: btn.attr('src')
                    };
                    if (btnDetails.type != 'html') { // dont track clicks on html
                        self.trackEvent(page, 'click', btnDetails);
                    }
                }
                catch (e) {
                    // ignore... self is not critical to app working.
                }
            });
    };

    self.loadGoogleAnalytics = function (callback) {
		if (!window._gat) // only load if not loaded...
		{
			var ga = document.createElement('script');
			ga.type = 'text/javascript';
			ga.async = true;
			ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
			// document.getElementsByTagName('body')[0].appendChild(ga);
			var s = document.getElementsByTagName('script')[0];
			s.parentNode.insertBefore(ga, s);
			ga.onload = ga.onreadystatechange = function () {
				if (window._gat) {
					self.gametrics = _gat._getTracker(self.getUAString());
					self.gametrics._setDomainName(self.getDomain());
					self.gametrics._setAllowLinker(true);
					self.gametrics._setAllowHash(false);
					if( callback )
					{
						callback();
					}
				}
			};
		}
    };

    self.switchAnalytics = function (newCode) {
        if (window._gat) {
            self.gametrics = _gat._getTracker(newCode);
            self.gametrics._trackPageview(window.location.pathname + window.location.search + escape(window.location.hash));
        }
    };

    self.trackPageLoad = function () {
        var loadTime = {};
        var page = window.location.pathname;

        jQuery(document).ready(function() {
            loadTime.dom = Math.floor(((new Date()).getTime() - self.startTime) / 1000);
        });

        jQuery(window).load(function() {
                loadTime.window = Math.floor(((new Date()).getTime() - self.startTime) / 1000);
                self.trackEvent(page, 'load', loadTime);
        });
    };

    self.getUAString = function () {
        var site = window.location.hostname;
        var UAMap = { 'www.open-circles': 'UA-7350646-6',
						'www.opencirclez': 'UA-7350646-9',
						'fb.opencirclez': 'UA-7350646-9',
						'music.opencirclez': 'UA-7350646-9'
					};

        for (key in UAMap) {
            if (UAMap.hasOwnProperty(key)) {
                var regexp = new RegExp(key);
                if (site.match(regexp)) {
                    return UAMap[key];
                }
            }
        }
		return 'UA-7350646-3';
    };

    self.getDomain = function () {
        var alternatives = ['production'];

        for (var i = 0; i < alternatives.length; i++) {
            if (window.location.hostname.indexOf(alternatives[i]) > -1) {
                return '.' + alternatives[i];
            }
        }
        // console.error('unknown domain');
        return 'none';
	}
};
jQuery(document).ready(function() {
	if(window.location.search.indexOf('notrack') > -1 || $.cookie("notrack") )
	    {
			$.cookie("notrack",true);
			return;
	    }
	try {
		setTimeout( function() {
			Framework.Analytics.loadGoogleAnalytics(function() {
				Framework.Analytics.trackAction((window.location.pathname=='/'?'index.html':window.location.pathname) + window.location.search +window.location.hash);
				Framework.Analytics.trackPageLoad();
				Framework.Analytics.trackAllClicks(window.location.pathname + window.location.search); // track all clicks on self page
			});
		}, 1000 );
	}
	catch (err) {
		console.error('cannot load analytics');
	}
});

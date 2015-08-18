Framework.ActivityStore = {
	cache: [],
	current: [],
	keywords: {},
	
	resetEverything: function() {
		this.cache = [];
		this.current = [];
		this.keywords = {};
	},
	
	fetchResults: function(options) {
		options = options || {};
		this.resetEverything();
		var filters = options.filters || {};
		if( options.source == 'eventid' )
		{
			Framework.Services.get_event({ eventid: filters.eventid }, { 
				callback: function(activity) {
					activity.name = activity.title;
					activity.time = parseInt(activity.starttime);
					delete activity.title;
					Framework.ActivityStore.current.push(activity);
					Framework.ActivityStore.cache.push(activity);
					options.callback();
				},
				onFailure: function() {
					options.callback();
				}
			});
		}
		else
		{
			filters.activity = filters.activity || '';
			$.cookie("activity", filters.activity);
			filters.activity = Framework.Utils.strip_stopwords(filters.activity.toLowerCase());
			filters.time = filters.time || Framework.Utils.get_time_12am() + ',';
			filters.location = Framework.Utils.geocode().latlong;

			Framework.Analytics.trackAction('search', 'source', options.source);			
			Framework.Analytics.trackEvent('search', options.source, filters.activity);

			var keywords = filters.activity.split(',');
			for( var i=0;i<keywords.length; i++ )
			{
				Framework.ActivityStore.keywords[keywords[i].toLowerCase()] = 0;
			}
			
			var latitude = filters.location.split(',')[0];
			var longitude = filters.location.split(',')[1];
			var reqCntr = 0;
			var reduceNCheck = function() {
				reqCntr = reqCntr - 1;
				if( reqCntr <= 0 )
				{
					options.callback();
				}
			};
			reqCntr++;
			var times = filters.time.split(','); 
			this.getInhouseResults({ 
				start: times[0], 
				end: times[1], 
				timeless: times[1] ? 0 : 1,
				latlong: filters.location,
				radius: filters.radius,
				keyword: filters.activity.indexOf(',') > -1 ? '' : filters.activity
			}, {
				keywords: keywords,
				callback: function() {
					reduceNCheck();
				}
			});
			
			/*
			if( Framework.Utils.in_newyork(latitude, longitude) )
			{
				if( filters.activity.indexOf('party') > -1 ) {
					reqCntr++;
					this.getRhythmismResults({ start: filters.time.split(',')[0], end: filters.time.split(',')[1] }, {
						keywords: keywords,
						callback: function() {
							reduceNCheck();
						}
					});
				}
				reqCntr++;
				Framework.ActivityStore.getFlavorPillResults( filters, {
					keywords: keywords,
					callback: function() {
						reduceNCheck();
					}
				}); 
			}*/
			
			// reqCntr++;
			// this.getMeetupResults({ lon: longitude, lat: latitude, radius: filters.radius, time: filters.time, text: jQuery.trim(filters.activity.replace(/,/gim, ' '))}, {
			// 	keywords: keywords,
			// 	callback: function() {
			// 		reduceNCheck();
			// 	}
			// });
		}
		/*
		this.getCraigslistResults({ text: filters.activity }, {
			callback: function(activities) {
				allActivities = allActivities.concat(activities);
				decrCntr();
			}
		});*/
	},
	
	getInhouseResults: function(obj, options)
	{
		Framework.Services.get_events(obj, {
			callback: function(response) {
				for( var i=0; i<response.length; i++ )
				{
					var activity = response[i];
					activity.name = activity.title;
					delete activity.title;
					activity.time = parseInt(activity.starttime);
					activity.url = activity.url || '';
					activity.quality = activity.quality ? parseInt(activity.quality) : 10;
					activity.source = 'From Our Users';
					activity.cost = activity.cost || '';
					activity.distance = activity.distance || 0;
					activity.distance = (activity.distance/1600).toFixed(1);
					Framework.ActivityStore.addIfRelevant(activity, options.keywords);
				}
				Framework.ActivityStore.current = Framework.ActivityStore.sort_by_coolness(Framework.ActivityStore.current);
				if( options.callback )
				{
					options.callback();
				}
			},
			onFailure: function() {
				if( options.callback )
				{
					options.callback();
				}
			}
		});
	},
	
	getRhythmismResults: function(obj, options)
	{
		var query = 'select * from html where url="http://www.rhythmism.com/forum/calendar.php?c=1&do=displayweek"';
		Framework.Services.makeYqlCall( query, {
			format: 'xml',
			callback: function(response) {
				var jEvents = jQuery(response.results[0].replace(/<img.*?>/gim, '').replace(new RegExp('(<script[^>]*>([\\S\\s]*?)<\/script>)', 'gim'), '')).find('table.tborder:eq(1) td.alt1');
				jEvents.each(function() {
					var activity = {};
					activity.name = 'Party: ' + jQuery(this).find('a').text();
					activity.description = jQuery(this).find('a').attr('title');
					activity.url = 'http://www.rhythmism.com' + jQuery(this).find('a').attr('href');
					activity.time = Date.parseExact(jQuery(this).attr('title'),'MMMM d yyyy').getTime();
					activity.source = 'Rhythmism.com';
					activity.cost = activity.cost || '';
					Framework.ActivityStore.addIfRelevant(activity, options.keywords);
				});
				Framework.ActivityStore.current = Framework.ActivityStore.sort_by_coolness(Framework.ActivityStore.current);
				if( options.callback )
				{
					options.callback();
				}
			},
			onFailure: function() {
				if( options.callback )
				{
					options.callback();
				}
			}
		});
	},
	
	getFlavorPillResults: function(obj, options)
	{
		var dateTime = (new Date(parseInt(obj.time.split(',')[0])));
		var dateTime12am = Framework.Utils.get_time_12am(dateTime);
		var query = 'select * from html where url="http://flavorpill.com/newyork/events/'+dateTime.toString('yyyy/MM/dd')+'"';
		Framework.Services.makeYqlCall( query, {
			format: 'xml',
			callback: function(response) {
				var jEvents = jQuery(response.results[0].replace(/<img.*?>/gim, '').replace(new RegExp('(<script[^>]*>([\\S\\s]*?)<\/script>)', 'gim'), '')).find('.single_event');
				jEvents.each(function() {
					var activity = {};
					activity.name = jQuery(this).find('.genre a:eq(0)').text() + ': ' + jQuery(this).find('.title').text();
					activity.name = activity.name.replace(/<.*?>/g, '').replace(/"|(\n\s*)/g,' ');
					activity.description = jQuery(this).find('.short_description').text();
					activity.address = jQuery(this).find('.venue').text();
					activity.time = dateTime12am;
					activity.url = 'http://flavorpill.com' + jQuery(this).find('.title a').attr('href');
					activity.id = activity.url;
					activity.source = 'FlavorPill.com';
					activity.cost = activity.cost || '';
					Framework.ActivityStore.addIfRelevant(activity, options.keywords);
				});
				Framework.ActivityStore.current = Framework.ActivityStore.sort_by_coolness(Framework.ActivityStore.current);
				if( options.callback )
				{
					options.callback();
				}
			},
			onFailure: function() {
				if( options.callback )
				{
					options.callback();
				}
			}
		});
	},
	
	getGoogleMovieResults: function(obj, options)
	{
		var latlong = obj.location.split(',');
		var query = 'select * from data.html.cssselect where url="http://www.google.com/movies?near='+latlong[0]+','+latlong[1]+'&hl=en&sort=1" and css="div.movie"';
	
		Framework.Services.makeYqlCall( query, {
			format: 'xml',
			callback: function(response) {
				var movies = jQuery(Framework.Utils.parseXml(response.results[0])).find('.movie');
				movies.each(function() {
					var activity = {};
					var jThis = jQuery(this);
					activity.name = 'Movie: ' + jThis.find('.desc h2').text();
					jThis.find('.info:eq(0), .syn span').remove();
					activity.description = jThis.find('.syn').text() + '...';
					activity.address = jThis.find('.theater:eq(0) .name').text() + '<br/>' + jThis.find('.theater:eq(0) .address').text();
					activity.coords = jQuery.trim(jThis.find('.theater:eq(0) .address').text());
					activity.url = 'http://www.google.com' + jThis.find('.desc h2 a').attr('href');
					activity.time = Date.parse(jThis.find('.times:eq(0) a:eq(0)').text()||"now");
					Framework.ActivityStore.cache.push(activity);
					Framework.ActivityStore.current.push(activity);
				});
			}
		});
		
	},
	
	getCraigslistResults: function(obj, options)
	{
		obj.text = obj.text || " ";
		var NewYorkAreaMap = {
			"Manhattan": "mnh",
			"Brooklyn": "brk",
			"Queens": "que",
			"Bronx": "brx",
			"Staten Island": "stn",
			"New Jersey": "jsy",
			"Long Island": "lgi",
			"Westchester": "wch",
			"Fairfield": "fct"
		};
		var SFBayAreaMap = {
			"San Francisco": "sfc",
			"Santa Clara": "sby",
			"Alameda": "eby",
			"San Mateo": "pen",
			"Marin": "nby",
			"Santa Cruz": "scz"
		};
		
		var geocode = Framework.Utils.geocode();
		var location, area, query;
		if( geocode.state == "CA" && parseInt(geocode.latlong.split(',')[1]) > 35 )
		{
			location = "sfbay";
			if(SFBayAreaMap[geocode.area])
			{
				area = SFBayAreaMap[geocode.area];
			}
		}
		else if( geocode.state == "NY" )
		{
			location = "newyork";
			if(NewYorkAreaMap[geocode.area])
			{
				area = NewYorkAreaMap[geocode.area];
			}
		}
		else
		{
			options.callback([]);
			return;
		}
		
		if( area )
		{
			query = 'use "http://beta.open-circles.org/yqltables/craigslist.search.xml" as craigslist;';
			query += 'select * from craigslist where location="'+location+'" and type="act" and area="'+area+'" and query="'+obj.text+'"';
		}
		else
		{
			query = 'select * from craigslist.search where location="'+location+'" and type="act" and query="'+obj.text+'"';
		}
		Framework.Services.makeYqlCall(query, { 
			callback: function(response) {
				var results = Framework.Utils.findProperty('item',response) || [];
				var activities = [];
				for( var i=0; i<results.length && i<10; i++ )
				{
					var activity = {};
					activity.url = results[i].link || '';
					activity.time = results[i].date || '';
					activity.name = results[i].title.length ? results[i].title[0] : results[i].title;
					activity.description = results[i].description.replace(/<.*?>/g, '');
					activity.address = area ? geocode.area : geocode.city;
					activities.push(activity);
				}
				options.callback(activities);
			},
			onFailure: function() {
				options.callback([]);
			}
		});
	},
	
	// Perform our relevancy analysis, and return sorted keyword suggestions
	analyze_personalized: function(response, options)
	{
		/** Keyword analysis of results **/
		var i,j, keywords = options.keywords, activities = [], analysis = new Array(response.results.length);
		// keyword frequency counts
		for( i=0; i<keywords.length; i++ )
		{
			keywords[i] = { index: i, word: jQuery.trim(keywords[i]), cnt: 0 };
		}

		// Fill up analysis matrix
		for( i=0; i<response.results.length; i++ )
		{
			if( typeof(analysis[i]) == 'undefined' )
			{
				analysis[i] = new Array(keywords.length);
			}
			// do keyword analysis on both title and description
			var text = response.results[i].name + response.results[i].description;
			for(j=0; j<keywords.length; j++)
			{
				if( text.match(new RegExp(keywords[j].word, 'im')) )
				{
					analysis[i][j] = 1; // mark this keyword for this activity
					keywords[j].cnt++; // freq cntr for this keyword
				}
			}
		}

		// sort keywords by frequency
		keywords.sort(function(a,b) {
			return a.cnt - b.cnt;
		});
		
		var sortedKeywords = [];
		for(i=0; i<keywords.length; i++)
		{
			if( keywords[i].cnt ) // only send back keywords that have results
				sortedKeywords.push(keywords[i].word);
		}
		
		// Mark activities beginning with the rarest ones first
		var cnt = 0;
		for( j=0; j<keywords.length; j++ )
		{
			for(i=0; i<analysis.length; i++)
			{
				if( analysis[i][j] && !activities[i] )
				{
					activities.push(response.results[i]);
					cnt++;
					if( cnt == 3 )
					{
						cnt = 0;
						break;
					}
				}
			}
			if( activities.length >= 10 )
			{
				break;
			}
		}
		
		return { activities: activities, keywords: sortedKeywords };
	},
	
	// Perform wordstat based keyword analysis, and return sorted keyword suggestions
	/*
	analyze_generic: function(response)
	{
		return [ 'yoga', 'dancing', 'language exchange', 'movie' ];
		
		var oneLongString = [];
		for(var i=0; i<response.results.length; i++)
		{
			oneLongString.push(response.results[i].name);
			if( typeof(response.results[i].description) == 'string' )
				oneLongString.push(response.results[i].description.replace(/<.*?>/gim,''));
		}
		jQuery.wordStats.stopWords = Framework.Constants.STOPWORDS;
		$.wordStats.clear();
		$.wordStats.computeTopWords(10, oneLongString.join(' '));
		var toReturn = [];
		for( var i=0; i<10; i++ )
		{
			if( isNaN($.wordStats.topWords[i].substr(1)) && $.wordStats.topWords[i].length > 4 )
				toReturn.push($.wordStats.topWords[i].substr(1));
		}
		return toReturn;
	}, */
	
	sort_by_coolness: function(activities)
	{
		activities.sort(function(a,b) {
			a.quality = a.quality ? a.quality : 0;
			b.quality = b.quality ? b.quality : 0;
			a.hasmsg = isNaN(parseInt(a.hasmsg)) ? 0 : parseInt(a.hasmsg);
			b.hasmsg = isNaN(parseInt(b.hasmsg)) ? 0 : parseInt(b.hasmsg);
			if( a.quality != b.quality )
				return b.quality - a.quality;
			else if( a.hasmsg && b.hasmsg )
				return a.hasmsg - b.hasmsg;
			else if( a.hasmsg || b.hasmsg )
				return a.hasmsg ? -1 : 1;
			else if( a.timeless || b.timeless )
				return a.timeless ? 1 : -1;
			else
				return a.time - b.time;
		});
		return activities;
	},
	
	get_formatted_meetup_activity: function(activity)
	{
		try {
			activity.name = activity.name.replace(/<.*?>/g, '').replace(/"|(\n\s*)/g,' ');
			if( activity.venue )
			{
				activity.address = '';
				activity.address += (activity.venue.address_1 || '');
				activity.address += (activity.venue.address_2 || '');
				activity.coords = activity.venue.lat + ',' + activity.venue.lon;
			}
			activity.description = activity.description || '';
			activity.description = activity.description.replace(/<img.*?>/g, '');
			activity.description = HTMLtoXML(activity.description);
			activity.url = activity.event_url || '';
			if( !activity.id )
				activity.id = activity.url;
		} catch(e) { 
			Framework.Utils.error('invalid activity'); 
		}
		return activity;
	},
	
	// Pad up with defaults
	get_activity_padded: function(activity) {
		activity.name = activity.name || '';
		activity.title = activity.name;
		activity.description = activity.description || '';
		activity.address = activity.address || '';
		activity.url = activity.url || '';
		return activity;
	},

	get_activity_by_id: function(id)
	{
		if( !id )
			return null;
			
		for( var i=0; i<this.cache.length; i++ )
		{
			if( this.cache[i].url == id || this.cache[i].id == id )
				return this.cache[i];
		}
	},
	
	getMeetupResults: function(obj, options)
	{
		// create query
		obj.key = "345c59636b6d3e5976513744661663a";
		Framework.Services.makeJsonpCall('http://api.meetup.com/2/open_events.json?'+Framework.Utils.get_as_url_params(obj), { callback: function(response) {
				for( var i=0; i<response.results.length; i++ )
				{
					response.results[i].source = 'Meetup.com';
					response.results[i].cost = response.results[i].cost || '';
					response.results[i].hasmsg = response.results[i].yes_rsvp_count || 0;
					response.results[i].pic  = Framework.SITE_URL + 'images/meetup_logo.gif';
					response.results[i].distance = response.results[i].distance || 0;
					response.results[i].distance = response.results[i].distance.toFixed(1);
					Framework.ActivityStore.addIfRelevant(Framework.ActivityStore.get_formatted_meetup_activity(response.results[i]), options.keywords);
				}
				Framework.ActivityStore.current = Framework.ActivityStore.sort_by_coolness(Framework.ActivityStore.current);
				if( options.callback )
				{
					options.callback();
				}
			},
			onFailure: function() {
				if( options.callback )
				{
					options.callback();
				}
			}
		});
	},
	
	isDuplicate: function(activity)
	{
		var isDuplicate = false;
		for( var k=0; k<Framework.ActivityStore.cache.length; k++)
		{
			var words = activity.name.split(' ');
			var tolerance = words.length;
			for( var iW=0; iW<words.length; iW++ )
			{
				if( Framework.ActivityStore.cache[k].name.indexOf(words[iW]) > -1 )
				{
					tolerance = tolerance - 1;
				}
			}
			if( tolerance == 0 )
			{
				isDuplicate = true;
				// special condition for replacing outside events with internal ones...
				if( Framework.ActivityStore.cache[k].source != 'From Our Users' && activity.source == 'From Our Users' )
				{
					isDuplicate = false;
					Framework.ActivityStore.cache.splice(k,1);
				}
				break;
			}
		}
		return isDuplicate;
	},
	
	addIfRelevant: function(activity, keywords)
	{
		if( Framework.ActivityStore.isDuplicate(activity) )
			return;

		var relevant = (activity.name+activity.description).match(new RegExp(keywords.join('|'),'gim'));
		if( activity.name && relevant != null )
		{
			for( var i=0; i<relevant.length; i++ )
			{
				Framework.ActivityStore.keywords[relevant[i].toLowerCase()]++;
			}
			activity.pic = activity.pic || Framework.SITE_URL + 'images/anonymous.jpg';
			Framework.ActivityStore.cache.push(activity);
			Framework.ActivityStore.current.push(activity);
		}
	},
	
	getLinkToActivity: function(id)
	{
		return Framework.SITE_URL + '#eventid='+id;
	}
};